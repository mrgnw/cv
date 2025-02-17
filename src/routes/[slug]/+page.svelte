<script lang="ts">
  import EngCV from '$lib/EngCV.svelte';
  import type { PageServerLoad } from './$types';
  import { page } from '$app/stores';

  interface Props {
    data: PageServerLoad;
  }

  let { data }: Props = $props();
  const pdfLink = $derived(data, (data) => data.slug === 'main' ? 
    '/morgan-williams.pdf' : 
    `morgan-williams.${data.slug}.pdf`);
  
  const lang = $derived(page, (page) => page.url.searchParams.get('lang') || 'en');
</script>

<EngCV {...data} pdfLink={pdfLink} {lang} />