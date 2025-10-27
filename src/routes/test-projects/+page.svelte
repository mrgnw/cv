<script lang="ts">
  import { coalesceVersion } from '$lib/versionReader';

  // Test data loading
  const mainData = coalesceVersion('main');
  const bitpandaData = coalesceVersion('bitpanda');

  console.log('Test Page Debug:');
  console.log('mainData:', mainData);
  console.log('bitpandaData:', bitpandaData);
</script>

<div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: monospace;">
  <h1>Project Loading Debug Test</h1>

  <h2>Main Data</h2>
  <div style="background: #f0f0f0; padding: 10px; margin: 10px 0;">
    <p><strong>Projects (raw):</strong> {JSON.stringify(mainData?.projects)}</p>
    <p><strong>Resolved Projects:</strong> {mainData?.resolvedProjects?.length || 0} items</p>
    {#if mainData?.resolvedProjects}
      <ul>
        {#each mainData.resolvedProjects as project}
          <li>{project.name} - {project.url}</li>
        {/each}
      </ul>
    {/if}
  </div>

  <h2>Bitpanda Data</h2>
  <div style="background: #f0f0f0; padding: 10px; margin: 10px 0;">
    <p><strong>Projects (raw):</strong> {JSON.stringify(bitpandaData?.projects)}</p>
    <p><strong>Resolved Projects:</strong> {bitpandaData?.resolvedProjects?.length || 0} items</p>
    {#if bitpandaData?.resolvedProjects}
      <ul>
        {#each bitpandaData.resolvedProjects as project}
          <li>{project.name} - {project.url}</li>
        {/each}
      </ul>
    {/if}
  </div>

  <h2>Projects File Test</h2>
  <div style="background: #f0f0f0; padding: 10px; margin: 10px 0;">
    <p>Testing direct import of projects.jsonc...</p>
    <!-- This will help us verify if the projects file is loading correctly -->
  </div>
</div>
