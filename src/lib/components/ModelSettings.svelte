<!-- @component
	Model settings panel for configuring AI model priority order
-->
<script>
	/** @type {Array<{id: string, name: string, enabled: boolean}>} */
	export let models;
	
	/** @type {(models: Array<{id: string, name: string, enabled: boolean}>) => void} */
	export let onModelsChange;
	
	let draggedIndex = null;
	
	/**
	 * @param {DragEvent} event
	 * @param {number} index
	 */
	function handleDragStart(event, index) {
		draggedIndex = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
		}
	}
	
	/**
	 * @param {DragEvent} event
	 */
	function handleDragOver(event) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
	}
	
	/**
	 * @param {DragEvent} event
	 * @param {number} dropIndex
	 */
	function handleDrop(event, dropIndex) {
		event.preventDefault();
		if (draggedIndex === null || draggedIndex === dropIndex) return;
		
		const draggedModel = models[draggedIndex];
		const newModels = [...models];
		newModels.splice(draggedIndex, 1);
		newModels.splice(dropIndex, 0, draggedModel);
		onModelsChange(newModels);
		draggedIndex = null;
	}
	
	/**
	 * @param {number} index
	 */
	function toggleModel(index) {
		const newModels = [...models];
		newModels[index].enabled = !newModels[index].enabled;
		onModelsChange(newModels);
	}
</script>

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
				role="button"
				tabindex="0"
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
