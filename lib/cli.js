import fs from "fs";
import path from "path";
import {
  loadDefaults,
  loadResume,
  mergeWithDefaults,
  loadTemplate,
  loadCss,
  generateHtml,
  launchBrowser,
  closeBrowser,
  generatePdfFromHtml,
} from "./core/index.js";

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const TEMPLATE_DIR = path.join(SCRIPT_DIR, "..", "templates", "default");
const TEMPLATE_FILE = path.join(TEMPLATE_DIR, "html.hbs");
const CSS_FILE = path.join(TEMPLATE_DIR, "style.css");
const DEFAULTS_FILE = path.join(SCRIPT_DIR, "..", "defaults.json5");

/**
 * Parse CLI arguments into flags and files
 * @param {string[]} args - Process arguments
 * @returns {Object} { flags, files }
 */
export function parseCliArgs(args) {
  const flags = {};
  const files = [];

  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.substring(2).split("=");
      flags[key] = value || true;
    } else {
      files.push(arg);
    }
  }

  return { flags, files };
}

/**
 * Expand file pattern (e.g., "*.json5") into list of files
 * @param {string} pattern - File pattern
 * @returns {string[]} List of matching files
 */
export function expandFiles(pattern) {
  if (pattern.includes("*")) {
    const dir = path.dirname(pattern);
    const ext = path.extname(pattern);

    if (!fs.existsSync(dir)) {
      return [];
    }

    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(ext))
      .map((f) => path.join(dir, f));
  }

  return [pattern];
}

/**
 * Logger function that respects quiet flag
 * @param {boolean} quiet - Whether to suppress output
 * @returns {Function} Log function
 */
export function createLogger(quiet) {
  return (...args) => {
    if (!quiet) console.log(...args);
  };
}

/**
 * Process a single resume file and generate PDF
 * @param {Object} browser - Playwright browser instance
 * @param {string} resumePath - Path to resume file
 * @param {string} outputPath - Path where PDF should be saved
 * @param {Function} log - Logger function
 * @param {Function} logErr - Error logger function
 * @returns {Promise<Object>} { success, file, error? }
 */
export async function generateResumePdf(
  browser,
  resumePath,
  outputPath,
  log,
  logErr,
) {
  try {
    const resume = loadResume(resumePath);
    const defaults = loadDefaults(DEFAULTS_FILE);
    const mergedResume = mergeWithDefaults(resume, defaults);

    const templateSource = loadTemplate(TEMPLATE_FILE);
    const css = loadCss(CSS_FILE);

    const html = generateHtml(mergedResume, templateSource, css);

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const result = await generatePdfFromHtml(browser, html, outputPath);

    if (result.success) {
      log(`✅ ${path.basename(resumePath)} → ${outputPath}`);
      return { success: true, file: resumePath };
    } else {
      logErr(`✗ ${path.basename(resumePath)}: ${result.error}`);
      return { success: false, file: resumePath, error: result.error };
    }
  } catch (error) {
    logErr(`✗ ${path.basename(resumePath)}: ${error.message}`);
    return { success: false, file: resumePath, error: error.message };
  }
}

/**
 * Main CLI handler
 * @param {string[]} args - CLI arguments
 * @returns {Promise<number>} Exit code
 */
export async function runCli(args) {
  const { flags, files } = parseCliArgs(args);

  const inputPattern = files[0];
  const outputPath = files[1];
  const parallel = parseInt(flags.parallel || "2");
  const quiet = flags.quiet === true;

  const log = createLogger(quiet);
  const logErr = console.error;

  try {
    if (!inputPattern || !outputPath) {
      console.log(`Usage: node pdf.js <input> <output> [options]

Examples:
  node pdf.js resume.json5 output.pdf
  node pdf.js cvs/*.json5 output/
  node pdf.js cvs/*.json5 output/ --parallel 3 --quiet

Options:
  --parallel N      Number of PDFs to generate in parallel (default: 2)
  --quiet           Suppress logging
`);
      return 1;
    }

    const inputFiles = expandFiles(inputPattern);

    if (inputFiles.length === 0) {
      logErr(`✗ No files found matching: ${inputPattern}`);
      return 1;
    }

    log("🌐 Initializing browser...");
    const browser = await launchBrowser();

    const isDirectory = outputPath.endsWith("/") || inputFiles.length > 1;
    const outputDir = isDirectory ? outputPath : path.dirname(outputPath);
    const singleOutputName = isDirectory ? null : path.basename(outputPath);

    log(`📄 Generating ${inputFiles.length} PDF(s)...\n`);

    const results = [];

    for (let i = 0; i < inputFiles.length; i += parallel) {
      const batch = inputFiles.slice(i, i + parallel);

      const batchResults = await Promise.all(
        batch.map((inputFile) => {
          let outPath;
          if (singleOutputName && inputFiles.length === 1) {
            outPath = outputPath;
          } else {
            const baseName = path.basename(inputFile, path.extname(inputFile));
            outPath = path.join(outputDir, `${baseName}.pdf`);
          }

          return generateResumePdf(browser, inputFile, outPath, log, logErr);
        }),
      );

      results.push(...batchResults);
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    log(
      `\n✅ Complete: ${succeeded} succeeded${failed > 0 ? `, ${failed} failed` : ""}`,
    );

    await closeBrowser(browser);

    return failed > 0 ? 1 : 0;
  } catch (err) {
    logErr(`❌ Error: ${err.message}`);
    return 1;
  }
}
