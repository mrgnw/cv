<script>
	let { models, currentModelLabel, formatPricing, modelNameMap, setPrimaryModel } = $props();

	let showModelDropdown = $state(false);

	// Handle click outside to close dropdown
	function handleClickOutside(event) {
		const target = event.target;
		if (!target?.closest('.model-dropdown-container')) {
			showModelDropdown = false;
		}
	}

	// Add click handler when component mounts
	$effect(() => {
		if (typeof window !== 'undefined') {
			window.addEventListener('click', handleClickOutside);
			return () => window.removeEventListener('click', handleClickOutside);
		}
	});
</script>

<div class="relative model-dropdown-container">
	<button 
		onclick={() => showModelDropdown = !showModelDropdown}
		class="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700 border hover:bg-gray-200 flex items-center gap-1"
	>
		<span>Model: {currentModelLabel}</span>
		{#if models.length > 0}
			{@const currentModel = models.find(m => modelNameMap[m.id] === currentModelLabel)}
			{@const pricingText = formatPricing(currentModel?.pricing)}
			{#if pricingText}
				<span class="text-green-600">({pricingText}¢)</span>
			{/if}
		{/if}
		<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
			<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
		</svg>
	</button>
	
	{#if showModelDropdown}
		<div class="absolute top-full left-0 mt-1 min-w-64 bg-white border rounded-lg shadow-lg p-1 z-10">
			<div class="p-2 border-b text-xs text-gray-600 font-medium">Primary Model (others are fallbacks)</div>
			{#each models as model, index}
				{#if model.enabled}
					{@const pricingText = formatPricing(model.pricing)}
					<button
						type="button"
						onclick={() => {
							setPrimaryModel(model.id);
							showModelDropdown = false;
						}}
						class="w-full flex justify-between items-start px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer rounded text-left {index === 0 ? 'bg-blue-50 text-blue-700' : ''}"
					>
						<div class="flex-1">
							<div class="font-medium">{model.name}</div>
							{#if pricingText}
								<div class="text-xs text-gray-500">{pricingText} ¢/1K (in/out)</div>
							{/if}
						</div>
						{#if index === 0}
							<span class="text-xs text-blue-600 ml-2">primary</span>
						{/if}
					</button>
				{/if}
			{/each}
		</div>
	{/if}
</div>
