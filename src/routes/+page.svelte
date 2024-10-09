<script lang="ts">
	import CV from "$lib/CV.svelte";
	import type { PageServerLoad } from "./$types";

	export let data: PageServerLoad;
	// let versions = data.versions;
	// console.log(versions);
	
</script>


<!-- <h2>Versions</h2>
<ul>
	{#each versions as version}
		<li>{version}</li>
	{/each}
</ul>
 -->

<CV
	name={data.name}
	title={data.title}
	email={data.email}
	github={data.github}
	pdfLink='morgan-williams.pdf'
	skills={data.skills}
	experience={data.experience}
	education={data.education}
/>
