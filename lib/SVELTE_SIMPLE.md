# Simple Svelte CV Editor

No server needed. User generates preview, clicks print, saves as PDF.

## Component

```svelte
<script>
  import { generatePreview } from '$lib/generate-cv.js';
  import { downloadPdfViaIframe } from '$lib/client-pdf.js';
  
  let resumeText = `{
  name: "Your Name",
  email: "email@example.com",
  skills: ["JavaScript", "Svelte"]
}`;
  
  let preview = '';
  let error = '';
  let templateSource = '';
  let cssContent = '';
  
  onMount(async () => {
    const [tRes, cRes] = await Promise.all([
      fetch('/templates/default/html.hbs'),
      fetch('/templates/default/style.css')
    ]);
    
    templateSource = await tRes.text();
    cssContent = await cRes.text();
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
  
  function downloadPdf() {
    if (preview) {
      downloadPdfViaIframe(preview, 'resume.pdf');
    }
  }
  
  $: if (resumeText && templateSource) {
    updatePreview();
  }
</script>

<div class="container">
  <div class="editor">
    <h1>CV Builder</h1>
    <textarea bind:value={resumeText} placeholder="Enter resume JSON5..." />
    {#if error}
      <div class="error">{error}</div>
    {/if}
    <button on:click={downloadPdf} disabled={!preview}>Download PDF</button>
  </div>
  
  <div class="preview">
    <h2>Preview</h2>
    {#if preview}
      <iframe srcdoc={preview} title="Preview" />
    {:else}
      <p>Enter resume above...</p>
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
  }
  
  .editor {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  h1 {
    margin: 0;
  }
  
  textarea {
    flex: 1;
    font-family: monospace;
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  
  button {
    padding: 0.75rem;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:hover:not(:disabled) {
    background: #0056b3;
  }
  
  button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
  
  .error {
    color: #d32f2f;
    background: #ffebee;
    padding: 0.75rem;
    border-radius: 4px;
  }
  
  .preview {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  iframe {
    flex: 1;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
</style>
```

## Setup

1. Load template/CSS from static folder:
```bash
mkdir -p static/templates/default
cp templates/default/html.hbs static/templates/default/
cp templates/default/style.css static/templates/default/
```

2. Create route: `src/routes/cv/+page.svelte` (paste component above)

3. Done. No API endpoints needed.

## How it works

1. User pastes resume JSON5
2. JavaScript generates HTML preview (in browser)
3. User clicks "Download PDF"
4. Browser's print dialog opens
5. User selects "Save as PDF"

That's it.
