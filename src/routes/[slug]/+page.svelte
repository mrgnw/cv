<script lang="ts">
  import CV from '$lib/CV.svelte';
  import type { PageServerLoad } from './$types';

  export let data: PageServerLoad;
</script>

<CV
  name={data.name}
  title={data.title}
  email={data.email}
  github={data.github}
  pdfLink={data.pdfLink}
  skills={data.skills}
  experience={data.experience}
  education={data.education}
/>