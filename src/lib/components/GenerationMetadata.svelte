<!-- @component
	Displays generation metadata (model used and timestamp)
	in a consistent format across preview and JSON views
-->
<script>
	/** @type {{ modelUsed?: string, generatedAt?: string }} */
	export let generationMetadata;
	
	/**
	 * Format timestamp to YYYY-MM-DD HH:MM:SS format
	 * @param {string} isoString
	 */
	function formatTimestamp(isoString) {
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

{#if generationMetadata}
	<div class="p-3 bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
		<div class="flex items-center gap-4">
			{#if generationMetadata.modelUsed}
				<span>🤖 Generated with <strong>{generationMetadata.modelUsed}</strong></span>
			{/if}
			{#if generationMetadata.generatedAt}
				<span>⏰ {formatTimestamp(generationMetadata.generatedAt)}</span>
			{/if}
		</div>
	</div>
{/if}
