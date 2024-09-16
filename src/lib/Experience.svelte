<script lang="ts">
	import { fade } from 'svelte/transition';
	export let experience;

	function calculateDuration(start: string, end?: string): string {
		const startDate = new Date(start);
		const endDate = end ? new Date(end) : new Date();

		if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
			return "Invalid date";
		}

		const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
		const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365);
		const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30);

		if (diffYears >= 1) {
			return `${Math.floor(diffYears)} years`;
		} else {
			return `${Math.floor(diffMonths)} months`;
		}
	}

	function formatDate(date: string): string {
		const options = { year: 'numeric', month: 'short' };
		return new Date(date).toLocaleDateString(undefined, options);
	}
</script>

<style>
	.period {
		position: relative;
		display: inline-block;
		cursor: pointer;
		white-space: nowrap;
	}

	.default-text, .hover-text {
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
</style>

<section class="mb-8">
	<h2 class="text-2xl font-semibold mb-4">Experience</h2>
	{#each experience as exp}
		<div class="mb-8">
			<h3 class="text-xl font-semibold">{exp.title}</h3>
			<p class="text-muted-foreground">
				{exp.company} - 
				<span class="period">
					<span class="default-text" in:fade out:fade>{calculateDuration(exp.start, exp.end)}</span>
					<span class="hover-text" in:fade out:fade>{formatDate(exp.start)} - {exp.end ? formatDate(exp.end) : 'Present'}</span>
				</span>
			</p>
			{#each exp.description as paragraph}
				<p class="mb-2">{paragraph}</p>
			{/each}
		</div>
	{/each}
</section>