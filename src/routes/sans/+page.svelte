<script lang="ts">
	import CV from "$lib/CV.svelte";
	import type { PageData } from "./$types";

	export let data: PageData;
</script>

<CV
	{...data}
	pdfLink="morgan-williams.pdf"
	variant="modern"
/>
