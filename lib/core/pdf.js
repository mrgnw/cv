import { chromium } from "playwright";
import fs from "fs";
import path from "path";

/**
 * Generate a PDF from HTML content
 * @param {Object} browser - Playwright browser instance
 * @param {string} html - HTML content to render
 * @param {string} outputPath - Path where PDF will be saved
 * @returns {Promise<Object>} { success: boolean, message: string }
 */
export async function generatePdfFromHtml(browser, html, outputPath) {
  try {
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle",
    });

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "6mm",
        bottom: "6mm",
        left: "8mm",
        right: "8mm",
      },
      preferCSSPageSize: false,
    });

    await page.close();

    return {
      success: true,
      message: `PDF generated: ${outputPath}`,
    };
  } catch (error) {
    await page?.close().catch(() => {});
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * Launch a Chromium browser instance
 * @param {Object} options - Playwright launch options
 * @returns {Promise<Object>} Browser instance
 */
export async function launchBrowser(options = {}) {
  return await chromium.launch({
    headless: true,
    ...options,
  });
}

/**
 * Close a browser instance
 * @param {Object} browser - Browser instance
 * @returns {Promise<void>}
 */
export async function closeBrowser(browser) {
  if (browser) {
    await browser.close();
  }
}
