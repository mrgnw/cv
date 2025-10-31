<script lang="ts">
  import CV from '$lib/CV.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
  
  // Generate sans PDF link based on the slug from data
  const pdfLink = data.slug === 'main' ? 
    '/sans/morgan-williams-sans.pdf' : 
    `/sans/morgan-williams.${data.slug}-sans.pdf`;
</script>

<CV
  {...data}
  {pdfLink}
  variant="modern"
/>