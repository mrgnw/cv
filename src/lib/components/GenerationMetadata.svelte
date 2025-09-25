<!-- @component
	Displays generation metadata (filename and timestamp)
	in a consistent format across preview and JSON views
-->
<script lang="ts">
	interface GenerationMetadata {
		modelUsed?: string;
		generatedAt?: string;
	}

	interface Props {
		generationMetadata: GenerationMetadata;
		savePath?: string;
	}

	let { generationMetadata, savePath = '' }: Props = $props();
	
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

{#if generationMetadata}
	<div class="p-3 bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
		<div class="flex items-center gap-4">
			{#if savePath}
				<span class="flex items-center gap-1">
					<span>📄</span>
					<span class="font-mono font-medium text-gray-800">{savePath}</span>
				</span>
			{/if}
			{#if generationMetadata.generatedAt}
				<span>⏰ {formatTimestamp(generationMetadata.generatedAt)}</span>
			{/if}
		</div>
	</div>
{/if}
