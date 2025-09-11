<script>
	import CV from '$lib/CV.svelte';
	import GenerationMetadata from './GenerationMetadata.svelte';
	
	// Props
	export let generatedCV;
	export let generationMetadata;
	export let showPreview;
	export let saveSuccess;
	export let saveError;
	export let savedVersionSlug;
	export let isSaving;
	export let actionError;
	export let pdfStatus;
	export let pdfError;
	
	// Events
	export let onSaveCV;
	export let onTogglePreview;
</script>

<div class="flex flex-col">
	<div class="flex justify-between items-center mb-4">
		<h2 class="text-xl font-semibold">Generated CV</h2>
		<div class="flex gap-2 items-center">
			{#if generatedCV?.matchScore}
				<div class="flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium"
					class:bg-red-100={generatedCV.matchScore <= 3}
					class:text-red-700={generatedCV.matchScore <= 3}
					class:bg-yellow-100={generatedCV.matchScore > 3 && generatedCV.matchScore <= 6}
					class:text-yellow-700={generatedCV.matchScore > 3 && generatedCV.matchScore <= 6}
					class:bg-green-100={generatedCV.matchScore > 6}
					class:text-green-700={generatedCV.matchScore > 6}
				>
					<span>Match Score:</span>
					<span class="font-bold">{generatedCV.matchScore}/10</span>
				</div>
			{/if}
			{#if generatedCV?.payScale}
				<div class="flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium bg-blue-100 text-blue-700">
					<span>💰 Pay:</span>
					<span class="font-bold">{generatedCV.payScale}</span>
				</div>
			{/if}
			<button
				onclick={onTogglePreview}
				class="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
			>
				{showPreview ? 'Show JSON' : 'Show Preview'}
			</button>
			{#if generatedCV}
				<button
					type="button"
					onclick={onSaveCV}
					disabled={isSaving}
					class="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
				>
					{isSaving ? 'Saving...' : 'Save Version'}
				</button>
			{/if}
		</div>
	</div>

	<div class="flex-1 border border-gray-300 rounded-lg overflow-hidden">
		{#if saveSuccess}
			<div class="p-4 bg-green-50 border-l-4 border-green-500">
				<p class="text-green-700">{saveSuccess}</p>
				{#if savedVersionSlug}
					<a 
						href="/{savedVersionSlug}" 
						class="text-green-600 underline text-sm mt-1 inline-block"
						target="_blank"
					>
						→ View saved version
					</a>
				{/if}
				{#if pdfStatus}
					<div class="text-sm text-green-800 mt-1">{pdfStatus}</div>
				{/if}
			</div>
		{/if}
		
		{#if saveError}
			<div class="p-4 bg-red-50 border-l-4 border-red-500">
				<p class="text-red-700">Error: {saveError}</p>
			</div>
		{/if}

		{#if pdfError}
			<div class="p-4 bg-yellow-50 border-l-4 border-yellow-500">
				<p class="text-yellow-800">PDF: {pdfError}</p>
			</div>
		{/if}
		
		{#if actionError}
			<div class="p-4 bg-red-50 border-l-4 border-red-500">
				<p class="text-red-700">Error: {actionError}</p>
			</div>
		{:else if generatedCV}
			{#if showPreview}
				<div class="h-full overflow-auto">
					<GenerationMetadata {generationMetadata} />
					
					<div class="p-4 bg-white">
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
				</div>
			{:else}
				<div class="h-full overflow-auto">
					<GenerationMetadata {generationMetadata} />
					
					<pre class="overflow-auto p-4 bg-gray-50 text-sm">
{JSON.stringify(generatedCV, null, 2)}
					</pre>
				</div>
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
