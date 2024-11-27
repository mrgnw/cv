<script lang="ts">
  import CV from '$lib/CV.svelte';
  import type { PageServerLoad } from './$types';

  interface Props {
    data: PageServerLoad;
  }

  let { data }: Props = $props();
  const slug = data.slug;
</script>

<CV
  name={data.name}
  title={data.title}
  email={data.email}
  github={data.github}
  pdfLink={`/cv/${slug}/morgan-williams.pdf`}
  skills={data.skills}
  experience={data.experience}
  education={data.education}
/>