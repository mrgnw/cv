#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { format } from "date-fns";
import JSON5 from "json5";
import { chromium } from "playwright";
import Handlebars from "handlebars";

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const TEMPLATE_DIR = path.join(SCRIPT_DIR, "templates", "default");
const TEMPLATE_FILE = path.join(TEMPLATE_DIR, "html.hbs");
const CSS_FILE = path.join(TEMPLATE_DIR, "style.css");
const DEFAULTS_FILE = path.join(SCRIPT_DIR, "defaults.json5");

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
  if (!fs.existsSync(DEFAULTS_FILE)) {
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

  const content = fs.readFileSync(DEFAULTS_FILE, "utf-8");
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
  if (!fs.existsSync(CSS_FILE)) {
    logErr(`Warning: CSS file not found at ${CSS_FILE}`);
    return "";
  }

  return fs.readFileSync(CSS_FILE, "utf-8");
}

function loadTemplate() {
  if (!fs.existsSync(TEMPLATE_FILE)) {
    throw new Error(`Template file not found: ${TEMPLATE_FILE}`);
  }

  return fs.readFileSync(TEMPLATE_FILE, "utf-8");
}

function formatExperience(experience) {
  return (Array.isArray(experience) ? experience : [])
    .filter((job) => job !== null && job !== undefined)
    .map((job) => {
      let formattedDate = "";
      if (job.start) {
        formattedDate = formatDate(job.start);
        if (job.end) {
          formattedDate += ` - ${formatDate(job.end)}`;
        } else {
          formattedDate += " - Present";
        }
      } else if (job.timeframe) {
        formattedDate = job.timeframe;
      }
      return {
        ...job,
        achievements: job.achievements || [],
        formattedDate,
      };
    });
}

function generateHtml(rawResume) {
  const defaults = loadDefaults();
  const resume = mergeWithDefaults(rawResume, defaults);

  const labels =
    resume.lang === "es"
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

  const skills = resume.skills || [];
  const skillsPrimary = skills.slice(0, 2).join(", ");
  const skillsSecondary = skills.length > 2 ? skills.slice(2).join(", ") : "";

  const formattedExperience = formatExperience(resume.experience);

  const validProjects = (resume.projects || [])
    .filter((p) => p !== null && p !== undefined)
    .filter((p) => {
      if (typeof p === "string") return false;
      return p.name || p.url || p.description;
    })
    .map((p) => {
      const url = p.url || "#";
      return {
        name: p.name || "Untitled",
        url,
        description: p.description || "",
        showUrl: url !== "#",
        formattedUrl: url !== "#" ? formatUrl(url) : "",
      };
    });

  const templateData = {
    ...resume,
    labels,
    skillsPrimary,
    skillsSecondary,
    experience: formattedExperience,
    validProjects,
    css: loadCss(),
  };

  const templateSource = loadTemplate();
  const template = Handlebars.compile(templateSource);

  return template(templateData);
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
      console.log(`Usage: node cv2pdf.js <input> <output> [options]

Examples:
  node cv2pdf.js resume.json5 output.pdf
  node cv2pdf.js cvs/*.json5 output/
  node cv2pdf.js cvs/*.json5 output/ --parallel 3 --quiet

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
