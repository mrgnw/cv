# Cloudflare Workers Integration Guide

## Overview

This guide explains how to use the CV generation system in Cloudflare Workers for your web UI. The key difference from the CLI is that Workers use Cloudflare's Browser Rendering API instead of Playwright.

## Why Browser Rendering API?

| Feature | Playwright (CLI) | Browser Rendering API (Workers) |
|---------|-----------------|--------------------------------|
| Binary Size | ~40MB | 0 bytes (API call) |
| Cold Start | Slow | Fast |
| Execution | Local | Cloudflare's infrastructure |
| Cost | Included | Per-render (very cheap) |
| Deployment | Works locally/servers | Perfect for Workers |

## Architecture

```
Your Svelte App
    ↓
Cloudflare Worker (handles API requests)
    ├── Receive JSON resume from browser
    ├── Generate HTML (using lib/core)
    ├── Call Browser Rendering API
    └── Return PDF to browser
```

## Setup

### 1. Configure wrangler.toml

```toml
# wrangler.toml

name = "cv"
main = "src/index.js"
compatibility_date = "2024-01-01"

# Environment variables for Browser Rendering API
[env.production]
vars = { CLOUDFLARE_ACCOUNT_ID = "your-account-id" }

# Secrets (use `wrangler secret put` to set these)
[env.production]
secrets = [ "CLOUDFLARE_API_TOKEN" ]

# R2 bucket binding (optional, for storing PDFs)
[[r2_buckets]]
binding = "CV_BUCKET"
bucket_name = "cv-storage"
```

### 2. Get Your Account ID and API Token

```bash
# Get account ID
wrangler whoami

# Create API token at: https://dash.cloudflare.com/profile/api-tokens
# Permissions needed:
#   - Account > Browser Rendering > Read
#   - Account > Cloud Storage > Edit (if using R2)

# Store the token securely
wrangler secret put CLOUDFLARE_API_TOKEN --env production
```

### 3. Create the Worker Handler

Create `src/routes/api/generate-pdf/+server.js`:

```javascript
import { generateHtml } from '$lib/core/index.js';
import { generatePdfResponse } from '$lib/core/pdf-cloudflare.js';

export async function POST({ request, platform }) {
  try {
    const { resumeJson, templateSource, css } = await request.json();

    // Validate inputs
    if (!resumeJson || !templateSource) {
      return new Response(
        JSON.stringify({ error: 'Missing resumeJson or templateSource' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse and generate HTML (browser-safe)
    const html = generateHtml(
      typeof resumeJson === 'string' 
        ? JSON.parse(resumeJson) 
        : resumeJson,
      templateSource,
      css || ''
    );

    // Generate PDF using Cloudflare API
    // platform.env contains your bindings from wrangler.toml
    const response = await generatePdfResponse(
      html,
      'resume.pdf',
      platform.env
    );

    return response;
  } catch (error) {
    console.error('PDF generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

### 4. Svelte Component

Create `src/routes/cv/+page.svelte`:

```svelte
<script>
  import { generatePreview } from '$lib/generate-cv.js';
  import { onMount } from 'svelte';

  let resumeText = '{\n  name: "Your Name",\n  email: "email@example.com",\n  skills: []\n}';
  let preview = '';
  let error = '';
  let templateSource = '';
  let cssContent = '';
  let isGeneratingPdf = false;

  onMount(async () => {
    // Load template and CSS from your server
    try {
      const [templateRes, cssRes] = await Promise.all([
        fetch('/templates/default/html.hbs'),
        fetch('/templates/default/style.css')
      ]);

      if (!templateRes.ok || !cssRes.ok) {
        throw new Error('Failed to load template or CSS');
      }

      templateSource = await templateRes.text();
      cssContent = await cssRes.text();
    } catch (err) {
      error = `Failed to load template: ${err.message}`;
    }
  });

  function updatePreview() {
    if (!templateSource) return;

    const result = generatePreview(resumeText, templateSource, cssContent);
    if (result.error) {
      error = result.error;
      preview = '';
    } else {
      preview = result.html;
      error = '';
    }
  }

  async function downloadPdf() {
    if (!preview) {
      error = 'Generate preview first';
      return;
    }

    isGeneratingPdf = true;
    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeJson: resumeText,
          templateSource,
          css: cssContent
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'PDF generation failed');
      }

      // Download the PDF
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      error = `Download failed: ${err.message}`;
    } finally {
      isGeneratingPdf = false;
    }
  }

  // Update preview when resume changes
  $: if (resumeText && templateSource) {
    updatePreview();
  }
</script>

<div class="container">
  <div class="editor-section">
    <h1>CV Builder</h1>
    <h2>Resume (JSON5)</h2>
    <textarea
      bind:value={resumeText}
      placeholder="Enter your resume in JSON5 format..."
      class="editor"
    />
    <button on:click={downloadPdf} disabled={!preview || isGeneratingPdf} class="download-btn">
      {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}
    </button>
  </div>

  <div class="preview-section">
    <h2>Preview</h2>
    {#if error}
      <div class="error-box">{error}</div>
    {:else if preview}
      <iframe title="Resume Preview" srcdoc={preview} class="preview-iframe" />
    {:else}
      <p class="placeholder">Enter resume and it will appear here...</p>
    {/if}
  </div>
</div>

<style>
  .container {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 2rem;
    height: 100vh;
    padding: 2rem;
    background: #f5f5f5;
  }

  .editor-section {
    display: flex;
    flex-direction: column;
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .preview-section {
    display: flex;
    flex-direction: column;
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    min-height: 0;
  }

  h1 {
    margin: 0 0 1.5rem 0;
    font-size: 1.75rem;
    color: #333;
  }

  h2 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    color: #555;
  }

  .editor {
    flex: 1;
    padding: 1rem;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.9rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    resize: none;
    margin-bottom: 1rem;
  }

  .download-btn {
    padding: 0.75rem 1rem;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: background 0.2s;
  }

  .download-btn:hover:not(:disabled) {
    background: #1565c0;
  }

  .download-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .error-box {
    background: #ffebee;
    color: #d32f2f;
    padding: 1rem;
    border-radius: 4px;
    border: 1px solid #ffcdd2;
  }

  .placeholder {
    color: #999;
    text-align: center;
    padding: 2rem;
    font-style: italic;
  }

  .preview-iframe {
    flex: 1;
    border: 1px solid #ddd;
    border-radius: 4px;
    min-height: 0;
  }

  @media (max-width: 1024px) {
    .container {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
  }
</style>
```

## Deployment

### Deploy to Cloudflare

```bash
# Build your SvelteKit app
pnpm run build

# Deploy to Cloudflare Workers
pnpm run deploy

# Or manually with wrangler
wrangler deploy --env production
```

### Set the API Token Secret

```bash
wrangler secret put CLOUDFLARE_API_TOKEN --env production
# Paste your API token when prompted
```

## Advanced: Store PDFs in R2

If you want to store generated PDFs:

### 1. Update wrangler.toml

```toml
[[r2_buckets]]
binding = "CV_BUCKET"
bucket_name = "cv-storage"

[env.production]
vars = { R2_PUBLIC_URL = "https://cv.example.com" }
```

### 2. Update the Worker Handler

```javascript
import { generateHtml } from '$lib/core/index.js';
import { generatePdfToR2 } from '$lib/core/pdf-cloudflare.js';

export async function POST({ request, platform }) {
  try {
    const { resumeJson, templateSource, css, userId } = await request.json();

    const html = generateHtml(
      typeof resumeJson === 'string' ? JSON.parse(resumeJson) : resumeJson,
      templateSource,
      css || ''
    );

    // Save to R2
    const filename = `resumes/${userId || 'anonymous'}-${Date.now()}.pdf`;
    const result = await generatePdfToR2(
      html,
      filename,
      platform.env,
      platform.env.CV_BUCKET
    );

    if (!result.success) {
      throw new Error(result.error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        filename: result.filename,
        url: result.url
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('PDF generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

## Environment Variables

### Required

- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID (get from `wrangler whoami`)
- `CLOUDFLARE_API_TOKEN`: API token with Browser Rendering permission (set via `wrangler secret put`)

### Optional

- `R2_PUBLIC_URL`: Public URL for R2 bucket (if using R2 storage)

## API Costs

Cloudflare Browser Rendering API pricing (as of 2024):
- $0.005 per render call
- Example: 1,000 PDFs = $5

This is very affordable for most use cases.

## Local Development

For local development, you can use the CLI with Playwright:

```bash
# Terminal 1: Run Svelte dev server
pnpm run dev

# Terminal 2: Test PDF generation locally (uses Playwright)
node pdf.js resume.json5 output.pdf
```

## Troubleshooting

### "Missing Cloudflare credentials"
Make sure you've set the environment variables in `wrangler.toml` and the secret:
```bash
wrangler secret put CLOUDFLARE_API_TOKEN --env production
```

### "Browser Rendering API error"
Check that your API token has the correct permissions. It needs:
- Account > Browser Rendering > Read

### "PDF is blank or malformed"
Ensure the HTML being sent is valid. Test with:
```javascript
const result = generatePreview(resume, template, css);
console.log(result.html); // Check the HTML output
```

### Timeouts on large PDFs
Browser Rendering API has a 30-second timeout. Very large PDFs might hit this.
Consider:
- Simplifying the template
- Splitting content across multiple pages
- Pre-rendering as much as possible

## Performance Tips

1. **Cache templates**: Load template and CSS once, reuse them
2. **Validate input**: Check JSON validity before sending to Worker
3. **Use compression**: Send gzipped requests if possible
4. **Batch operations**: If generating multiple PDFs, consider parallel requests

## Security Considerations

1. **API Token**: Never commit to git, use `wrangler secret put`
2. **Rate limiting**: Add rate limiting on your Worker endpoints
3. **Input validation**: Validate JSON5 input before processing
4. **File size limits**: Set reasonable limits on HTML size

## Migration from CLI to Workers

### Before (CLI with Playwright)
```bash
node pdf.js resume.json5 resume.pdf
```

### After (Workers with Browser Rendering)
```javascript
// Same core logic
const html = generateHtml(resume, template, css);

// Different PDF generation
// CLI: await generatePdfFromHtml(browser, html, 'output.pdf');
// Workers: await generatePdfResponse(html, 'resume.pdf', env);
```

All the core resume parsing and HTML generation logic (`lib/core/`) works the same!

## Next Steps

1. ✅ Set up wrangler.toml with credentials
2. ✅ Create the API endpoint handler
3. ✅ Build the Svelte component
4. ✅ Deploy to Cloudflare
5. ✅ Test PDF generation
6. (Optional) Set up R2 for storage

## Resources

- [Cloudflare Browser Rendering API Docs](https://developers.cloudflare.com/browser-rendering/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [SvelteKit Deployment](https://kit.svelte.dev/docs/adapter-cloudflare)
- [R2 Object Storage](https://developers.cloudflare.com/r2/)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the Cloudflare API error messages
3. Test the HTML generation locally first
4. Verify credentials and permissions
