<script>
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { dev } from '$app/environment';
	import CV from '$lib/CV.svelte';
	import GenerationMetadata from '$lib/components/GenerationMetadata.svelte';
	import ModelDropdown from '$lib/components/ModelDropdown.svelte';
	import JobDescriptionForm from '$lib/components/JobDescriptionForm.svelte';
	import CVPreview from '$lib/components/CVPreview.svelte';
	import { getEnabledModelIds } from '$lib/utils/format.js';
	
	// Receive server-side data using Svelte 5 $props
	let { data, form } = $props();
	
	let jobDescription = $state('');
	let company = $state('');
	let title = $state('');
	let isGenerating = $state(false);
	let generatedCV = $state(null);
	let generationMetadata = $state(null); // Track model used and generation timestamp
	let showPreview = $state(true);
	let saveSuccess = $state('');
	let saveError = $state('');
	let isSaving = $state(false);
	let savedVersionSlug = $state(''); // Track the slug of the saved version
	let actionError = $state(''); // Track latest action error to avoid stale form errors
	let pdfStatus = $state('');
	let pdfError = $state('');
	
	// Model prioritization with pricing data - initialized once with fallback pricing
	let models = $state([
		{ 
			id: 'google/gemini-2.5-flash', 
			name: 'Gemini 2.5 Flash', 
			enabled: true,
			pricing: data?.modelPricing?.['google/gemini-2.5-flash'] || { prompt: 0.000075, completion: 0.0003 }
		},
		{ 
			id: 'openai/gpt-4.1-mini', 
			name: 'GPT-4.1 Mini', 
			enabled: true,
			pricing: data?.modelPricing?.['openai/gpt-4.1-mini'] || { prompt: 0.00015, completion: 0.0006 }
		},
		{ 
			id: 'google/gemini-2.5-pro', 
			name: 'Gemini 2.5 Pro', 
			enabled: true,
			pricing: data?.modelPricing?.['google/gemini-2.5-pro'] || { prompt: 0.00125, completion: 0.005 }
		},
		{ 
			id: 'openai/gpt-5', 
			name: 'GPT-5', 
			enabled: true,
			pricing: data?.modelPricing?.['openai/gpt-5'] || { prompt: 0.003, completion: 0.012 }
		},
		{ 
			id: 'anthropic/claude-sonnet-4', 
			name: 'Claude Sonnet 4', 
			enabled: true,
			pricing: data?.modelPricing?.['anthropic/claude-sonnet-4'] || { prompt: 0.003, completion: 0.015 }
		}
	]);
	
	// Format pricing as cents per 1K tokens
	function formatPricing(pricing) {
		if (!pricing) return null;
		const inputCents = (pricing.prompt * 1000 * 100).toFixed(2);
		const outputCents = (pricing.completion * 1000 * 100).toFixed(2);
		return `${inputCents} / ${outputCents}`;
	}

	// Estimate cost for a CV generation
	function estimateGenerationCost(model) {
		if (!model?.pricing) return null;
		
		// Rough estimate: ~2000 input tokens (job description + prompt) + ~1500 output tokens (CV JSON)
		const inputTokens = 2000;
		const outputTokens = 1500;
		
		const inputCost = (inputTokens / 1000) * model.pricing.prompt;
		const outputCost = (outputTokens / 1000) * model.pricing.completion;
		const totalCost = inputCost + outputCost;
		
		return {
			inputCost,
			outputCost,
			totalCost,
			formatted: `$${totalCost.toFixed(4)}`
		};
	}

	// Get enabled model IDs in order - this is reactive in Svelte 5
	let enabledModelIds = $derived(getEnabledModelIds(models));
	// Trigger generation manually
	function triggerGenerate() {
		if (jobDescription.length > 50 && !isGenerating) {
			const form = document.getElementById('generate-form');
			if (form) {
				isGenerating = true;
				form.requestSubmit();
			}
		}
	}
	
	// Set primary model (moves selected model to position 0)
	function setPrimaryModel(modelId) {
		const modelIndex = models.findIndex(m => m.id === modelId);
		if (modelIndex > 0) {
			const selectedModel = models[modelIndex];
			const newModels = [...models];
			newModels.splice(modelIndex, 1);
			newModels.unshift(selectedModel);
			models = newModels;
		}
	}

	// Derive friendly label for the current/primary model (first enabled model)
	let modelNameMap = $derived(Object.fromEntries(models.map((m) => [m.id, m.name])));
	let currentModelLabel = $derived.by(() => {
		const first = enabledModelIds[0];
		return modelNameMap[first] || first || '';
	});


	// Form submission handler
	function handleSubmit() {
		return async ({ result, update }) => {
			isGenerating = false;
			
			if (result.type === 'success') {
				generatedCV = result.data?.cv;
				generationMetadata = {
					modelUsed: result.data?.modelUsed,
					generatedAt: result.data?.generatedAt
				};
				actionError = '';
				
				// Auto-populate company and title if suggested by LLM and fields are empty
				if (generatedCV?.company && !company.trim()) {
					company = generatedCV.company;
				}
				if (generatedCV?.title && !title.trim()) {
					title = generatedCV.title;
				}
			} else if (result.type === 'failure') {
				actionError = result.data?.error || 'Generation failed';
			}
			
			// Don't call update() to preserve form values
			// await update();
		};
	}

	// URL extraction handler
	// Save CV function with versioning support
	async function saveCV(createNewVersion = false) {
		if (!generatedCV || isSaving) return;
		
		isSaving = true;
		saveError = '';
		saveSuccess = '';
		actionError = '';
		pdfStatus = '';
		pdfError = '';
		
		try {
			// Create CV data with metadata (strip model info for final version)
			const cvWithMetadata = {
				...generatedCV,
				metadata: {
					savedAt: new Date().toISOString(),
					version: '1.0.0'
					// Note: modelUsed is intentionally omitted from saved version
				}
			};
			
			const formData = new FormData();
			formData.append('cvData', JSON.stringify(cvWithMetadata));
			formData.append('company', company);
			formData.append('title', title);
			formData.append('createNewVersion', createNewVersion.toString());
			
			const response = await fetch('?/save', {
				method: 'POST',
				body: formData
			});
			
			const data = await response.json();

			// Debug what we actually get from the server
			console.log('Save response debug:', {
				responseOk: response.ok,
				responseStatus: response.status,
				data: data
			});

			if (response.ok && data && data.filename && data.saved) {
				const scoreText = generatedCV?.matchScore ? ` (Match: ${generatedCV.matchScore}/10)` : '';
				const payText = generatedCV?.payScale ? ` (${generatedCV.payScale})` : '';
				const versionText = data.isNewVersion ? ` v${data.versionNumber}` : '';
				saveSuccess = `✅ Version${versionText} saved as versions/${data.filename}${scoreText}${payText}`;

				// Store the slug for the preview link
				savedVersionSlug = data.slug || '';

				// Optionally trigger PDF generation in dev for the saved version
				if (dev && savedVersionSlug) {
					try {
						const pdfRes = await fetch('/dev/api/pdf', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ versions: [savedVersionSlug] })
						});
						const pdfJson = await pdfRes.json().catch(() => ({}));
						if (pdfRes.ok && pdfJson.ok) {
							pdfStatus = `📄 PDF generated in ${pdfJson.duration || '—'}`;
						} else {
							pdfError = pdfJson?.stderr || pdfJson?.error || `PDF generation failed (status ${pdfRes.status})`;
						}
					} catch (e) {
						pdfError = 'PDF generation request failed';
					}
				}

				// Clear success message after 5 seconds
				setTimeout(() => {
					saveSuccess = '';
					savedVersionSlug = '';
					pdfStatus = '';
					pdfError = '';
				}, 5000);
			} else {
				// Prefer explicit server-provided saveError or error
				saveError = (data && (data.saveError || data.error)) ? (data.saveError || data.error) : 'Failed to save version';
			}
		} catch (error) {
			saveError = 'Network error while saving';
		} finally {
			isSaving = false;
		}
	}

	// Regenerate with specific model
	// Preview toggle handler
	function handleTogglePreview() {
		showPreview = !showPreview;
	}
</script>


<svelte:head>
	<title>Generate CV from Job Description</title>
</svelte:head>

<div class="container">
	<header class="mb-8">
		<h1 class="text-3xl font-bold mb-2">CV Generator</h1>
		<div class="flex justify-between items-center">
			<div class="flex items-center gap-3">
				<p class="text-gray-600">Paste a job description to generate a tailored CV</p>
				
				<!-- Primary Model Selector -->
				<ModelDropdown 
					{models}
					{currentModelLabel}
					{formatPricing}
					{modelNameMap}
					{setPrimaryModel}
				/>
				
				<!-- {#if models.length > 0}
					{@const costEstimate = estimateGenerationCost(models[0])}
					{#if costEstimate}
						<span class="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700 border">
							Est: {costEstimate.formatted}
						</span>
					{/if}
				{/if} -->
			</div>
			<div class="flex gap-2">
				<form method="post" action="?/refreshPricing" use:enhance>
					<button
						type="submit"
						class="px-2 py-1 text-sm border rounded-lg hover:bg-gray-50 text-gray-600"
						title="Refresh model pricing from OpenRouter"
					>
						💰🔄
					</button>
				</form>
			</div>
		</div>
	</header>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
		<!-- Left Panel: Job Description Input -->
		<JobDescriptionForm
			bind:jobDescription
			bind:company
			bind:title
			{isGenerating}
			{enabledModelIds}
			onGenerateSubmit={handleSubmit}
		/>

		<!-- Right Panel: Generated CV -->
		<CVPreview
			{generatedCV}
			{generationMetadata}
			{showPreview}
			{saveSuccess}
			{saveError}
			{savedVersionSlug}
			{actionError}
			{isSaving}
			{pdfStatus}
			{pdfError}
			{isGenerating}
			onSaveCV={saveCV}
			onTogglePreview={handleTogglePreview}
			onGenerate={triggerGenerate}
		/>
	</div>
</div>

<style>
	.container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem;
	}
</style>
