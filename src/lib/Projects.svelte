<script>
	import { browser } from '$app/environment';

	let { projects } = $props();

	const isPrinting = browser && new URLSearchParams(window.location.search).has('print');
</script>

{#if projects?.length}
	<section class="mb-4" class:print-projects={isPrinting}>
		<div class="space-y-1">
			{#each projects as { name, url, description, skills }, i}
				<div class="flex justify-between items-baseline project-item" data-index={i + 1}>
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
					{#if skills}
						<div class="text-xs text-muted-foreground whitespace-nowrap ml-4">
							{skills.join(' · ')}
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

		.print-projects {
			/* More compact spacing for print */
			font-size: 10pt;
			line-height: 1.3;
		}

		/* Priority-based project limiting */
		.project-item:nth-child(n+5) {
			display: none; /* Max 4 projects by default */
		}

		/* Hide lower priority projects first */
		.print-projects.compact .project-item:nth-child(n+3) {
			display: none; /* Max 2 projects in compact mode */
		}

		.print-projects.minimal .project-item:nth-child(n+2) {
			display: none; /* Max 1 project in minimal mode */
		}
	}
</style>
