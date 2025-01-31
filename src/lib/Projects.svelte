<script>
	let { projects } = $props();
</script>

{#if projects?.length}
	<section class="mb-4">
		<div class="space-y-1">
			{#each projects as { name, url, description, stack }}
				<div class="flex justify-between items-baseline">
					<div class="flex gap-3 items-baseline">
						<a 
							href={url} 
							target="_blank" 
							rel="noopener noreferrer"
							class="font-medium min-w-[100px] hover:text-blue-600 transition-colors"
						>
							{name}
						</a>
						<span class="text-muted-foreground text-sm">{description}</span>
					</div>
					{#if stack}
						<div class="text-xs text-muted-foreground whitespace-nowrap ml-4">
							{stack.join(' · ')}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</section>
{:else}
	<div class="text-red-500">
		No projects found. projects array is: {JSON.stringify(projects)}
	</div>
{/if}

<style>
	@media print {
		a {
			text-decoration: none;
			color: inherit;
		}
	}
</style> 