#!/usr/bin/env node
/**
 * Direct CLI to generate PDFs from JSON/JSON5 resume files
 * No server required - generates HTML and renders to PDF directly
 *
 * Usage:
 *   node cv-to-pdf-direct.js <resume.json5> <output.pdf>
 *   node cv-to-pdf-direct.js cvs/schneider-electric.json5 output/schneider.pdf
 *   node cv-to-pdf-direct.js cvs/*.json5 output/ --parallel 3
 */

import fs from "fs";
import path from "path";
import { format } from "date-fns";
import JSON5 from "json5";
import { chromium } from "playwright";

// ============================================================================
// Configuration
// ============================================================================

const SERIF_FONTS = `"Bitstream Charter", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif`;

// ============================================================================
// CLI Arguments
// ============================================================================

const args = process.argv.slice(2);
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

const inputPattern = files[0];
const outputPath = files[1];
const parallel = parseInt(flags.parallel || "2");
const quiet = flags.quiet === true;

function log(...args) {
  if (!quiet) console.log(...args);
}

function logErr(...args) {
  console.error(...args);
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Load and parse a resume file
 */
/**
 * Load defaults from defaults.json5
 * Only loads: name, email, github, linkedin, education, projects, lang
 */
function loadDefaults() {
  const defaultsPath = path.join(
    path.dirname(import.meta.url).slice(7),
    "defaults.json5",
  );
  if (!fs.existsSync(defaultsPath)) {
    // Return empty defaults if file doesn't exist
    return {
      name: "Your Name",
      email: "email@example.com",
      github: "https://github.com",
      linkedin: "https://linkedin.com",
      education: [],
      projects: [],
      lang: "en",
    };
  }

  const content = fs.readFileSync(defaultsPath, "utf-8");
  try {
    const parsed = JSON5.parse(content);
    // Only extract the fields we want to merge
    return {
      name: parsed.name || "Your Name",
      email: parsed.email || "email@example.com",
      github: parsed.github || "https://github.com",
      linkedin: parsed.linkedin || "https://linkedin.com",
      education: parsed.education || [],
      projects: parsed.projects || [],
      lang: parsed.lang || "en",
    };
  } catch (err) {
    console.warn(`Warning: Failed to parse defaults.json5: ${err.message}`);
    return {
      name: "Your Name",
      email: "email@example.com",
      github: "https://github.com",
      linkedin: "https://linkedin.com",
      education: [],
      projects: [],
      lang: "en",
    };
  }
}

/**
 * Load and parse a resume file
 */
function loadResume(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  try {
    return JSON5.parse(content);
  } catch (err) {
    throw new Error(`Failed to parse ${filePath}: ${err.message}`);
  }
}

/**
 * Merge resume with defaults
 * Only merges: name, email, github, linkedin, education, projects
 * Everything else (skills, experience, summary, lang) comes from resume only
 */
function mergeWithDefaults(resume, defaults) {
  return {
    // Contact info - use resume value if present, otherwise defaults
    name: resume.name ?? defaults.name,
    email: resume.email ?? defaults.email,
    github: resume.github ?? defaults.github,
    linkedin: resume.linkedin ?? defaults.linkedin,

    // Education - use resume if explicitly set, otherwise defaults
    education:
      resume.education !== undefined ? resume.education : defaults.education,

    // Projects - use resume if explicitly set, otherwise defaults
    projects:
      resume.projects !== undefined ? resume.projects : defaults.projects,

    // Everything else comes from resume only (no defaults)
    summary: resume.summary || "",
    skills: resume.skills || [],
    experience: resume.experience || [],
    lang: resume.lang || "en",
  };
}

/**
 * Expand glob patterns to actual files
 */
function expandFiles(pattern) {
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
 * Format a date string to "MMM yyyy" format
 */
function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return format(date, "MMM yyyy");
  } catch {
    return "";
  }
}

/**
 * Format URL by removing protocol and www
 */
function formatUrl(url) {
  try {
    return url.replace(/^https?:\/\/(www\.)?/, "");
  } catch {
    return url;
  }
}

/**
 * Generate HTML from resume data
 * Matches the styling from CV.svelte exactly
 */
function generateHtml(rawResume) {
  // Load defaults and merge with resume
  const defaults = loadDefaults();
  const resume = mergeWithDefaults(rawResume, defaults);

  const {
    name,
    email,
    github,
    linkedin,
    summary,
    skills,
    experience,
    projects,
    education,
    lang,
  } = resume;

  const labels =
    lang === "es"
      ? {
          skills: "Habilidades",
          experience: "Experiencia",
          projects: "Proyectos",
          education: "Educación",
          present: "Presente",
        }
      : {
          skills: "Skills",
          experience: "Experience",
          projects: "Projects",
          education: "Education",
          present: "Present",
        };

  // Filter and optimize experience
  const optimizedExperience = Array.isArray(experience)
    ? experience
        .filter((exp) => exp !== null && exp !== undefined)
        .map((exp) => ({
          ...exp,
          achievements: exp.achievements || [],
        }))
    : [];

  // Build skills HTML
  const skillsHtml = skills.length
    ? `
    <section class="skills-section">
      <h2 class="section-header">${labels.skills}</h2>
      <div class="skills-list">
        <div class="skills-primary">
          ${skills.slice(0, 2).join(", ")}
        </div>
        ${
          skills.length > 2
            ? `<div class="skills-secondary">${skills.slice(2).join(", ")}</div>`
            : ""
        }
      </div>
    </section>
  `
    : "";

  // Build experience HTML
  const experienceHtml =
    optimizedExperience.length > 0
      ? `
    <section class="experience-section">
      <h2 class="section-header">${labels.experience}</h2>
      ${optimizedExperience
        .map(
          (job) => `
        <div class="job-item">
          <div class="job-header">
            <div>
              <span class="job-title">${job.title}</span>
              <span>at ${job.company}</span>
            </div>
            <span class="job-dates">
              ${
                job.start
                  ? `${formatDate(job.start)}${job.end ? ` - ${formatDate(job.end)}` : ` - ${labels.present}`}`
                  : job.timeframe || ""
              }
            </span>
          </div>
          <ul class="achievements-list">
            ${job.achievements.map((bullet) => `<li>${bullet}</li>`).join("")}
          </ul>
        </div>
      `,
        )
        .join("")}
    </section>
  `
      : "";

  // Build projects HTML
  // Build projects section
  const validProjects = projects
    .filter((p) => p !== null && p !== undefined)
    .filter((p) => {
      // Skip if it's just a string (not a proper project object)
      if (typeof p === "string") return false;
      // Skip if it doesn't have required fields
      return p.name || p.url || p.description;
    });

  const projectsHtml =
    validProjects && validProjects.length > 0
      ? `
    <section class="projects-section">
      <h2 class="section-header">${labels.projects}</h2>
      ${validProjects
        .map((project) => {
          const name = project.name || "Untitled";
          const url = project.url || "#";
          const description = project.description || "";
          return `
        <div class="project-item">
          <div class="project-header">
            <a href="${url}" target="_blank" rel="noopener noreferrer" class="project-name">
              ${name}
            </a>
            ${url !== "#" ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="project-url">${formatUrl(url)}</a>` : ""}
          </div>
          ${description ? `<p class="project-description">${description}</p>` : ""}
        </div>
      `;
        })
        .join("")}
    </section>
  `
      : "";

  // Build education HTML
  const educationHtml =
    education && education.length > 0
      ? `
    <section class="education-section">
      <h2 class="section-header">${labels.education}</h2>
      ${education
        .map(
          (edu) => `
        <div class="education-item">
          <div>
            <span class="degree">${edu.degree}</span>
            <span>from ${edu.provider}</span>
          </div>
          <span class="year">${edu.year}</span>
        </div>
      `,
        )
        .join("")}
    </section>
  `
      : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - CV</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: ${SERIF_FONTS};
      background-color: #ffffff;
      color: #000000;
      font-size: 11pt;
      line-height: 1.5;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 32px 32px;
      background-color: white;
      color: black;
    }

    /* Header */
    header {
      text-align: center;
      margin-bottom: 16px;
    }

    h1 {
      font-size: 28pt;
      font-weight: bold;
      margin-bottom: 8px;
    }

    .contact-info {
      margin-top: 8px;
      font-size: 10pt;
      display: flex;
      justify-content: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .contact-info a {
      color: #000000;
      text-decoration: none;
    }

    .contact-info a:hover {
      text-decoration: underline;
    }

    .contact-info span {
      color: #000000;
    }

    /* Summary */
    .summary-section {
      margin-bottom: 16px;
    }

    .summary-section p {
      font-size: 10pt;
      line-height: 1.4;
    }

    /* Section Headers */
    .section-header {
      font-size: 11pt;
      font-weight: bold;
      border-bottom: 1px solid #000000;
      padding-bottom: 2px;
      margin-bottom: 8px;
      margin-top: 12px;
    }

    /* Skills */
    .skills-section {
      margin-bottom: 24px;
    }

    .skills-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .skills-primary {
      font-size: 11pt;
    }

    .skills-secondary {
      font-size: 10pt;
      color: #666666;
    }

    /* Experience */
    .experience-section {
      margin-bottom: 24px;
    }

    .job-item {
      margin-bottom: 16px;
    }

    .job-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;
    }

    .job-title {
      font-weight: bold;
    }

    .job-dates {
      font-size: 10pt;
    }

    .achievements-list {
      list-style-type: disc;
      margin-left: 16px;
      margin-top: 4px;
    }

    .achievements-list li {
      font-size: 10pt;
      line-height: 1.3;
      margin-bottom: 4px;
    }

    /* Projects */
    .projects-section {
      margin-bottom: 24px;
    }

    .project-item {
      margin-bottom: 12px;
    }

    .project-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;
    }

    .project-name {
      font-weight: bold;
      color: #000000;
      text-decoration: none;
    }

    .project-name:hover {
      text-decoration: underline;
    }

    .project-url {
      font-size: 10pt;
      color: #000000;
      text-decoration: none;
    }

    .project-url:hover {
      text-decoration: underline;
    }

    .project-description {
      font-size: 10pt;
      margin-top: 2px;
    }

    /* Education */
    .education-section {
      margin-bottom: 0;
    }

    .education-item {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;
      font-size: 10pt;
    }

    .degree {
      font-weight: bold;
    }

    .year {
      font-size: 10pt;
    }

    /* Print styles */
    @media print {
      body {
        background-color: white;
        font-size: 11pt;
        line-height: 1.3;
      }

      .container {
        max-width: 100%;
        padding: 12mm 8mm;
        margin: 0;
      }

      header {
        margin-bottom: 8px;
      }

      h1 {
        font-size: 26pt;
        margin-bottom: 4px;
      }

      .contact-info {
        margin-top: 4px;
        font-size: 10pt;
      }

      .summary-section {
        margin-bottom: 8px;
      }

      .summary-section p {
        font-size: 10pt;
      }

      .section-header {
        font-size: 11pt;
        margin-top: 6px;
        margin-bottom: 4px;
      }

      .skills-section {
        margin-bottom: 12px;
      }

      .experience-section {
        margin-bottom: 12px;
      }

      .job-item {
        margin-bottom: 12px;
      }

      .achievements-list li {
        font-size: 10pt;
        line-height: 1.2;
        margin-bottom: 2px;
      }

      .projects-section {
        margin-bottom: 12px;
      }

      .project-item {
        margin-bottom: 8px;
      }

      .education-section {
        margin-bottom: 0;
      }

      .education-item {
        margin-bottom: 2px;
        font-size: 10pt;
      }

      a {
        color: black;
        text-decoration: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header>
      <h1>${name}</h1>
      <div class="contact-info">
        <a href="mailto:${email}">${email}</a>
        <span>|</span>
        <a href="${github}">github.com/mrgnw</a>
        <span>|</span>
        <a href="${linkedin}">linkedin.com/in/mrgnw</a>
      </div>
    </header>

    <!-- Summary -->
    ${
      summary
        ? `
      <section class="summary-section">
        <p>${summary}</p>
      </section>
    `
        : ""
    }

    <!-- Skills -->
    ${skillsHtml}

    <!-- Experience -->
    ${experienceHtml}

    <!-- Projects -->
    ${projectsHtml}

    <!-- Education -->
    ${educationHtml}
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// PDF Generation
// ============================================================================

/**
 * Generate PDF from resume data
 */
async function generatePdf(browser, resumePath, outputPath) {
  const resume = loadResume(resumePath);
  const html = generateHtml(resume);

  log(`  Processing: ${resumePath}`);

  const page = await browser.newPage();

  try {
    // Set content
    await page.setContent(html, { waitUntil: "networkidle" });

    // Ensure output directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Generate PDF
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

    log(`  ✓ Generated: ${outputPath}`);
    return { success: true, resumePath, outputPath };
  } catch (err) {
    logErr(`  ✗ Failed: ${err.message}`);
    return { success: false, resumePath, error: err.message };
  } finally {
    await page.close();
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  try {
    // Validate arguments
    if (!inputPattern || !outputPath) {
      console.log(`Usage: node cv-to-pdf-direct.js <input> <output> [options]

Examples:
  node cv-to-pdf-direct.js resume.json5 output.pdf
  node cv-to-pdf-direct.js cvs/*.json5 output/
  node cv-to-pdf-direct.js cvs/*.json5 output/ --parallel 3 --quiet

Options:
  --parallel N      Number of PDFs to generate in parallel (default: 2)
  --quiet           Suppress logging
`);
      process.exit(1);
    }

    // Expand input files
    const inputFiles = expandFiles(inputPattern);

    if (inputFiles.length === 0) {
      logErr(`✗ No files found matching: ${inputPattern}`);
      process.exit(1);
    }

    // Initialize browser
    log("🌐 Initializing browser...");
    const browser = await chromium.launch({ headless: true });

    // Generate output paths
    const isDirectory = outputPath.endsWith("/") || inputFiles.length > 1;
    const outputDir = isDirectory ? outputPath : path.dirname(outputPath);
    const singleOutputName = isDirectory ? null : path.basename(outputPath);

    // Generate PDFs
    log(`📄 Generating ${inputFiles.length} PDF(s)...\n`);

    const results = [];

    // Process in parallel batches
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

          return generatePdf(browser, inputFile, outPath);
        }),
      );

      results.push(...batchResults);
    }

    // Summary
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    log(
      `\n✅ Complete: ${succeeded} succeeded${failed > 0 ? `, ${failed} failed` : ""}`,
    );

    // Cleanup
    await browser.close();

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    logErr(`❌ Error: ${err.message}`);
    process.exit(1);
  }
}

main();
