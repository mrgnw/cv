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

<section class="mb-8" class:print-experience={isPrinting}>
	{#each experience as exp, i}
		<div class="mb-4 print:mb-3 experience-item" data-priority={i + 1}>
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
			<div class="achievements">
				{#each exp.achievements as paragraph, j}
					<p class="mb-2 mt-1 print:mb-1.5 print:mt-0.5 achievement" data-index={j + 1}>
						{paragraph}
					</p>
				{/each}
			</div>
		</div>
	{/each}
</section>

<style>
	@media print {
		.print-experience {
			/* More compact spacing for print */
			font-size: 11pt;
			line-height: 1.4;
		}

		/* Priority-based achievement limiting */
		.experience-item[data-priority="1"] .achievement:nth-child(n+6) {
			display: none; /* Max 5 achievements for top priority */
		}

		.experience-item[data-priority="2"] .achievement:nth-child(n+5) {
			display: none; /* Max 4 achievements */
		}

		.experience-item[data-priority="3"] .achievement:nth-child(n+5) {
			display: none; /* Max 4 achievements */
		}

		.experience-item[data-priority="4"] .achievement:nth-child(n+4) {
			display: none; /* Max 3 achievements */
		}

		/* Hide entire low-priority experience items if needed */
		.print-experience.compact .experience-item[data-priority="4"] {
			display: none;
		}
	}
</style>
