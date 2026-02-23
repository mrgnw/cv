import {
  loadResumeFromString,
  mergeWithDefaults,
  getDefaultDefaults,
  renderTemplate,
  generatePdfFromHtml,
  launchBrowser,
  closeBrowser,
} from "./core/index.js";
import { generateTemplateData } from "./core/html.js";

/**
 * Generate HTML preview from resume JSON string
 * Works in both Node.js and browser environments
 * @param {string} resumeJson - JSON5 resume data as string
 * @param {string} templateSource - Handlebars template source
 * @param {string} css - CSS content to embed
 * @param {Object} defaults - Default values (optional, uses built-in defaults if not provided)
 * @returns {Object} { html: string, error?: string }
 */
export function generatePreview(
  resumeJson,
  templateSource,
  css = "",
  defaults = null,
) {
  try {
    const resume = loadResumeFromString(resumeJson);
    const mergedDefaults = defaults || getDefaultDefaults();
    const mergedResume = mergeWithDefaults(resume, mergedDefaults);
    const templateData = generateTemplateData(mergedResume, css);
    const html = renderTemplate(templateSource, templateData);

    return { html };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Generate PDF from HTML content (Node.js only)
 * @param {string} html - HTML content
 * @param {string} outputPath - Path where PDF should be saved
 * @param {Object} browser - Playwright browser instance (optional, will be created if not provided)
 * @returns {Promise<Object>} { success: boolean, message?: string, error?: string }
 */
export async function generatePdfFile(html, outputPath, browser = null) {
  let shouldCloseBrowser = false;

  try {
    let browserInstance = browser;

    if (!browserInstance) {
      browserInstance = await launchBrowser();
      shouldCloseBrowser = true;
    }

    const result = await generatePdfFromHtml(browserInstance, html, outputPath);

    if (shouldCloseBrowser) {
      await closeBrowser(browserInstance);
    }

    if (result.success) {
      return { success: true, message: `PDF generated: ${outputPath}` };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    if (shouldCloseBrowser && browser === null) {
      await closeBrowser(browser).catch(() => {});
    }
    return { success: false, error: error.message };
  }
}

/**
 * Complete workflow: generate preview and optionally save PDF
 * @param {Object} options - Configuration object
 * @param {string} options.resumeJson - JSON5 resume as string
 * @param {string} options.templateSource - Handlebars template
 * @param {string} options.css - CSS content
 * @param {string} options.outputPath - Path to save PDF (optional)
 * @param {Object} options.defaults - Default values (optional)
 * @param {Object} options.browser - Browser instance (optional, for Node.js PDF generation)
 * @returns {Promise<Object>} { preview: string, pdf?: boolean, error?: string }
 */
export async function generateCv(options) {
  const {
    resumeJson,
    templateSource,
    css = "",
    outputPath = null,
    defaults = null,
    browser = null,
  } = options;

  try {
    // Generate preview
    const previewResult = generatePreview(
      resumeJson,
      templateSource,
      css,
      defaults,
    );

    if (previewResult.error) {
      return { error: previewResult.error };
    }

    const result = { preview: previewResult.html };

    // Generate PDF if output path is provided (Node.js only)
    if (outputPath) {
      const pdfResult = await generatePdfFile(
        previewResult.html,
        outputPath,
        browser,
      );

      if (pdfResult.success) {
        result.pdf = true;
      } else {
        result.pdfError = pdfResult.error;
      }
    }

    return result;
  } catch (error) {
    return { error: error.message };
  }
}
