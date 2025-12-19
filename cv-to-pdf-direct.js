#!/usr/bin/env node
/**
 * Direct CLI to generate PDFs from JSON/JSON5 resume files
 * Usage:
 *   node cv-to-pdf-direct.js <resume.json5> <output.pdf>
 *   node cv-to-pdf-direct.js cvs/*.json5 output/ --parallel 3
 */

import fs from "fs";
import path from "path";
import { format } from "date-fns";
import JSON5 from "json5";
import { chromium } from "playwright";

const SERIF_FONTS = `"Bitstream Charter", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif`;

// Parse CLI arguments
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

function loadDefaults() {
  const defaultsPath = path.join(
    path.dirname(import.meta.url).slice(7),
    "defaults.json5",
  );

  if (!fs.existsSync(defaultsPath)) {
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

function mergeWithDefaults(resume, defaults) {
  return {
    name: resume.name ?? defaults.name,
    email: resume.email ?? defaults.email,
    github: resume.github ?? defaults.github,
    linkedin: resume.linkedin ?? defaults.linkedin,
    education:
      resume.education !== undefined ? resume.education : defaults.education,
    projects:
      resume.projects !== undefined ? resume.projects : defaults.projects,
    summary: resume.summary || "",
    skills: resume.skills || [],
    experience: resume.experience || [],
    lang: resume.lang || "en",
  };
}

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

function formatUrl(url) {
  try {
    return url.replace(/^https?:\/\/(www\.)?/, "");
  } catch {
    return url;
  }
}

function loadCss() {
  const cssPath = path.join(
    path.dirname(import.meta.url).slice(7),
    "styles",
    "cv.css",
  );

  if (!fs.existsSync(cssPath)) {
    logErr(`Warning: CSS file not found at ${cssPath}`);
    return "";
  }

  return fs.readFileSync(cssPath, "utf-8");
}

function generateHtml(rawResume) {
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

  const optimizedExperience = Array.isArray(experience)
    ? experience
        .filter((exp) => exp !== null && exp !== undefined)
        .map((exp) => ({
          ...exp,
          achievements: exp.achievements || [],
        }))
    : [];

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

  const validProjects = projects
    .filter((p) => p !== null && p !== undefined)
    .filter((p) => {
      if (typeof p === "string") return false;
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
            <span class="degree">${edu.degree || "Degree"}</span>
            <span>from ${edu.school || "School"}</span>
          </div>
          <span class="year">${edu.year || ""}</span>
        </div>
      `,
        )
        .join("")}
    </section>
  `
      : "";

  const css = loadCss();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - CV</title>
  <style>
${css}
  </style>
</head>
<body>
  <div class="container">
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

    ${
      summary
        ? `
      <section class="summary-section">
        <p>${summary}</p>
      </section>
    `
        : ""
    }

    ${skillsHtml}
    ${experienceHtml}
    ${projectsHtml}
    ${educationHtml}
  </div>
</body>
</html>
  `.trim();
}

async function generatePdf(browser, resumePath, outputPath) {
  const resume = loadResume(resumePath);

  try {
    const html = generateHtml(resume);
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

    log(`✅ ${path.basename(resumePath)} → ${outputPath}`);
    return { success: true, file: resumePath };
  } catch (error) {
    logErr(`✗ ${path.basename(resumePath)}: ${error.message}`);
    return { success: false, file: resumePath, error: error.message };
  }
}

async function main() {
  try {
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

    const inputFiles = expandFiles(inputPattern);

    if (inputFiles.length === 0) {
      logErr(`✗ No files found matching: ${inputPattern}`);
      process.exit(1);
    }

    log("🌐 Initializing browser...");
    const browser = await chromium.launch({ headless: true });

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

          return generatePdf(browser, inputFile, outPath);
        }),
      );

      results.push(...batchResults);
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    log(
      `\n✅ Complete: ${succeeded} succeeded${failed > 0 ? `, ${failed} failed` : ""}`,
    );

    await browser.close();

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    logErr(`❌ Error: ${err.message}`);
    process.exit(1);
  }
}

main();
