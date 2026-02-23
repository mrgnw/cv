# Svelte Integration Example

This document shows how to use the CV generation library in a Svelte component.

## Basic Preview Component

```svelte
<script>
  import { generatePreview } from '$lib/generate-cv.js';
  
  let resumeJson = `{
  name: "Your Name",
  email: "email@example.com",
  skills: ["JavaScript", "Svelte"],
  experience: []
}`;
  
  let preview = '';
  let error = '';
  let templateSource = '';
  let cssContent = '';
  
  // Load template and CSS from static files or server
  onMount(async () => {
    const templateRes = await fetch('/templates/default/html.hbs?raw');
    templateSource = await templateRes.text();
    
    const cssRes = await fetch('/templates/default/style.css?raw');
    cssContent = await cssRes.text();
  });
  
  function updatePreview() {
    if (!templateSource) return;
    
    const result = generatePreview(resumeJson, templateSource, cssContent);
    if (result.error) {
      error = result.error;
      preview = '';
    } else {
      preview = result.html;
      error = '';
    }
  }
  
  // Update preview on input change
  $: if (resumeJson && templateSource) {
    updatePreview();
  }
</script>

<div class="container">
  <div class="editor">
    <h2>Resume (JSON5)</h2>
    <textarea bind:value={resumeJson} placeholder="Enter resume JSON5..." />
    
    {#if error}
      <div class="error">{error}</div>
    {/if}
  </div>
  
  <div class="preview">
    <h2>Preview</h2>
    <iframe srcdoc={preview} title="Resume Preview" />
  </div>
</div>

<style>
  .container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    height: 100vh;
    padding: 2rem;
  }
  
  .editor, .preview {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  h2 {
    margin: 0 0 1rem 0;
  }
  
  textarea {
    flex: 1;
    padding: 1rem;
    font-family: monospace;
    font-size: 0.9rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  
  iframe {
    flex: 1;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  
  .error {
    color: #d32f2f;
    background: #ffebee;
    padding: 0.75rem;
    border-radius: 4px;
    margin-top: 0.5rem;
  }
</style>
```

## Advanced Component with Download

```svelte
<script>
  import { generatePreview } from '$lib/generate-cv.js';
  import { onMount } from 'svelte';
  
  let resumeJson = '{}';
  let preview = '';
  let error = '';
  let templateSource = '';
  let cssContent = '';
  let isDownloading = false;
  
  onMount(async () => {
    // Load template and CSS
    const [templateRes, cssRes] = await Promise.all([
      fetch('/templates/default/html.hbs'),
      fetch('/templates/default/style.css')
    ]);
    
    templateSource = await templateRes.text();
    cssContent = await cssRes.text();
  });
  
  function updatePreview() {
    if (!templateSource) return;
    
    const result = generatePreview(resumeJson, templateSource, cssContent);
    if (result.error) {
      error = result.error;
      preview = '';
    } else {
      preview = result.html;
      error = '';
    }
  }
  
  async function downloadPdf() {
    if (!preview) return;
    
    isDownloading = true;
    try {
      // Send to server endpoint (you'll need to create this)
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: preview })
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }
      
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
      isDownloading = false;
    }
  }
  
  $: if (resumeJson && templateSource) {
    updatePreview();
  }
</script>

<div class="container">
  <div class="sidebar">
    <div class="controls">
      <h1>Resume Builder</h1>
      <button on:click={downloadPdf} disabled={!preview || isDownloading}>
        {isDownloading ? 'Generating...' : 'Download PDF'}
      </button>
    </div>
    
    <div class="editor">
      <h2>Resume (JSON5)</h2>
      <textarea bind:value={resumeJson} placeholder="Enter resume JSON5..." />
      
      {#if error}
        <div class="error">{error}</div>
      {/if}
    </div>
  </div>
  
  <div class="preview-area">
    <h2>Preview</h2>
    <iframe srcdoc={preview} title="Resume Preview" />
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
  
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .controls {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .controls h1 {
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
  }
  
  button {
    width: 100%;
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
  
  button:hover:not(:disabled) {
    background: #1565c0;
  }
  
  button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
  
  .editor {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    min-height: 0;
  }
  
  .editor h2 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
  }
  
  textarea {
    flex: 1;
    padding: 1rem;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.85rem;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    resize: none;
    min-height: 0;
  }
  
  .preview-area {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  
  .preview-area h2 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
  }
  
  iframe {
    flex: 1;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    min-height: 0;
  }
  
  .error {
    color: #d32f2f;
    background: #ffebee;
    padding: 0.75rem;
    border-radius: 4px;
    margin-top: 0.5rem;
    font-size: 0.9rem;
  }
</style>
```

## Server Endpoint Example (SvelteKit)

Create `src/routes/api/generate-pdf/+server.js`:

```javascript
import { json } from '@sveltejs/kit';
import { generatePdfFile } from '$lib/generate-cv.js';

export async function POST({ request }) {
  try {
    const { html } = await request.json();
    
    if (!html) {
      return json({ error: 'HTML content required' }, { status: 400 });
    }
    
    // Generate PDF to a temporary file or buffer
    // For now, we'll use a simple approach with file system
    import { tmpdir } from 'os';
    import { join } from 'path';
    import { randomBytes } from 'crypto';
    import fs from 'fs/promises';
    
    const tmpFile = join(tmpdir(), `resume-${randomBytes(8).toString('hex')}.pdf`);
    
    const result = await generatePdfFile(html, tmpFile);
    
    if (!result.success) {
      return json({ error: result.error }, { status: 500 });
    }
    
    // Read the PDF file
    const pdfBuffer = await fs.readFile(tmpFile);
    
    // Clean up
    await fs.unlink(tmpFile);
    
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="resume.pdf"'
      }
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return json({ error: error.message }, { status: 500 });
  }
}
```

## Configuration

### Vite Config

Add support for loading files as raw text:

```javascript
// vite.config.js
export default {
  // ... other config
  ssr: {
    external: ['playwright'] // Don't bundle Playwright in SSR
  }
};
```

### Package Imports

```javascript
// src/lib/index.js (optional barrel export)
export { generatePreview, generateCv } from './generate-cv.js';
export { 
  loadResumeFromString,
  mergeWithDefaults,
  renderTemplate 
} from './core/index.js';
```

## Tips for Production

1. **Template Caching**: Cache loaded templates in memory or store
2. **Error Boundaries**: Wrap components in error boundaries
3. **Validation**: Validate JSON5 input before parsing
4. **Rate Limiting**: Add rate limiting to PDF generation endpoint
5. **Temporary Files**: Clean up temporary PDF files regularly
6. **Memory Management**: Close browser instances properly

Example with stores:

```javascript
// src/lib/stores.js
import { writable } from 'svelte/store';

export const template = writable('');
export const css = writable('');
export const resume = writable('{}');

// Load templates on app init
import { browser } from '$app/environment';

if (browser) {
  Promise.all([
    fetch('/templates/default/html.hbs').then(r => r.text()),
    fetch('/templates/default/style.css').then(r => r.text())
  ]).then(([t, c]) => {
    template.set(t);
    css.set(c);
  });
}
```

Then in your component:

```svelte
<script>
  import { template, css, resume } from '$lib/stores.js';
  import { generatePreview } from '$lib/generate-cv.js';
</script>

{#if $template && $css}
  <!-- Component code -->
{:else}
  <p>Loading...</p>
{/if}
```
