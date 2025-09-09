<script lang="ts">
    import EngCV from "$lib/EngCV.svelte";
    import mainData from "$lib/versions/main.json";
    import { coalesceVersion } from "$lib/versionReader";
    import { error } from "@sveltejs/kit";

    const resolvedData = coalesceVersion("main");
    if (!resolvedData) {
        throw error(500, 'Could not load main CV data');
    }
</script>
  
<EngCV {...resolvedData} />