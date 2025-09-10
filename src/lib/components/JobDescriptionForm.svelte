<script>
	import { enhance } from '$app/forms';
	
	// Props
	export let jobDescription;
	export let jobUrl;
	export let company;
	export let title;
	export let isGenerating;
	export let isExtracting;
	export let extractError;
	export let extractSuccess;
	export let enabledModelIds;
	
	// Events
	export let onGenerateSubmit;
	export let onUrlExtraction;
	export let onInput;
	export let onPaste;
	
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
		if (onInput) onInput();
	}
	
	// Generate immediately on paste
	function handlePaste() {
		// Small delay to let the paste content be processed
		setTimeout(() => {
			if (jobDescription.length > 50) {
				triggerGeneration();
			}
		}, 100);
		if (onPaste) onPaste();
	}
</script>

<div class="flex flex-col">
	<div class="flex justify-between items-center mb-4">
		<h2 class="text-xl font-semibold">Job Description</h2>
		<div class="flex gap-4">
			<div class="flex gap-2">
				<span class="text-sm text-gray-500">
					{jobDescription.length} characters
				</span>
				{#if isGenerating}
					<span class="text-sm text-blue-600 animate-pulse">Generating...</span>
				{/if}
				{#if isExtracting}
					<span class="text-sm text-purple-600 animate-pulse">Extracting...</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- URL Extraction Form -->
	<form 
		method="POST" 
		action="?/extractFromUrl"
		use:enhance={onUrlExtraction}
		class="mb-4"
	>
		<div class="flex gap-2">
			<input
				type="url"
				name="url"
				bind:value={jobUrl}
				placeholder="Or paste job posting URL (LinkedIn, Indeed, etc.) - 15s timeout"
				class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
				disabled={isExtracting}
			/>
			<button
				type="submit"
				onclick={() => isExtracting = true}
				disabled={isExtracting || !jobUrl.trim()}
				class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm whitespace-nowrap"
			>
				{isExtracting ? 'Extracting...' : 'Extract'}
			</button>
		</div>
		{#if extractSuccess}
			<div class="text-green-600 text-sm mt-2 p-2 bg-green-50 rounded border-l-4 border-green-500">
				{extractSuccess}
			</div>
		{/if}
		{#if extractError}
			<div class="text-red-600 text-sm mt-2 p-2 bg-red-50 rounded border-l-4 border-red-500">
				<strong>Extraction failed:</strong> {extractError}
				{#if extractError.includes('timed out')}
					<div class="text-xs mt-1 text-red-500">
						Try copying the job description text manually instead.
					</div>
				{/if}
			</div>
		{/if}
	</form>
	
	<form 
		id="generate-form"
		method="POST" 
		action="?/generate"
		use:enhance={onGenerateSubmit}
		class="flex-1 flex flex-col"
	>
		<textarea
			name="jobDescription"
			bind:value={jobDescription}
			oninput={handleInput}
			onpaste={handlePaste}
			placeholder="Paste the job description here, or use the URL extractor above..."
			class="flex-1 w-full p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			disabled={isGenerating}
		></textarea>
		
		<!-- Hidden field to send model order -->
		<input type="hidden" name="modelOrder" value={JSON.stringify(enabledModelIds)} />
		
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
