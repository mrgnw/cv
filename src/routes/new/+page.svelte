<script>
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import CV from '$lib/CV.svelte';
	
	/** @type {import('./$types').PageProps} */
	let { data, form } = $props();
	
	let jobDescription = $state('');
	let isGenerating = $state(false);
	let generatedCV = $state(null);
	let showPreview = $state(true);
	
	// Form submission handler
	function handleSubmit() {
		return async ({ result, update }) => {
			isGenerating = false;
			
			if (result.type === 'success') {
				generatedCV = result.data?.cv;
			}
			
			await update();
		};
	}
	
	// Auto-generate when job description changes (debounced)
	let generateTimeout = $state(null);
	$effect(() => {
		if (jobDescription.length > 50) {
			if (generateTimeout) clearTimeout(generateTimeout);
			generateTimeout = setTimeout(() => {
				if (!isGenerating) {
					// Trigger form submission programmatically
					const form = document.getElementById('generate-form');
					if (form) {
						isGenerating = true;
						form.requestSubmit();
					}
				}
			}, 1000);
		}
	});
</script>

<svelte:head>
	<title>Generate CV from Job Description</title>
</svelte:head>

<div class="container">
	<header class="mb-8">
		<h1 class="text-3xl font-bold mb-2">CV Generator</h1>
		<p class="text-gray-600">Paste a job description to generate a tailored CV</p>
	</header>

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
					placeholder="Paste the job description here..."
					class="flex-1 w-full p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					disabled={isGenerating}
				></textarea>
				
				<div class="mt-4 flex gap-4">
					<input
						type="text"
						name="company"
						placeholder="Company name (optional)"
						class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
					<input
						type="text"
						name="title"
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
						<form method="POST" action="?/save" class="inline">
							<input type="hidden" name="cvData" value={JSON.stringify(generatedCV)} />
							<input type="hidden" name="company" value={form?.company || ''} />
							<input type="hidden" name="title" value={form?.title || ''} />
							<button
								type="submit"
								class="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
							>
								Save Version
							</button>
						</form>
					{/if}
				</div>
			</div>

			<div class="flex-1 border border-gray-300 rounded-lg overflow-hidden">
				{#if form?.error}
					<div class="p-4 bg-red-50 border-l-4 border-red-500">
						<p class="text-red-700">Error: {form.error}</p>
					</div>
				{:else if generatedCV}
					{#if showPreview}
						<div class="h-full overflow-auto p-4 bg-white">
							<CV cv={generatedCV} />
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
