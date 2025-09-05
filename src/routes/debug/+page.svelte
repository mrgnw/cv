<script lang="ts">
    import { getAllVersions, getAllVersionMeta } from '$lib/versionReader';
    
    const versions = getAllVersions();
    const meta = getAllVersionMeta();
</script>

<div class="p-8">
    <h1 class="text-2xl font-bold mb-4">Debug: Available Versions</h1>
    
    <h2 class="text-lg font-semibold mb-2">Version Slugs:</h2>
    <ul class="mb-6">
        {#each versions as version}
            <li><a href="/{version}" class="text-blue-600 hover:underline">{version}</a></li>
        {/each}
    </ul>
    
    <h2 class="text-lg font-semibold mb-2">Version Metadata:</h2>
    <div class="grid gap-2">
        {#each meta as m}
            <div class="p-3 border rounded">
                <div><strong>Slug:</strong> <a href="/{m.slug}" class="text-blue-600 hover:underline">{m.slug}</a></div>
                <div><strong>Job:</strong> {m.job || 'N/A'}</div>
                <div><strong>Company:</strong> {m.company || 'N/A'}</div>
                <div><strong>Type:</strong> {m.sourceType}</div>
                <div><strong>Path:</strong> {m.path}</div>
            </div>
        {/each}
    </div>
</div>
