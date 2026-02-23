# CV System - Setup Summary

## What Changed

The monolithic `pdf.js` has been modularized into reusable components while maintaining full CLI compatibility.

### Old Structure
- Single 360-line `pdf.js` file
- Everything mixed together
- Only worked via CLI

### New Structure
```
lib/core/           # Shared logic (browser-safe)
  ├── resume.js     # JSON5 parsing & merging
  ├── templates.js  # Handlebars rendering
  ├── html.js       # HTML generation
  ├── utils.js      # Formatting utilities
  ├── pdf.js        # Playwright (CLI/local)
  └── pdf-cloudflare.js  # Browser Rendering API (Workers)

lib/
  ├── cli.js        # CLI orchestration
  ├── client-pdf.js # Browser print-to-PDF
  └── generate-cv.js# High-level API

pdf.js              # CLI entry point (3 lines)
```

## Usage

### CLI (unchanged)
```bash
node pdf.js resume.json5 output.pdf
node pdf.js cvs/*.json5 output/ --parallel 4
```

### Web UI (new)
```svelte
<script>
  import { generatePreview } from '$lib/generate-cv.js';
  import { downloadPdfViaIframe } from '$lib/client-pdf.js';
  
  let resumeText = '{}';
  let preview = '';
  
  function updatePreview() {
    const result = generatePreview(resumeText, template, css);
    preview = result.html;
  }
  
  function downloadPdf() {
    downloadPdfViaIframe(preview, 'resume.pdf');
  }
</script>

<textarea bind:value={resumeText} on:change={updatePreview} />
<button on:click={downloadPdf}>Print to PDF</button>
<iframe srcdoc={preview} />
```

## Key Files

- `lib/README.md` - Full API documentation
- `lib/SVELTE_SIMPLE.md` - Simple Svelte example (recommended)
- `lib/CLOUDFLARE_WORKERS.md` - If deploying to Workers
- `MODULARIZATION_SUMMARY.md` - Detailed architecture

## What Works Now

✅ CLI: `node pdf.js resume.json5 output.pdf`
✅ Core modules: Reusable in any environment
✅ Browser preview: Real-time in Svelte
✅ PDF download: Native browser print dialog (no server)

## Cloudflare Workers

If you want server-side PDF generation on Workers instead of browser print:

1. Set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` in `wrangler.toml`
2. Use `lib/core/pdf-cloudflare.js` in your Worker endpoint
3. See `lib/CLOUDFLARE_WORKERS.md` for full setup

Otherwise, stick with browser print - simpler and no server costs.

## Install Dependencies

```bash
pnpm install handlebars
```

Done. Everything else is already in package.json.
