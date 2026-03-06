<script>
	import { generatePreview } from "$lib/generate-cv.js";
	import { downloadPdfViaIframe } from "$lib/client-pdf.js";
	import { onMount } from "svelte";

	let resumeText = `{
  name: "Your Name",
  email: "email@example.com",
  github: "https://github.com",
  linkedin: "https://linkedin.com",
  skills: ["JavaScript", "Svelte"],
  experience: [],
  projects: [],
  education: []
}`;

	let preview = "";
	let error = "";
	let templateSource = "";
	let cssContent = "";

	onMount(async () => {
		const [tRes, cRes] = await Promise.all([
			fetch("/templates/default/html.hbs"),
			fetch("/templates/default/style.css"),
		]);

		templateSource = await tRes.text();
		cssContent = await cRes.text();
	});

	function updatePreview() {
		if (!templateSource) return;

		const result = generatePreview(resumeText, templateSource, cssContent);
		if (result.error) {
			error = result.error;
			preview = "";
		} else {
			preview = result.html;
			error = "";
		}
	}

	function downloadPdf() {
		if (preview) {
			downloadPdfViaIframe(preview, "resume.pdf");
		}
	}

	$: if (resumeText && templateSource) {
		updatePreview();
	}
</script>

<div class="container">
	<div class="editor">
		<h1>CV Builder</h1>
		<textarea bind:value={resumeText} placeholder="Enter resume JSON5..."
		></textarea>
		{#if error}
			<div class="error">{error}</div>
		{/if}
		<button on:click={downloadPdf} disabled={!preview}>Download PDF</button>
	</div>

	<div class="preview">
		<h2>Preview</h2>
		{#if preview}
			<iframe srcdoc={preview} title="Preview"></iframe>
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
		background: #f5f5f5;
	}

	.editor {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		background: white;
		padding: 2rem;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.preview {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		background: white;
		padding: 2rem;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		min-height: 0;
	}

	h1 {
		margin: 0;
		font-size: 1.75rem;
	}

	h2 {
		margin: 0;
		font-size: 1.1rem;
	}

	textarea {
		flex: 1;
		font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
		font-size: 0.9rem;
		padding: 1rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		resize: none;
	}

	button {
		padding: 0.75rem 1rem;
		background: #007bff;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
		font-weight: 500;
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
		border: 1px solid #ffcdd2;
	}

	p {
		color: #999;
		text-align: center;
		padding: 2rem;
		font-style: italic;
	}

	iframe {
		flex: 1;
		border: 1px solid #ddd;
		border-radius: 4px;
		min-height: 0;
	}

	@media (max-width: 1024px) {
		.container {
			grid-template-columns: 1fr;
		}
	}
</style>
