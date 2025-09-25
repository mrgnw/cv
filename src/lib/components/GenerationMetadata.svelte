<!-- @component
	Displays generation metadata (filename and timestamp)
	in a consistent format across preview and JSON views
-->
<script lang="ts">
	import Icon from '@iconify/svelte';

	interface GenerationMetadata {
		modelUsed?: string;
		generatedAt?: string;
	}

	interface Props {
		generationMetadata: GenerationMetadata;
		savePath?: string;
		isSaving?: boolean;
		onSaveCV?: (createNewVersion?: boolean) => Promise<void>;
	}

	let { generationMetadata, savePath = '', isSaving = false, onSaveCV }: Props = $props();
	
	let showVersionOptions = $state(false);
	
	// Close dropdowns when clicking outside
	function handleClickOutside(event: Event) {
		const target = event.target as HTMLElement;
		if (!target?.closest('.relative')) {
			showVersionOptions = false;
		}
	}
	
	/**
	 * Format timestamp to YYYY-MM-DD HH:MM:SS format
	 */
	function formatTimestamp(isoString: string): string {
		return new Date(isoString).toLocaleString('sv-SE', { 
			year: 'numeric', 
			month: '2-digit', 
			day: '2-digit', 
			hour: '2-digit', 
			minute: '2-digit', 
			second: '2-digit' 
		}).replace('T', ' ');
	}
</script>

<svelte:window on:click={handleClickOutside} />

{#if generationMetadata}
	<div class="p-3 bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
		<div class="flex items-center gap-4">
			{#if savePath}
				<div class="relative flex items-center gap-1">
					<button
						type="button"
						onclick={() => showVersionOptions = !showVersionOptions}
						disabled={isSaving}
						class="flex items-center gap-1 hover:bg-gray-100 rounded px-1 py-0.5 -mx-1 disabled:opacity-50 disabled:cursor-not-allowed"
						title={isSaving ? 'Saving...' : 'Save CV'}
					>
						{#if isSaving}
							<Icon icon="material-symbols:hourglass-top" class="w-4 h-4 text-gray-600 animate-spin" />
						{:else}
							<Icon icon="material-symbols:save" class="w-4 h-4 text-gray-600" />
						{/if}
						<span class="font-mono font-medium text-gray-800">{savePath}</span>
					</button>
					
					{#if showVersionOptions && onSaveCV}
						<div class="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-48">
							<button
								type="button"
								onclick={async (e) => {
									e.preventDefault();
									e.stopPropagation();
									if (onSaveCV) {
										try {
											await onSaveCV(false);
										} catch (error) {
											console.error('Save error:', error);
										}
									}
									showVersionOptions = false;
								}}
								disabled={isSaving}
								class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								💾 Save as Latest Version
								<div class="text-xs text-gray-500">Overwrites previous version</div>
							</button>
							<button
								type="button"
								onclick={async (e) => {
									e.preventDefault();
									e.stopPropagation();
									if (onSaveCV) {
										try {
											await onSaveCV(true);
										} catch (error) {
											console.error('Save error:', error);
										}
									}
									showVersionOptions = false;
								}}
								disabled={isSaving}
								class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed border-t"
							>
								📑 Save as New Version
								<div class="text-xs text-gray-500">Keeps both versions</div>
							</button>
						</div>
					{/if}
				</div>
			{/if}
			{#if generationMetadata.generatedAt}
				<span>⏰ {formatTimestamp(generationMetadata.generatedAt)}</span>
			{/if}
		</div>
	</div>
{/if}
