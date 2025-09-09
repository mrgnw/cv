<script lang="ts">
	import CVSans from "$lib/CVSans.svelte";
	import type { PageData } from "./$types";

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<CVSans
	name={data.name}
	title={data.title}
	email={data.email}
	github={data.github}
	pdfLink="morgan-williams.pdf"
	skills={data.skills}
	projects={data.projects}
	experience={data.experience}
	education={data.education}
/>
