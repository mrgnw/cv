<script lang="ts">
  import CV from '$lib/CV.svelte';
  import type { PageLoad } from './$types';

  export let data: PageLoad;
</script>

<CV
  name={data.name}
  title={data.title}
  email={data.email}
  github={data.github}
  pdfLink={data.pdfLink}
  experience={data.experience}
  skills={data.skills}
  education={data.education}
/>