<script lang="ts">
// @ts-nocheck
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	
	// Props
	export let jobDescription: string = '';
	export let company: string = '';
	export let title: string = '';
	export let enabledModelIds: string[] = [];
	export let isGenerating: boolean = false;
	// Parent supplies an enhance handler factory (handleSubmit) returning a SubmitFunction
	export let onGenerateSubmit: (() => any) | undefined; // factory returning enhance pre-submit
	
	let form: HTMLFormElement;
	let jobTextarea: HTMLTextAreaElement | null = null;
	let jobLen = 0;

	// We no longer auto-generate while the user is typing.
	// However, if they paste a large job description, we can trigger generation automatically once.
	let lastPasteAt: number | null = null;
	let pasteTriggered = false;

	function handleInput() {
		// Update length from DOM so enablement reflects real content
		jobLen = jobTextarea?.value.length ?? jobDescription?.length ?? 0;
	}

	function handlePaste() {
		lastPasteAt = Date.now();
		pasteTriggered = false;
		// Give the paste a short delay for the textarea value to update fully
		setTimeout(() => {
			jobLen = jobTextarea?.value.length ?? jobDescription?.length ?? 0;
			if (!pasteTriggered && jobLen >= 50 && !isGenerating) {
				const formEl = document.getElementById('generate-form') as HTMLFormElement | null;
				const autoBtn = document.getElementById('auto-submit') as HTMLButtonElement | null;
				if (formEl && typeof formEl.requestSubmit === 'function') {
					pasteTriggered = true;
					if (autoBtn) {
						formEl.requestSubmit(autoBtn);
					} else {
						formEl.requestSubmit();
					}
				}
			}
		}, 250);
	}
	
	// Use parent's enhance submit if provided; otherwise default enhance behavior (no param)
	let enhanceHandler: any;
	$: enhanceHandler = onGenerateSubmit ? onGenerateSubmit() : undefined;

	// Keep jobLen in sync with current value (must be at top level)
	$: jobLen = jobTextarea?.value?.length ?? (jobDescription?.length ?? 0);

	onMount(() => {
		jobLen = jobTextarea?.value?.length ?? (jobDescription?.length ?? 0);
	});
</script>

<div class="flex flex-col h-full">
	<div class="flex justify-between items-center mb-4">
		<h2 class="text-xl font-semibold">Job Description</h2>
		<div class="flex gap-4">
			<div class="flex items-center gap-3">
				<span class="text-xs text-gray-500 tabular-nums">
					{jobLen} chars
				</span>
				{#if isGenerating}
					<span class="text-sm text-blue-600 animate-pulse">Generating...</span>
				{:else}
					<button
						type="submit"
						form="generate-form"
						class="text-sm px-3 py-1 rounded font-medium transition-colors
							{jobLen < 50
								? 'bg-gray-200 text-gray-500 cursor-not-allowed'
								: 'bg-blue-600 text-white hover:bg-blue-700'}"
						disabled={jobLen < 50}
						title={jobLen < 50 ? 'Paste at least 50 characters to enable generation' : 'Generate tailored CV'}
					>
						Generate
					</button>
				{/if}
			</div>
		</div>
	</div>
	
	<form 
		id="generate-form"
		method="POST" 
		action="?/generate"
		use:enhance={enhanceHandler}
		class="flex-1 flex flex-col"
	>
		<!-- Hidden always-enabled submit for programmatic submits -->
		<button id="auto-submit" type="submit" class="hidden" aria-hidden="true" tabindex="-1">Submit</button>
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
			on:input={handleInput}
			on:paste={handlePaste}
			placeholder="Paste the job description here..."
			class="w-full p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-64 lg:flex-1 lg:h-auto lg:min-h-0 overflow-auto leading-relaxed text-sm"
			disabled={isGenerating}
			bind:this={jobTextarea}
		></textarea>
		
		<!-- Hidden field to send model order -->
		<input type="hidden" name="modelOrder" value={JSON.stringify(enabledModelIds)} />
	</form>
</div>
