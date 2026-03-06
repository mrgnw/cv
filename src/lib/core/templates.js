import Handlebars from "handlebars";
import fs from "fs";

/**
 * Load template file content (Node.js only)
 * @param {string} templatePath - Path to .hbs template file
 * @returns {string} Template source code
 */
export function loadTemplate(templatePath) {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`);
  }

  return fs.readFileSync(templatePath, "utf-8");
}

/**
 * Load CSS file content (Node.js only)
 * @param {string} cssPath - Path to .css file
 * @returns {string} CSS content
 */
export function loadCss(cssPath) {
  if (!cssPath || !fs.existsSync(cssPath)) {
    console.warn(`Warning: CSS file not found at ${cssPath}`);
    return "";
  }

  return fs.readFileSync(cssPath, "utf-8");
}

/**
 * Compile a Handlebars template
 * @param {string} templateSource - Template source code
 * @returns {Function} Compiled template function
 */
export function compileTemplate(templateSource) {
  return Handlebars.compile(templateSource);
}

/**
 * Render a template with data
 * @param {string} templateSource - Template source code
 * @param {Object} data - Data to render
 * @returns {string} Rendered HTML
 */
export function renderTemplate(templateSource, data) {
  const template = compileTemplate(templateSource);
  return template(data);
}

/**
 * Register a Handlebars helper
 * @param {string} name - Helper name
 * @param {Function} helper - Helper function
 */
export function registerHelper(name, helper) {
  Handlebars.registerHelper(name, helper);
}
