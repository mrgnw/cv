<script lang="ts">
  import EngCV from '$lib/EngCV.svelte';
  import type { PageServerLoad } from './$types';

  interface Props {
    data: PageServerLoad;
  }

  let { data }: Props = $props();
  const pdfLink = data.slug === 'main' ? 
    '/morgan-williams.pdf' : 
    `morgan-williams.${data.slug}.pdf`;
</script>

<EngCV {...data} version={data.slug} pdfLink={pdfLink} />