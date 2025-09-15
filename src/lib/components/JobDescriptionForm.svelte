<script>
	import { enhance } from '$app/forms';
	
	// Props
	export let jobDescription;
	export let company;
	export let title;
	export let isGenerating;
	export let enabledModelIds;
	
	// Events
	export let onGenerateSubmit;
	
	// Auto-generate when job description changes (debounced)
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
			</div>
		</div>
	</div>
	
	<form 
		id="generate-form"
		method="POST" 
		action="?/generate"
		use:enhance={onGenerateSubmit}
		class="flex-1 flex flex-col"
	>
		<!-- Company and Job Title fields (moved above textarea) -->
		<div class="mb-4 flex gap-4">
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
		
		<textarea
			name="jobDescription"
			bind:value={jobDescription}
			oninput={handleInput}
			placeholder="Paste the job description here..."
			class="flex-1 w-full p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			disabled={isGenerating}
		></textarea>
		
		<!-- Hidden field to send model order -->
		<input type="hidden" name="modelOrder" value={JSON.stringify(enabledModelIds)} />
		
		<button
			type="submit"
			disabled={isGenerating || jobDescription.length < 50}
			class="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
		>
			{isGenerating ? 'Generating...' : 'Generate CV'}
		</button>
	</form>
</div>
