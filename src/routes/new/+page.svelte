<script>
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import CV from '$lib/CV.svelte';
	
	/** @type {import('./$types').PageProps} */
	let { data, form } = $props();
	
	let jobDescription = $state('');
	let company = $state('');
	let title = $state('');
	let isGenerating = $state(false);
	let generatedCV = $state(null);
	let showPreview = $state(true);
	let saveSuccess = $state('');
	let saveError = $state('');
	let showModelSettings = $state(false);
	
	// Model prioritization
	let models = $state([
		{ id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', enabled: true },
		{ id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini', enabled: true },
		{ id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', enabled: true },
		{ id: 'openai/gpt-5', name: 'GPT-5', enabled: true },
		{ id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', enabled: true }
	]);
	
	let draggedIndex = $state(null);
	
	function handleDragStart(event, index) {
		draggedIndex = index;
		event.dataTransfer.effectAllowed = 'move';
	}
	
	function handleDragOver(event) {
		event.preventDefault();
		event.dataTransfer.dropEffect = 'move';
	}
	
	function handleDrop(event, dropIndex) {
		event.preventDefault();
		if (draggedIndex === null || draggedIndex === dropIndex) return;
		
		const draggedModel = models[draggedIndex];
		const newModels = [...models];
		newModels.splice(draggedIndex, 1);
		newModels.splice(dropIndex, 0, draggedModel);
		models = newModels;
		draggedIndex = null;
	}
	
	function toggleModel(index) {
		models[index].enabled = !models[index].enabled;
	}
	
	// Form submission handler
	function handleSubmit() {
		return async ({ result, update }) => {
			isGenerating = false;
			
			if (result.type === 'success') {
				generatedCV = result.data?.cv;
				
				// Auto-populate company and title if suggested by LLM and fields are empty
				if (generatedCV?.company && !company.trim()) {
					company = generatedCV.company;
				}
				if (generatedCV?.title && !title.trim()) {
					title = generatedCV.title;
				}
			}
			
			// Don't call update() to preserve form values
			// await update();
		};
	}
	
	// Auto-generate when job description changes (debounced) or on paste
	let generateTimeout;
	
	function triggerGeneration() {
		if (jobDescription.length > 50 && !isGenerating) {
			const form = document.getElementById('generate-form');
			if (form) {
				isGenerating = true;
				form.requestSubmit();
			}
		}
	}
	
	// Handle input changes with debouncing
	function handleInput() {
		if (generateTimeout) clearTimeout(generateTimeout);
		if (jobDescription.length > 50) {
			generateTimeout = setTimeout(() => {
				triggerGeneration();
			}, 1000);
		}
	}
	
	// Generate immediately on paste
	function handlePaste() {
		// Small delay to let the paste content be processed
		setTimeout(() => {
			if (jobDescription.length > 50) {
				triggerGeneration();
			}
		}, 100);
	}
</script>

<svelte:head>
	<title>Generate CV from Job Description</title>
</svelte:head>

<div class="container">
	<header class="mb-8">
		<h1 class="text-3xl font-bold mb-2">CV Generator</h1>
		<div class="flex justify-between items-center">
			<p class="text-gray-600">Paste a job description to generate a tailored CV</p>
			<button
				onclick={() => showModelSettings = !showModelSettings}
				class="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
			>
				⚙️ Model Settings
			</button>
		</div>
	</header>

	{#if showModelSettings}
		<div class="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
			<h3 class="text-lg font-semibold mb-3">AI Model Priority Order</h3>
			<p class="text-sm text-gray-600 mb-4">Drag to reorder. First enabled model will be tried first, then fallback to next enabled models.</p>
			
			<div class="space-y-2">
				{#each models as model, index}
					<div
						draggable="true"
						ondragstart={(e) => handleDragStart(e, index)}
						ondragover={handleDragOver}
						ondrop={(e) => handleDrop(e, index)}
						class="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-move hover:shadow-sm transition-shadow"
						class:opacity-50={!model.enabled}
					>
						<div class="flex items-center gap-2 text-gray-400">
							<span class="text-xs font-mono">{index + 1}</span>
							<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
								<path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
							</svg>
						</div>
						
						<div class="flex-1">
							<span class="font-medium" class:text-gray-400={!model.enabled}>
								{model.name}
							</span>
							<div class="text-xs text-gray-500 font-mono">{model.id}</div>
						</div>
						
						<label class="flex items-center cursor-pointer">
							<input
								type="checkbox"
								bind:checked={model.enabled}
								onclick={() => toggleModel(index)}
								class="sr-only"
							/>
							<div class="relative">
								<div class="w-10 h-6 bg-gray-200 rounded-full shadow-inner transition-colors duration-200"
									class:bg-blue-500={model.enabled}>
								</div>
								<div class="absolute w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 top-1 left-1"
									class:translate-x-4={model.enabled}>
								</div>
							</div>
						</label>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
		<!-- Left Panel: Job Description Input -->
		<div class="flex flex-col">
			<div class="flex justify-between items-center mb-4">
				<h2 class="text-xl font-semibold">Job Description</h2>
				<div class="flex gap-2">
					<span class="text-sm text-gray-500">
						{jobDescription.length} characters
					</span>
					{#if isGenerating}
						<span class="text-sm text-blue-600 animate-pulse">Generating...</span>
					{/if}
				</div>
			</div>
			
			<form 
				id="generate-form"
				method="POST" 
				action="?/generate"
				use:enhance={handleSubmit}
				class="flex-1 flex flex-col"
			>
				<textarea
					name="jobDescription"
					bind:value={jobDescription}
					oninput={handleInput}
					onpaste={handlePaste}
					placeholder="Paste the job description here..."
					class="flex-1 w-full p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					disabled={isGenerating}
				></textarea>
				
				<div class="mt-4 flex gap-4">
					<input
						type="text"
						name="company"
						bind:value={company}
						placeholder="Company name (optional)"
						class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
					<input
						type="text"
						name="title"
						bind:value={title}
						placeholder="Job title (optional)"
						class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				</div>
				
				<button
					type="submit"
					disabled={isGenerating || jobDescription.length < 50}
					class="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
				>
					{isGenerating ? 'Generating...' : 'Generate CV'}
				</button>
			</form>
		</div>

		<!-- Right Panel: Generated CV -->
		<div class="flex flex-col">
			<div class="flex justify-between items-center mb-4">
				<h2 class="text-xl font-semibold">Generated CV</h2>
				<div class="flex gap-2">
					<button
						onclick={() => showPreview = !showPreview}
						class="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
					>
						{showPreview ? 'Show JSON' : 'Show Preview'}
					</button>
					{#if generatedCV}
						<button
							type="button"
							onclick={async () => {
								const formData = new FormData();
								formData.append('cvData', JSON.stringify(generatedCV));
								formData.append('company', company);
								formData.append('title', title);
								
								try {
									const response = await fetch('?/save', {
										method: 'POST',
										body: formData
									});
									const result = await response.json();
									
									if (result.type === 'success') {
										saveSuccess = `✅ Version saved as versions/${result.data?.filename}`;
										saveError = '';
										setTimeout(() => { saveSuccess = ''; }, 5000);
									} else {
										saveError = result.data?.error || 'Failed to save version';
										saveSuccess = '';
									}
								} catch (error) {
									saveError = 'Network error while saving';
									saveSuccess = '';
								}
							}}
							class="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
						>
							Save Version
						</button>
					{/if}
				</div>
			</div>

			<div class="flex-1 border border-gray-300 rounded-lg overflow-hidden">
				{#if saveSuccess}
					<div class="p-4 bg-green-50 border-l-4 border-green-500">
						<p class="text-green-700">{saveSuccess}</p>
						{#if saveSuccess.includes('versions/')}
							{@const pathMatch = saveSuccess.match(/versions\/(.+)\.json5/)}
							{#if pathMatch}
								{@const pathParts = pathMatch[1].split('/')}
								{@const slug = pathParts.join('-')}
								<a 
									href="/{slug}" 
									class="text-green-600 underline text-sm mt-1 inline-block"
									target="_blank"
								>
									→ View saved version
								</a>
							{/if}
						{/if}
					</div>
				{/if}
				
				{#if saveError}
					<div class="p-4 bg-red-50 border-l-4 border-red-500">
						<p class="text-red-700">Error: {saveError}</p>
					</div>
				{/if}
				
				{#if form?.error}
					<div class="p-4 bg-red-50 border-l-4 border-red-500">
						<p class="text-red-700">Error: {form.error}</p>
					</div>
				{:else if generatedCV}
					{#if showPreview}
						<div class="h-full overflow-auto p-4 bg-white">
							<CV 
								name="Morgan Williams"
								title={generatedCV.title || "Software Engineer"}
								email="morganfwilliams@me.com"
								github="https://github.com/mrgnw"
								pdfLink="/morgan-williams-cv"
								resolvedProjects={generatedCV.projects || []}
								experience={generatedCV.experience || []}
								skills={generatedCV.skills || []}
								education={generatedCV.education || []}
								variant="modern"
							/>
						</div>
					{:else}
						<pre class="h-full overflow-auto p-4 bg-gray-50 text-sm">
{JSON.stringify(generatedCV, null, 2)}
						</pre>
					{/if}
				{:else}
					<div class="h-full flex items-center justify-center text-gray-500">
						<div class="text-center">
							<p class="mb-2">Your generated CV will appear here</p>
							<p class="text-sm">Paste a job description to get started</p>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem;
	}
</style>
