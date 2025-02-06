<script lang="ts">
  import CVSans from '$lib/CVSans.svelte';
  import type { PageServerLoad } from './$types';

  interface Props {
    data: PageServerLoad;
  }

  let { data }: Props = $props();
  const pdfLink = data.slug === 'main' ? 
    '/sans/morgan-williams-sans.pdf' : 
    `/sans/morgan-williams.${data.slug}-sans.pdf`;
</script>

<CVSans
  name={data.name}
  title={data.title}
  email={data.email}
  github={data.github}
  {pdfLink}
  skills={data.skills}
  projects={data.projects}
  experience={data.experience}
  education={data.education}
/>