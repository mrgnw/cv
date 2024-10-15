<script lang="ts">
	import { intervalToDuration, formatDuration, format } from "date-fns";
	import { fade } from "svelte/transition";

	let { experience, highlightedSkill = "" } = $props();

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
	<h2 class="text-2xl font-semibold mb-4">Experience</h2>
	{#each experience as exp}
		<div class="mb-8">
			<div class="flex flex-col sm:flex-row justify-between gap-4">
				<div class="flex-1">
					<h3 class="text-xl font-semibold">
						{exp.title}
					</h3>
					<p class="text-muted-foreground">
						{exp.company} - 
						<span class="period">
							<span class="default-text" in:fade out:fade>{calculateDuration(exp.start, exp.end)}</span>
							<span class="hover-text" in:fade out:fade>{formatDate(exp.start)} - {exp.end ? formatDate(exp.end) : "Present"}</span>
						</span>
					</p>
				</div>
				{#if exp.stack}
					<div class="flex flex-wrap gap-1 justify-end sm:max-w-[50%]">
						{#each exp.stack as tech, i}
							<span
								class="text-xs text-muted-foreground"
								class:text-blue-500={highlightedSkill === tech}
								class:active={tech === highlightedSkill}
							>
								{tech}{i < exp.stack.length - 1 ? ' • ' : ''}
							</span>
						{/each}
					</div>
				{/if}
			</div>
			{#each exp.description as paragraph}
				<p class="mb-2">{paragraph}</p>
			{/each}
		</div>
	{/each}
</section>

<style>
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

</style>
