# CV Generation Library

A modular system for generating CVs/Resumes in HTML and PDF format from JSON5 data.

## Overview

The library is split into two main parts:

1. **Core Modules** (`lib/core/`) - Low-level utilities for processing resumes
2. **High-level APIs** - Easy-to-use functions for common tasks

This design allows the code to work in multiple environments:
- **Node.js CLI**: Run `pdf.js` to batch-process resume files
- **Node.js API**: Import modules to programmatically generate CVs with PDF export
- **Browser/Svelte**: Import `lib/generate-cv.js` to generate HTML previews (no PDF generation)

## Directory Structure

```
lib/
├── core/
│   ├── index.js          # Main export file
│   ├── resume.js         # Resume loading and merging
│   ├── templates.js      # Template loading and compilation
│   ├── html.js           # HTML generation logic
│   ├── pdf.js            # PDF generation (Playwright)
│   └── utils.js          # Formatting utilities
├── cli.js                # CLI handler
├── generate-cv.js        # High-level API (browser-safe functions)
└── README.md             # This file
```

## Core Modules

### `lib/core/resume.js`

Handles resume data loading and merging with defaults.

**Functions:**
- `loadResume(filePath)` - Load resume from JSON5 file (Node.js only)
- `loadResumeFromString(jsonString)` - Parse resume from string (works everywhere)
- `loadDefaults(path)` - Load defaults from file (Node.js only)
- `mergeWithDefaults(resume, defaults)` - Merge resume with fallback values
- `getDefaultDefaults()` - Get hardcoded default values

**Browser-safe**: `loadResumeFromString()`, `mergeWithDefaults()`, `getDefaultDefaults()`

### `lib/core/templates.js`

Handles template loading and rendering with Handlebars.

**Functions:**
- `loadTemplate(path)` - Load template file (Node.js only)
- `loadCss(path)` - Load CSS file (Node.js only)
- `compileTemplate(source)` - Compile Handlebars template
- `renderTemplate(source, data)` - Render template with data
- `registerHelper(name, fn)` - Register Handlebars helper

**Browser-safe**: `compileTemplate()`, `renderTemplate()`, `registerHelper()`

### `lib/core/html.js`

High-level HTML generation combining resume data with templates.

**Functions:**
- `generateHtml(resume, templateSource, css, defaults)` - Generate complete HTML
- `generateTemplateData(resume, css)` - Prepare data for template rendering

**Browser-safe**: Both functions (they don't use file I/O)

### `lib/core/pdf.js`

PDF generation using Playwright. **Node.js only.**

**Functions:**
- `generatePdfFromHtml(browser, html, outputPath)` - Convert HTML to PDF
- `launchBrowser()` - Create Playwright browser instance
- `closeBrowser(browser)` - Close browser instance

### `lib/core/utils.js`

Utility functions for formatting dates, URLs, and experience data.

**Functions:**
- `formatDate(dateStr)` - Format dates as "MMM yyyy"
- `formatUrl(url)` - Remove protocol from URLs
- `formatExperience(experience)` - Format job entries with dates

**Browser-safe**: All functions

### `lib/core/index.js`

Main export file. Import all core functions from here.

```javascript
import {
  loadResumeFromString,
  generateHtml,
  renderTemplate,
  // ... etc
} from './core/index.js';
```

## High-level APIs

### `lib/generate-cv.js`

Browser-friendly API for the most common use cases.

**Functions:**

#### `generatePreview(resumeJson, templateSource, css, defaults)`

Generate HTML preview from resume JSON string. **Browser-safe.**

```javascript
import { generatePreview } from './lib/generate-cv.js';

const html = generatePreview(
  '{"name": "John Doe", ...}',
  templateSource,
  cssContent
);

if (html.error) {
  console.error(html.error);
} else {
  document.body.innerHTML = html.html;
}
```

#### `generatePdfFile(html, outputPath, browser)`

Generate PDF from HTML. **Node.js only.**

```javascript
import { generatePdfFile } from './lib/generate-cv.js';

const result = await generatePdfFile(
  htmlContent,
  './output.pdf'
);
```

#### `generateCv(options)`

Complete workflow: generate HTML and optionally save PDF. **Works in both Node.js and browser (will skip PDF in browser).**

```javascript
import { generateCv } from './lib/generate-cv.js';

// Browser usage
const result = await generateCv({
  resumeJson: '{"name": "John", ...}',
  templateSource: templateHbs,
  css: cssContent
});
console.log(result.preview); // HTML string

// Node.js usage with PDF
const result = await generateCv({
  resumeJson: '{"name": "John", ...}',
  templateSource: templateHbs,
  css: cssContent,
  outputPath: './resume.pdf'
});
```

### `lib/cli.js`

CLI handler for batch processing resume files. Used by `pdf.js`.

**Main function:**
- `runCli(args)` - Parse arguments and process files

## Usage Examples

### CLI Usage (Node.js)

```bash
# Single file
pnpm pdf.js resume.json5 resume.pdf

# Multiple files (glob pattern)
pnpm pdf.js cvs/*.json5 output/

# With options
pnpm pdf.js cvs/*.json5 output/ --parallel 4 --quiet
```

### Node.js API - Generate Single CV

```javascript
import fs from 'fs';
import { loadResume, loadDefaults, mergeWithDefaults, loadTemplate, loadCss, generateHtml, generatePdfFromHtml, launchBrowser, closeBrowser } from './lib/core/index.js';

const resume = loadResume('resume.json5');
const defaults = loadDefaults('defaults.json5');
const merged = mergeWithDefaults(resume, defaults);

const template = loadTemplate('templates/default/html.hbs');
const css = loadCss('templates/default/style.css');

const html = generateHtml(merged, template, css);

const browser = await launchBrowser();
await generatePdfFromHtml(browser, html, 'output.pdf');
await closeBrowser(browser);
```

### Svelte Component - Generate Preview

```svelte
<script>
  import { generatePreview } from '../../lib/generate-cv.js';
  import templateSource from './template.hbs?raw';
  import cssContent from './style.css?raw';
  
  let resumeText = '{"name": "Your Name"}';
  let preview = '';
  let error = '';
  
  function updatePreview() {
    const result = generatePreview(resumeText, templateSource, cssContent);
    if (result.error) {
      error = result.error;
      preview = '';
    } else {
      preview = result.html;
      error = '';
    }
  }
</script>

<textarea bind:value={resumeText} on:change={updatePreview} />
{#if error}
  <p class="error">{error}</p>
{:else}
  <iframe srcdoc={preview} />
{/if}
```

### Svelte Component - Download PDF (requires server endpoint)

```svelte
<script>
  // ... preview code above ...
  
  async function downloadPdf() {
    // Send HTML to server, get PDF back
    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: preview })
    });
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume.pdf';
    a.click();
  }
</script>

<button on:click={downloadPdf}>Download PDF</button>
```

## Resume JSON5 Format

```json5
{
  name: "John Doe",
  email: "john@example.com",
  github: "https://github.com/johndoe",
  linkedin: "https://linkedin.com/in/johndoe",
  summary: "Experienced developer...",
  skills: ["JavaScript", "React", "Node.js"],
  
  experience: [
    {
      title: "Senior Developer",
      company: "Tech Corp",
      start: "2020-01-15",
      end: "2023-12-31",  // omit for current role
      achievements: [
        "Led team of 5 developers",
        "Increased performance by 40%"
      ]
    }
  ],
  
  projects: [
    {
      name: "Project Name",
      url: "https://github.com/user/project",
      description: "Brief description"
    }
  ],
  
  education: [
    {
      degree: "BS in Computer Science",
      school: "University Name",
      year: 2020
    }
  ],
  
  lang: "en"  // or "es" for Spanish
}
```

## Defaults

If values are missing from the resume, these defaults are used:

```javascript
{
  name: "Your Name",
  email: "email@example.com",
  github: "https://github.com",
  linkedin: "https://linkedin.com",
  education: [],
  projects: [],
  lang: "en"
}
```

## Environment Compatibility

| Function | Node.js | Browser |
|----------|---------|---------|
| `loadResume()` | ✅ | ❌ File I/O |
| `loadResumeFromString()` | ✅ | ✅ |
| `loadTemplate()` | ✅ | ❌ File I/O |
| `loadCss()` | ✅ | ❌ File I/O |
| `generateHtml()` | ✅ | ✅ |
| `generatePreview()` | ✅ | ✅ |
| `generatePdfFile()` | ✅ | ❌ Playwright |
| `launchBrowser()` | ✅ | ❌ Playwright |

For browser use, pre-load templates and CSS as strings using `?raw` imports (Vite) or other bundler features.

## Migration from Old Code

The old monolithic `pdf.js` has been refactored. The CLI still works exactly the same:

```bash
pnpm pdf.js input.json5 output.pdf
```

But now you can also import individual modules:

```javascript
// Old way (still works through CLI)
// pnpm pdf.js resume.json5 output.pdf

// New way (programmatic)
import { generateCv } from './lib/generate-cv.js';

const result = await generateCv({
  resumeJson: resumeString,
  templateSource: template,
  css: cssContent,
  outputPath: 'output.pdf'
});
```

## Development

### Adding New Utilities

Add utility functions to the appropriate `lib/core/*.js` module, then export from `lib/core/index.js`.

### Adding New Handlebars Helpers

```javascript
import { registerHelper } from './lib/core/templates.js';

registerHelper('uppercase', (str) => str.toUpperCase());
```

### Extending the CLI

Modify `lib/cli.js` to add new options or functionality.

### Creating New High-level APIs

Add wrapper functions to `lib/generate-cv.js` that combine core modules.
