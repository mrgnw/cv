<script lang="ts">
  import EngCV from '$lib/EngCV.svelte';
  import type { PageServerLoad } from './$types';

  interface Props {
    data: PageServerLoad;
  }

  let { data }: Props = $props();
  const pdfLink = $derived(data.slug === 'main' ? 
    '/es/morgan-williams.pdf' : 
    `/es/morgan-williams.${data.slug}.pdf`);
</script>

<EngCV {...data} pdfLink={pdfLink} lang="es" />
