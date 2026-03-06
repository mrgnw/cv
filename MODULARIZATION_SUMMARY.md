# CV Generation System - Modularization Summary

## Overview

The `pdf.js` script has been refactored into a modular system while maintaining full backwards compatibility with the CLI interface. The new structure supports use cases in:

- **CLI**: Run `pnpm pdf.js resume.json5 output.pdf` (unchanged)
- **Node.js API**: Import modules programmatically for server-side generation
- **Svelte**: Import browser-safe functions for live preview in the UI

## What Changed

### Before
- **Single file**: `pdf.js` (~360 lines)
- **Monolithic**: All logic mixed together
- **Not reusable**: Had to execute CLI script or duplicate code
- **File-system dependent**: Everything required file I/O

### After
- **Modular structure**: Separated concerns across 7 files
- **Reusable components**: Import and compose functionality as needed
- **Multiple environments**: Works in CLI, Node.js API, and browser
- **Clean separation**: File I/O isolated from template/HTML logic

## File Structure

```
cv/
├── pdf.js                 # CLI entry point (3 lines, calls lib/cli.js)
├── lib/
│   ├── core/              # Core modules (no file I/O, no Playwright)
│   │   ├── index.js       # Main exports
│   │   ├── resume.js      # Resume loading/merging
│   │   ├── templates.js   # Template/Handlebars operations
│   │   ├── html.js        # HTML generation
│   │   ├── utils.js       # Formatting utilities
│   │   └── pdf.js         # PDF generation (Playwright-dependent)
│   ├── cli.js             # CLI handler and argument parsing
│   ├── generate-cv.js     # High-level API (browser-safe + Node.js)
│   ├── README.md          # Complete API documentation
│   ├── SVELTE_EXAMPLE.md  # Example Svelte components
│   └── MODULARIZATION_SUMMARY.md (this file)
```

## Key Modules

### `lib/core/resume.js` (browser-safe)
**Responsibility**: Parse and merge resume data

**Exports**:
- `loadResume(filePath)` - Read file (Node.js only)
- `loadResumeFromString(jsonString)` - Parse JSON5 (browser-safe)
- `loadDefaults(path)` - Load defaults (Node.js only)
- `mergeWithDefaults(resume, defaults)` - Merge data (browser-safe)

**Use in Svelte**: `loadResumeFromString()`, `mergeWithDefaults()`

### `lib/core/templates.js` (browser-safe)
**Responsibility**: Load and render Handlebars templates

**Exports**:
- `loadTemplate(path)` - Read file (Node.js only)
- `loadCss(path)` - Read file (Node.js only)
- `renderTemplate(source, data)` - Render (browser-safe)
- `compileTemplate(source)` - Compile (browser-safe)

**Use in Svelte**: `renderTemplate()`, `compileTemplate()`

### `lib/core/html.js` (browser-safe)
**Responsibility**: Generate HTML from resume + template

**Exports**:
- `generateHtml(resume, template, css, defaults)` - Full HTML generation
- `generateTemplateData(resume, css)` - Prepare template data

**Use in Svelte**: Both functions

### `lib/core/utils.js` (browser-safe)
**Responsibility**: Formatting utilities

**Exports**:
- `formatDate(dateStr)` - Format dates
- `formatUrl(url)` - Clean URLs
- `formatExperience(jobs)` - Format job entries

**Use in Svelte**: All functions

### `lib/core/pdf.js` (Node.js only)
**Responsibility**: PDF generation with Playwright

**Exports**:
- `generatePdfFromHtml(browser, html, path)` - Generate PDF
- `launchBrowser()` - Start browser
- `closeBrowser(browser)` - Clean up

**Use in Svelte**: Cannot be imported in browser

### `lib/cli.js` (Node.js only)
**Responsibility**: CLI argument parsing and batch processing

**Exports**:
- `runCli(args)` - Main entry point
- `parseCliArgs(args)` - Parse arguments
- `expandFiles(pattern)` - Glob expansion

**Called by**: `pdf.js` script

### `lib/generate-cv.js` (hybrid)
**Responsibility**: High-level API for common tasks

**Exports**:
- `generatePreview(json, template, css, defaults)` - Browser-safe preview
- `generatePdfFile(html, path, browser)` - Node.js PDF generation
- `generateCv(options)` - Complete workflow

**Use in Svelte**: `generatePreview()` only

## How the CLI Still Works

```bash
# Old way (still works exactly the same)
pnpm pdf.js resume.json5 output.pdf

# What happens internally now:
# 1. pdf.js calls: runCli(process.argv.slice(2))
# 2. lib/cli.js parses args and loads files
# 3. For each file:
#    - Load resume (lib/core/resume.js)
#    - Merge with defaults (lib/core/resume.js)
#    - Generate HTML (lib/core/html.js)
#    - Generate PDF (lib/core/pdf.js)
```

## How to Use in Svelte (Future Implementation)

### Simple Preview
```javascript
import { generatePreview } from '$lib/generate-cv.js';

const result = generatePreview(
  resumeJson,      // String of JSON5
  templateSource,  // Template HTML string
  cssContent       // CSS string
);

if (result.error) {
  console.error(result.error);
} else {
  document.body.innerHTML = result.html; // Show preview
}
```

### With PDF Download (requires server endpoint)
```javascript
import { generateCv } from '$lib/generate-cv.js';

const result = await generateCv({
  resumeJson,
  templateSource,
  css,
  outputPath: 'output.pdf' // Server-side only
});

// result.preview = HTML for display
// result.pdf = true if PDF was generated
```

## Backward Compatibility

✅ **100% compatible** - The CLI works exactly as before:

```bash
# All these still work
pnpm pdf.js resume.json5 output.pdf
pnpm pdf.js cvs/*.json5 output/
pnpm pdf.js resume.json5 output.pdf --parallel 4 --quiet
```

The only difference is internal refactoring - no user-facing changes.

## Benefits of This Refactoring

### For CLI Users
- ✅ Same interface
- ✅ Faster iteration (modular code is easier to maintain)
- ✅ Better error messages potential

### For Svelte Implementation
- ✅ Can generate preview in browser (no server needed)
- ✅ Instant feedback as user types
- ✅ Access to individual components

### For Future Features
- ✅ Add new output formats (HTML email, markdown)
- ✅ Create web UI without duplicating logic
- ✅ Build mobile app with shared logic
- ✅ Add API endpoints easily

### For Testing
- ✅ Test individual components in isolation
- ✅ Mock file system for tests
- ✅ No need to test entire workflow every time

## Migration Path for Your Svelte Page

When you implement the Svelte CV editor:

1. **Load templates** (once on mount)
   ```javascript
   const template = await fetch('/templates/default/html.hbs').then(r => r.text());
   const css = await fetch('/templates/default/style.css').then(r => r.text());
   ```

2. **Generate preview on input change** (browser)
   ```javascript
   import { generatePreview } from '$lib/generate-cv.js';
   
   const result = generatePreview(resumeJson, template, css);
   ```

3. **Create server endpoint for PDF** (optional)
   ```javascript
   // src/routes/api/generate-pdf/+server.js
   import { generatePdfFile } from '$lib/generate-cv.js';
   
   export async function POST({ request }) {
     const { html } = await request.json();
     const result = await generatePdfFile(html, 'output.pdf');
     // ... send PDF to client
   }
   ```

4. **Add download button** (client calls endpoint)
   ```javascript
   async function downloadPdf() {
     const response = await fetch('/api/generate-pdf', {
       method: 'POST',
       body: JSON.stringify({ html: previewHtml })
     });
     // ... handle response as file download
   }
   ```

See `lib/SVELTE_EXAMPLE.md` for complete component examples.

## Testing the New Structure

All modules work independently:

```bash
# Test CLI (still works)
pnpm pdf.js resume.json5 output.pdf

# Test in Node.js script
node -e "
import { generatePreview } from './lib/generate-cv.js';
const result = generatePreview('{name: \"Test\"}', template, css);
console.log(result.html);
"

# Test in browser (via Svelte component or console)
import { generatePreview } from '$lib/generate-cv.js';
const result = generatePreview('{name: \"Test\"}', template, css);
```

## Performance Considerations

- **Lazy loading**: Don't import `core/pdf.js` in browser code (Playwright won't load)
- **Template caching**: Load templates once and reuse
- **Browser reuse**: Keep browser instance alive for multiple PDF generations (in API)
- **Memory**: Templates and CSS are strings - minimal overhead

## Notes for Future Development

1. **Adding new templates**: Add to `templates/` directory, reference by path
2. **Customizing Handlebars**: Use `registerHelper()` from `templates.js`
3. **Adding new formats**: Create new module like `lib/core/docx.js`
4. **Extending CLI**: Modify `lib/cli.js` and re-export from `pdf.js`

## Files Touched

- ✏️ Modified: `pdf.js` (reduced from 360 to 3 lines)
- ✨ Created: `lib/core/resume.js`
- ✨ Created: `lib/core/templates.js`
- ✨ Created: `lib/core/html.js`
- ✨ Created: `lib/core/utils.js`
- ✨ Created: `lib/core/pdf.js`
- ✨ Created: `lib/core/index.js`
- ✨ Created: `lib/cli.js`
- ✨ Created: `lib/generate-cv.js`
- ✨ Created: `lib/README.md`
- ✨ Created: `lib/SVELTE_EXAMPLE.md`
- ✨ Created: `MODULARIZATION_SUMMARY.md` (this file)

## Next Steps

1. ✅ Modularization complete - all functionality preserved
2. ⏳ When ready: Implement Svelte page using `lib/generate-cv.js`
3. ⏳ Create API endpoint for PDF generation
4. ⏳ Add styling and UX refinements

The system is ready for Svelte integration whenever you need it!
