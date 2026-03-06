// Resume utilities
export {
	loadDefaults,
	loadResume,
	loadResumeFromString,
	mergeWithDefaults,
	getDefaultDefaults,
} from "./resume.js";

// Template utilities
export {
	loadTemplate,
	loadCss,
	compileTemplate,
	renderTemplate,
	registerHelper,
} from "./templates.js";

// HTML generation
export { generateHtml, generateTemplateData } from "./html.js";

// PDF generation - CLI/Local (Playwright)
export { generatePdfFromHtml, launchBrowser, closeBrowser } from "./pdf.js";

// PDF generation - Cloudflare Workers (Browser Rendering API)
export {
	generatePdfFromHtml as generatePdfFromHtmlCloudflare,
	generatePdfResponse,
	generatePdfToR2,
	generatePdfBase64,
} from "./pdf-cloudflare.js";

// Utilities
export { formatDate, formatUrl, formatExperience } from "./utils.js";
