<script lang="ts">
	export let experience: { title: string; company: string; period: string; description: string }[] = [];
</script>

<section class="mb-8">
	<h2 class="text-2xl font-semibold mb-4">Experience</h2>
	{#each experience as job}
		<div class="mb-4">
			<h3 class="text-xl font-semibold">{job.title}</h3>
			<p class="text-muted-foreground">{job.company} | {job.period}</p>
			<p>{job.description}</p>
		</div>
	{/each}
</section>