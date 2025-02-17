<script lang="ts">
    import EngCV from "$lib/EngCV.svelte";
    import mainData from "$lib/versions/main.json";
    import { coalesceVersion } from "$lib/versionReader";

    const resolvedData = coalesceVersion("main");
</script>
  
<EngCV {...resolvedData} />
