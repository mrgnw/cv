import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { execSync } from 'child_process';
import { getAllVersions, getAllVersionMeta } from './pdf-version-reader.js';

// Configuration
const GENERATE_SANS_VERSION = false;
const MAX_CONCURRENT = 3; // Limit concurrent browser tabs
const MAX_PROJECTS_TO_REMOVE = 5;

// Cache for file modification times to enable incremental generation
const CACHE_FILE = '.pdf-generation-cache.json';

/**
 * Load cache of file modification times
 */
function loadCache() {
	if (fs.existsSync(CACHE_FILE)) {
		try {
			return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
		} catch (error) {
			console.warn('Cache file corrupted, regenerating all PDFs');
		}
	}
	return {};
}

/**
 * Save cache of file modification times
 */
function saveCache(cache) {
	fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

/**
 * Check if a version needs regeneration based on file modification times
 */
function needsRegeneration(version, cache) {
	const metadata = getAllVersionMeta().find(meta => meta.slug === version);
	if (!metadata) return true;
	
	const versionPath = metadata.path.replace(/^\/src\/lib\//, 'src/lib/');
	const pdfPath = version === 'main' ? 'static/morgan-williams.pdf' : `static/morgan-williams.${version}.pdf`;
	
	try {
		const versionStat = fs.statSync(versionPath);
		const pdfExists = fs.existsSync(pdfPath);
		
		if (!pdfExists) return true;
		
		const pdfStat = fs.statSync(pdfPath);
		const cachedMtime = cache[version];
		
		// Regenerate if source is newer than PDF or cache is invalid
		return versionStat.mtime > pdfStat.mtime || 
		       !cachedMtime || 
		       new Date(cachedMtime) < versionStat.mtime;
	} catch (error) {
		return true; // Regenerate on any error
	}
}

/**
 * Optimized page count check with caching
 */
async function getOptimalProjectCount(page, baseUrl, version) {
	// Try to load from cache first
	const cache = loadCache();
	const cachedCount = cache[`${version}_projectCount`];
	
	if (cachedCount !== undefined) {
		// Verify cached count still works
		await page.goto(`${baseUrl}&removeProjects=${cachedCount}`, { waitUntil: 'networkidle' });
		const pageCount = await checkPdfPageCount(page);
		if (pageCount === 1) {
			return cachedCount;
		}
	}
	
	// Binary search for optimal project count
	let left = 0, right = MAX_PROJECTS_TO_REMOVE;
	let bestCount = 0;
	
	while (left <= right) {
		const mid = Math.floor((left + right) / 2);
		await page.goto(`${baseUrl}&removeProjects=${mid}`, { waitUntil: 'networkidle' });
		const pageCount = await checkPdfPageCount(page);
		
		if (pageCount === 1) {
			bestCount = mid;
			right = mid - 1;
		} else {
			left = mid + 1;
		}
	}
	
	// Cache the result
	cache[`${version}_projectCount`] = bestCount;
	saveCache(cache);
	
	return bestCount;
}

/**
 * Generate PDF for a single version with optimizations
 */
async function generateVersionPDF(page, serverUrl, version, options, isSansStyle = false) {
	const stylePrefix = isSansStyle ? '/sans' : '';
	const baseUrl = `${serverUrl}${stylePrefix}/${version}?print`;
	
	const styleInfix = isSansStyle ? '-sans' : '';
	const pdfName = version === 'main' ?
		`morgan-williams${styleInfix}.pdf` :
		`morgan-williams.${version}${styleInfix}.pdf`;
	
	const outputDir = isSansStyle ? path.join('static', 'sans') : 'static';
	const pdfPath = path.join(outputDir, pdfName);
	
	// Use optimized project count detection
	const projectsToRemove = await getOptimalProjectCount(page, baseUrl, version);
	
	await page.goto(`${baseUrl}&removeProjects=${projectsToRemove}`, { waitUntil: 'networkidle' });
	await page.pdf({ path: pdfPath, ...options });
	
	console.log(`🖨️  ${pdfPath}${projectsToRemove > 0 ? ` (removed ${projectsToRemove} projects)` : ''}`);
}

/**
 * Generate PDFs in parallel batches
 */
async function generatePDFsBatch(browser, serverUrl, versions, options) {
	const batches = [];
	for (let i = 0; i < versions.length; i += MAX_CONCURRENT) {
		batches.push(versions.slice(i, i + MAX_CONCURRENT));
	}
	
	for (const batch of batches) {
		const promises = batch.map(async (version) => {
			const page = await browser.newPage();
			try {
				await generateVersionPDF(page, serverUrl, version, options, false);
				
				if (GENERATE_SANS_VERSION) {
					await generateVersionPDF(page, serverUrl, version, options, true);
				}
			} finally {
				await page.close();
			}
		});
		
		await Promise.all(promises);
	}
}

/**
 * Check page count efficiently
 */
async function checkPdfPageCount(page) {
	return await page.evaluate(() => {
		const printMediaQuery = window.matchMedia('print');
		const originalMatches = printMediaQuery.matches;
		
		// Temporarily enable print media
		Object.defineProperty(printMediaQuery, 'matches', { value: true, configurable: true });
		
		const pageCount = Math.ceil(document.body.scrollHeight / (297 * 3.78)); // A4 height in pixels
		
		// Restore original media query
		Object.defineProperty(printMediaQuery, 'matches', { value: originalMatches, configurable: true });
		
		return pageCount;
	});
}

/**
 * Wait for server with exponential backoff
 */
function waitForServer(url) {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			reject(new Error('Server start timeout'));
		}, 30000);

		let attempt = 0;
		const checkServer = () => {
			const delay = Math.min(1000, 100 * Math.pow(2, attempt));
			
			http.get(url, (res) => {
				clearTimeout(timeout);
				resolve();
			}).on('error', () => {
				attempt++;
				setTimeout(checkServer, delay);
			});
		};

		checkServer();
	});
}

// Main execution
(async () => {
	const specificVersions = process.argv.length > 2 ?
		process.argv.slice(2) :
		getAllVersions();

	const serverUrl = 'http://localhost:4173';
	
	console.log('🚀 Optimized PDF Generation Starting...');
	console.log('Waiting for the preview server to start...');
	
	try {
		await waitForServer(serverUrl);
	} catch (error) {
		console.error('❌', error.message);
		console.log('💡 Run `npm run preview` in another terminal first');
		process.exit(1);
	}

	// Filter versions that need regeneration
	const cache = loadCache();
	const allVersions = Array.isArray(specificVersions) ? specificVersions : getAllVersions();
	const versionsToGenerate = allVersions.filter(version => 
		specificVersions.includes('all') || needsRegeneration(version, cache)
	);

	if (versionsToGenerate.length === 0) {
		console.log('✅ All PDFs are up to date!');
		process.exit(0);
	}

	console.log(`📄 Generating PDFs for ${versionsToGenerate.length} versions:`, versionsToGenerate.join(', '));
	
	const browser = await chromium.launch();
	
	const pdfOptions = {
		format: 'A4',
		printBackground: false,
		margin: {
			top: '6mm',
			bottom: '6mm',
			left: '8mm',
			right: '8mm',
		},
	};

	// Ensure directories exist
	if (!fs.existsSync('static')) fs.mkdirSync('static');
	if (GENERATE_SANS_VERSION && !fs.existsSync('static/sans')) {
		fs.mkdirSync('static/sans');
	}

	const startTime = Date.now();
	
	try {
		await generatePDFsBatch(browser, serverUrl, versionsToGenerate, pdfOptions);
		
		// Update cache with current timestamps
		const newCache = loadCache();
		for (const version of versionsToGenerate) {
			newCache[version] = new Date().toISOString();
		}
		saveCache(newCache);
		
		const duration = ((Date.now() - startTime) / 1000).toFixed(1);
		console.log(`✅ Generated ${versionsToGenerate.length} PDFs in ${duration}s`);
		
	} catch (error) {
		console.error('❌ Error generating PDFs:', error);
		process.exit(1);
	} finally {
		await browser.close();
	}
})();
