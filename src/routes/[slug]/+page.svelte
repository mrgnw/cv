<script lang="ts">
  import EngCV from '$lib/EngCV.svelte';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  const pdfLink = data.slug === 'main' ? 
    '/morgan-williams.pdf' : 
    `morgan-williams.${data.slug}.pdf`;
</script>

<EngCV {...data} version={data.slug} pdfLink={pdfLink} />