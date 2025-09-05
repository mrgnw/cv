#!/usr/bin/env node
/*
 * Unified PDF Generation & Watch CLI
 * Commands:
 *   node pdf-cli.js                # Generate all PDFs (incremental)
 *   node pdf-cli.js main foo       # Generate specific versions
 *   node pdf-cli.js --force        # Force regenerate (ignore cache)
 *   node pdf-cli.js --watch        # Watch mode (incremental)
 *   node pdf-cli.js --list         # List versions & status
 * Flags:
 *   --quiet  Reduce logging
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import { spawn } from 'child_process';
// Lazy load playwright only when generating PDFs to allow fast --list
let chromium = null;
let chokidarWatch = null; // lazy load for watch mode
import { getAllVersions, getAllVersionMeta, getVersionFileMap } from './pdf-version-reader.js';

// ---------------- Configuration ----------------
const PORTS = [4173, 4174, 4175, 4176, 4177];
const CACHE_FILE = '.pdf-cache.json';
const MAX_REMOVE_PROJECTS = 5;
const GLOBAL_FILES = [
  'src/lib/CVSans.svelte',
  'src/lib/EngCV.svelte',
  'src/lib/projects.jsonc',
  'src/lib/projects-es.jsonc'
];

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const requestedVersions = args.filter(a => !a.startsWith('--'));
const FORCE = flags.has('--force');
const WATCH = flags.has('--watch');
const LIST = flags.has('--list');
const QUIET = flags.has('--quiet');

// concurrency: unlimited by default (small version set). Could cap by CPU if needed.
const ENV_CONCURRENCY = parseInt(process.env.PDF_CONCURRENCY || '', 10);
const CONCURRENCY = Number.isFinite(ENV_CONCURRENCY) && ENV_CONCURRENCY > 0 ? ENV_CONCURRENCY : Infinity;

// ---------------- Cache Handling ----------------
function loadCache() {
  if (!fs.existsSync(CACHE_FILE)) return { versions: {} };
  try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')); } catch { return { versions: {} }; }
}
function saveCache(cache) { fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2)); }

// ---------------- Utility Logging ----------------
function log(...m) { if (!QUIET) console.log(...m); }
function logErr(...m) { console.error(...m); }

// ---------------- Server Detection ----------------
async function detectServer() {
  for (const port of PORTS) {
    const url = `http://localhost:${port}`;
    const ok = await new Promise(resolve => {
      const req = http.get(url, res => { res.destroy(); resolve(res.statusCode === 200); });
      req.on('error', () => resolve(false));
      req.setTimeout(800, () => { req.destroy(); resolve(false); });
    });
    if (ok) return { url, port };
  }
  return null;
}

async function ensureServer() {
  const found = await detectServer();
  if (found) { log(`✅ Preview server detected on port ${found.port}`); return found.url; }
  // Ensure build exists (vite preview needs dist output)
  const distIndex = path.join('dist','index.html');
  if (!process.env.PDF_SKIP_BUILD) {
    const needBuild = !fs.existsSync(distIndex) || process.env.PDF_FORCE_REBUILD === '1';
    if (needBuild) {
      log(`🏗️  ${fs.existsSync(distIndex) ? 'Rebuilding site (PDF_FORCE_REBUILD=1)...' : 'Building site (missing dist)...'}`);
      const buildStart = Date.now();
      await new Promise((resolve, reject) => {
        const b = spawn('npm', ['run', 'build'], { stdio: QUIET ? 'ignore' : 'inherit' });
        b.on('close', code => code === 0 ? resolve() : reject(new Error('Build failed')));
      });
      log(`🏗️  Build finished in ${((Date.now()-buildStart)/1000).toFixed(1)}s`);
    } else {
      log('🔁 Reusing existing dist (set PDF_FORCE_REBUILD=1 to force rebuild)');
    }
  } else {
    log('⚠️  Skipping build because PDF_SKIP_BUILD is set');
  }
  log('🚀 Starting preview server...');
  // detached so it keeps running
  const child = spawn('npm', ['run', 'preview'], { stdio: QUIET ? 'ignore' : 'inherit', detached: true });
  child.unref();
  const start = Date.now();
  while (Date.now() - start < 30000) {
    const again = await detectServer();
    if (again) { log(`✅ Preview server started on port ${again.port}`); return again.url; }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Preview server not reachable after 30s');
}

// ---------------- Version & Dependency Graph ----------------
function getTargetVersions() {
  const all = getAllVersions();
  if (requestedVersions.length === 0) return all;
  const unknown = requestedVersions.filter(v => v !== 'all' && !all.includes(v));
  if (unknown.length) log(`⚠️ Unknown versions ignored: ${unknown.join(', ')}`);
  if (requestedVersions.includes('all')) return all;
  return all.filter(v => requestedVersions.includes(v));
}

function pdfPathFor(slug) {
  return slug === 'main' ? 'static/morgan-williams.pdf' : `static/morgan-williams.${slug}.pdf`;
}

function gatherInputs(slug, versionFileMap) {
  const inputs = [];
  const vf = versionFileMap[slug];
  if (vf && fs.existsSync(vf)) inputs.push(vf);
  for (const gf of GLOBAL_FILES) if (fs.existsSync(gf)) inputs.push(gf);
  return inputs;
}

function needsRegeneration(slug, cache, force, versionFileMap) {
  if (force) return true;
  const p = pdfPathFor(slug);
  if (!fs.existsSync(p)) return true;
  const pdfTime = fs.statSync(p).mtimeMs;
  const inputs = gatherInputs(slug, versionFileMap);
  for (const f of inputs) {
    try { if (fs.statSync(f).mtimeMs > pdfTime) return true; } catch { return true; }
  }
  return false;
}

// ---------------- PDF Generation ----------------
async function checkPdfPageCount(page) {
  return await page.evaluate(() => {
    const pageHeightPx = 297 * 3.78; // A4 mm -> px approx at 96dpi
    return Math.ceil(document.body.scrollHeight / pageHeightPx) || 1;
  });
}

async function determineProjectsTrim(page, baseUrl, prevTrim) {
  // Quick check with previous value
  if (Number.isFinite(prevTrim)) {
    await page.goto(`${baseUrl}&removeProjects=${prevTrim}`, { waitUntil: 'networkidle' });
    const pc = await checkPdfPageCount(page);
    if (pc === 1) return prevTrim;
  }
  // Binary search 0..MAX_REMOVE_PROJECTS
  let left = 0, right = MAX_REMOVE_PROJECTS, best = 0;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    await page.goto(`${baseUrl}&removeProjects=${mid}`, { waitUntil: 'networkidle' });
    const pc = await checkPdfPageCount(page);
    if (pc === 1) { best = mid; right = mid - 1; } else { left = mid + 1; }
  }
  return best;
}

async function generateVersion(browser, serverUrl, slug, cache) {
  const url = `${serverUrl}/${slug}?print`;
  const pdfPath = pdfPathFor(slug);
  if (!fs.existsSync('static')) fs.mkdirSync('static');
  const page = await browser.newPage();
  const prevTrim = cache.versions?.[slug]?.lastProjectsTrim;
  try {
    const trim = await determineProjectsTrim(page, url, prevTrim);
    await page.goto(`${url}&removeProjects=${trim}`, { waitUntil: 'networkidle' });
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: false,
      margin: { top: '6mm', bottom: '6mm', left: '8mm', right: '8mm' }
    });
    const rel = pdfPath;
    log(`🖨️  ${rel}${trim ? ` (removed ${trim} projects)` : ''}`);
    return { ok: true, trim };
  } catch (e) {
    logErr(`❌ Failed ${slug}:`, e.message);
    return { ok: false };
  } finally {
    await page.close();
  }
}

async function generateAll(targets, force = false) {
  const versionFileMap = getVersionFileMap();
  const cache = loadCache();
  const toRun = targets.filter(slug => needsRegeneration(slug, cache, force, versionFileMap));
  if (toRun.length === 0) { log('✅ All PDFs up to date'); return; }
  log(`📄 Generating ${toRun.length} PDF(s): ${toRun.join(', ')}`);
  const serverUrl = await ensureServer();
  if (!chromium) {
    ({ chromium } = await import('playwright'));
  }
  let browser;
  try {
    browser = await chromium.launch();
  } catch (e) {
    if (/playwright install/i.test(e.message) || /Executable doesn't exist/.test(e.message)) {
      log('⬇️  Installing Playwright browsers (first run)...');
      // Attempt silent install
      try {
        await new Promise((resolve, reject) => {
          const c = spawn('npx', ['playwright', 'install', 'chromium'], { stdio: QUIET ? 'ignore' : 'inherit' });
          c.on('close', code => code === 0 ? resolve() : reject(new Error('playwright install failed')));
        });
        browser = await chromium.launch();
      } catch (err) {
        throw new Error('Failed to install Playwright browsers automatically. Run: npx playwright install');
      }
    } else {
      throw e;
    }
  }
  const start = Date.now();
  const queue = [...toRun];
  const running = new Set();
  const results = [];

  async function next() {
    if (queue.length === 0) return;
    if (running.size >= CONCURRENCY) return;
    const slug = queue.shift();
    const p = generateVersion(browser, serverUrl, slug, cache).then(r => { running.delete(p); results.push({ slug, ...r }); });
    running.add(p);
    p.then(() => next());
    if (running.size < CONCURRENCY) next();
  }
  await next();
  await Promise.all([...running]);
  await browser.close();

  // Update cache
  const versionFileMap2 = getVersionFileMap();
  for (const r of results) {
    if (!r.ok) continue;
    const inputs = gatherInputs(r.slug, versionFileMap2);
    const inputsM = {};
    for (const f of inputs) inputsM[f] = fs.statSync(f).mtime.toISOString();
    cache.versions[r.slug] = {
      pdfMTime: new Date().toISOString(),
      inputs: inputsM,
      lastProjectsTrim: r.trim || 0
    };
  }
  saveCache(cache);
  const dur = ((Date.now() - start) / 1000).toFixed(1);
  log(`✅ Done in ${dur}s`);
}

// ---------------- List Mode ----------------
function listVersions() {
  const versionFileMap = getVersionFileMap();
  const cache = loadCache();
  const versions = getAllVersions();
  for (const v of versions) {
    const stale = needsRegeneration(v, cache, false, versionFileMap) ? 'stale' : 'ok';
    const line = `${v.padEnd(18,'.')} ${stale}`;
    console.log(line);
  }
}

// ---------------- Watch Mode ----------------
async function startWatch(initialTargets) {
  if (!chokidarWatch) {
    const mod = await import('chokidar');
    chokidarWatch = mod.watch;
  }
  log('👀 Watch mode started');
  log('   Version files: src/lib/versions/**/*.{json,json5,jsonc}');
  log('   Global files:  ' + GLOBAL_FILES.join(', '));
  const versionGlob = 'src/lib/versions/**/*.{json,json5,jsonc}';
  const versionWatcher = chokidarWatch(versionGlob, { ignoreInitial: true });
  const globalWatcher = chokidarWatch(GLOBAL_FILES, { ignoreInitial: true });
  let pendingVersions = new Set();
  let globalChange = false;
  let timer = null;

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const allVers = getAllVersions();
      const toGenerate = globalChange ? allVers : [...pendingVersions];
      pendingVersions.clear();
      globalChange = false;
      if (toGenerate.length === 0) return;
      try { await generateAll(toGenerate, false); } catch (e) { logErr('Generation failed:', e.message); }
    }, 400);
  }

  versionWatcher.on('add', p => { log(`➕ ${p}`); refreshAndQueue(p); })
    .on('change', p => { log(`✏️  ${p}`); refreshAndQueue(p); })
    .on('unlink', p => { log(`🗑️  ${p}`); handleDeletion(p); });

  globalWatcher.on('add', p => { log(`➕ global ${p}`); globalChange = true; schedule(); })
    .on('change', p => { log(`🔄 global ${p}`); globalChange = true; schedule(); })
    .on('unlink', p => { log(`🗑️  global ${p}`); globalChange = true; schedule(); });

  function refreshAndQueue(filePath) {
    // Rebuild mapping implicitly by calling getAllVersions()
    const map = getVersionFileMap();
    const slug = Object.entries(map).find(([s, f]) => f === filePath)?.[0];
    if (slug) { pendingVersions.add(slug); schedule(); }
  }

  function handleDeletion(filePath) {
    const map = getVersionFileMap(); // after deletion map no longer contains slug
    // If deletion impacts a prior slug we can't easily map now; just regenerate all.
    globalChange = true;
    schedule();
    // Attempt to remove stray PDF names heuristically: derive slug from filename
    const base = path.basename(filePath).replace(/\.(jsonc|json5|json)$/,'');
    const pdfCandidates = [pdfPathFor(base)];
    for (const c of pdfCandidates) if (fs.existsSync(c)) { fs.unlinkSync(c); log(`🧹 Removed ${c}`); }
  }

  process.on('SIGINT', () => { log('\n👋 Exiting watch'); versionWatcher.close(); globalWatcher.close(); process.exit(0); });
}

// ---------------- Main ----------------
(async () => {
  try {
    if (LIST) { listVersions(); return; }
    const targets = getTargetVersions();
    if (!targets.length) { console.log('No versions found'); return; }
    if (!WATCH) {
      await generateAll(targets, FORCE);
    } else {
      await generateAll(targets, FORCE); // initial
      startWatch(targets);
    }
  } catch (e) {
    logErr('❌', e.message);
    process.exit(1);
  }
})();
