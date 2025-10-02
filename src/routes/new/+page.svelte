<script>
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { dev } from '$app/environment';

	import ModelDropdown from '$lib/components/ModelDropdown.svelte';
	import JobDescriptionForm from '$lib/components/JobDescriptionForm.svelte';
	import CVPreview from '$lib/components/CVPreview.svelte';
	import { getEnabledModelIds } from '$lib/utils/format.js';
	
	// Receive server-side data using Svelte 5 $props
	let { data } = $props();
	
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
	
	// Debug mode
	let debugMode = $state(true);
    function toggleDebugMode() {
    debugMode = !debugMode;
    
    if (debugMode && !generatedCV) {
        generatedCV = debugCVData;
        generationMetadata = {
            modelUsed: "debug-mode",
            generatedAt: new Date().toISOString()
        };
        company = debugCVData.company;
        title = debugCVData.title;
        jobDescription = "Debug mode: Sample job description for Full Stack Software Engineer position at TechCorp. Looking for someone with React, Node.js, and cloud experience.";
    } else if (!debugMode && generationMetadata?.modelUsed === "debug-mode") {
        // Clear debug data when debug mode is turned off
        generatedCV = null;
        generationMetadata = null;
        company = '';
        title = '';
        jobDescription = '';
        // Don't clear save-related state to avoid navigation issues
    }
}
	
	// Debug CV data for testing save functionality
	const debugCVData = {
		title: "Full Stack Software Engineer",
		company: "TechCorp",
		matchScore: 8,
		payScale: "$120,000 - $150,000",
		normalizedTitle: "software-engineer-full-stack",
		projects: [
			{
				name: "Real-time Analytics Dashboard",
				description: "Built a high-performance dashboard processing 1M+ events/day using React, Node.js, and WebSocket connections",
				url: "https://github.com/example/analytics-dashboard",
				localized_name: "Analytics Dashboard"
			},
			{
				name: "Microservices Architecture",
				description: "Designed and implemented scalable microservices using Docker, Kubernetes, and gRPC",
				url: "https://github.com/example/microservices",
				localized_name: "Microservices Platform"
			}
		],
		experience: [
			{
				title: "Senior Software Engineer",
				company: "Previous Corp",
				start: "2022-01-01",
				end: null,
				achievements: [
					"Led development of core platform features serving 100k+ users",
					"Reduced API response times by 40% through optimization",
					"Mentored 3 junior developers"
				]
			}
		],
		skills: ["JavaScript", "TypeScript", "React", "Node.js", "PostgreSQL", "AWS", "Docker"],
		education: [
			{
				provider: "University of Technology",
				degree: "Computer Science",
				year: "2020",
				summary: "B.S. in Computer Science with focus on software engineering"
			}
		]
	};
	
	
	
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
		// This outer function runs immediately before the request is sent
		return ({ formElement, formData, action, cancel, submitter }) => {
			// Prevent parallel submissions (optional: could cancel previous instead)
			if (isGenerating) {
				cancel();
				return;
			}
			isGenerating = true;
			actionError = '';
			// Return the post-submission handler
			return async ({ result, update }) => {
				try {
					if (result.type === 'success') {
						generatedCV = result.data?.cv;
						generationMetadata = {
							modelUsed: result.data?.modelUsed,
							generatedAt: result.data?.generatedAt
						};
						actionError = '';
						// Auto-populate company/title if suggested and empty
						if (generatedCV?.company && !company.trim()) company = generatedCV.company;
						if (generatedCV?.title && !title.trim()) title = generatedCV.title;
					} else if (result.type === 'failure') {
						actionError = result.data?.error || 'Generation failed';
					}
				} finally {
					isGenerating = false; // Always reset
				}
				await update();
			};
		};
	}

	// URL extraction handler
	// Save CV function with versioning support
	async function saveCV(createNewVersion = false) {
    if (!generatedCV || isSaving) return;
    
    isSaving = true;
    saveSuccess = '';
    saveError = '';
    
    try {
        console.log('Starting save...');
        
        const response = await fetch('/api/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cvData: {
                    ...generatedCV,
                    metadata: {
                        savedAt: new Date().toISOString(),
                        version: '1.0.0'
                    }
                },
                company,
                title,
                createNewVersion
            })
        });
        
        console.log('Response received:', response.status, response.ok);
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok) {
            const scoreText = generatedCV?.matchScore ? ` (Match: ${generatedCV.matchScore}/10)` : '';
            const payText = generatedCV?.payScale ? ` (${generatedCV.payScale})` : '';
            const versionText = data.isNewVersion ? ` v${data.versionNumber}` : '';
            saveSuccess = `✅ Version${versionText} saved as versions/${data.filename}${scoreText}${payText}`;
        } else {
            saveError = `❌ Save failed with status ${response.status}: ${data.error || 'Unknown error'}`;
        }
    } catch (err) {
        console.error('Save error:', err);
        saveError = `❌ Network error: ${err.message}`;
    } finally {
        isSaving = false;
        console.log('Save operation completed');
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
				
				<!-- Debug Mode Toggle -->
				<label class="flex items-center gap-2 px-3 py-1 rounded-lg border transition-colors"
					class:bg-yellow-50={debugMode}
					class:border-yellow-200={debugMode}
					class:bg-gray-50={!debugMode}
					class:border-gray-200={!debugMode}
				>
					<input
						type="checkbox"
						checked={debugMode}
						onchange={toggleDebugMode}
						class="w-4 h-4"
					/>
					<span class="text-sm font-medium"
						class:text-yellow-800={debugMode}
						class:text-gray-600={!debugMode}
					>
						Debug Mode
						{#if debugMode}
							<span class="text-xs">(Active)</span>
						{/if}
					</span>
				</label>
				
				<!-- Primary Model Selector -->
				<ModelDropdown 
					{models}
					{currentModelLabel
                    }
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
			{enabledModelIds}
			bind:isGenerating
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
			{pdfStatus}
			{pdfError}
			onSaveCV={saveCV}
			onTogglePreview={handleTogglePreview}
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
