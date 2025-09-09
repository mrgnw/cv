<script lang="ts">
	import { intervalToDuration, formatDuration, format } from "date-fns";
	import { fade } from "svelte/transition";
	import { browser } from '$app/environment';

	let { experience, highlightedSkill = "" } = $props();

	const isPrinting = browser && new URLSearchParams(window.location.search).has('print');

	function calculateDuration(start: string, end?: string): string {
		const startDate = new Date(start);
		const endDate = end ? new Date(end) : new Date();
		const duration = intervalToDuration({ start: startDate, end: endDate });
		return formatDuration(duration, {
			format: ["years", "months"],
			zero: false,
			delimiter: " and ",
		});
	}

	function formatDate(date: string): string {
		return format(new Date(date), "MMM yyyy");
	}
</script>

<section class="mb-8">
	{#each experience as exp}
		<div class="mb-4 print:mb-3">
			<div class="flex flex-col sm:flex-row justify-between gap-4 print:gap-2">
				<div class="flex-1">
					<h3 class="text-xl font-semibold">
						{exp.title}
					</h3>
					{#if exp.skills}
						<div class="flex flex-wrap gap-1">
							{#each exp.skills as tech, i}
								<span
									class="text-xs text-muted-foreground"
									class:text-blue-500={highlightedSkill === tech}
									class:active={tech === highlightedSkill}
								>
									{tech}{i < exp.skills.length - 1 ? ' • ' : ''}
								</span>
							{/each}
						</div>
					{/if}
				</div>
				
				<div class="text-right">
					<p class="text-muted-foreground mb-1">
						{exp.company}
					</p>
					<p class="text-xs text-muted-foreground">
						{formatDate(exp.start)} - {exp.end ? formatDate(exp.end) : "Present"}
					</p>
				</div>
			</div>
			{#each exp.accomplishments as paragraph}
				<p class="mb-2 mt-1 print:mb-1.5 print:mt-0.5">{paragraph}</p>
			{/each}
		</div>
	{/each}
</section>

<style>
	/*
	.period {
		position: relative;
		display: inline-block;
		cursor: pointer;
		white-space: nowrap;
	}

	.default-text,
	.hover-text {
		display: inline-block;
		transition: opacity 0.3s ease;
	}

	.hover-text {
		opacity: 0;
		position: absolute;
		left: 0;
	}

	.period:hover .default-text {
		opacity: 0;
	}

	.period:hover .hover-text {
		opacity: 1;
	}

	.stack {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}
	*/
</style>
