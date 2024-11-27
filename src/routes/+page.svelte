<script lang="ts">
	import CV from "$lib/CV.svelte";
	import type { PageServerLoad } from "./$types";

	interface Props {
		data: PageServerLoad;
	}

	let { data }: Props = $props();
</script>

<CV
	name={data.name}
	title={data.title}
	email={data.email}
	github={data.github}
	pdfLink="morgan-williams.pdf"
	skills={data.skills}
	experience={data.experience}
	education={data.education}
/>
