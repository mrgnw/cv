<script lang="ts">
    import CV from "$lib/CV.svelte";
    import mainData from "$lib/versions/main.json";
    import { coalesceVersion } from "$lib/versionReader";
    import { error } from "@sveltejs/kit";

    const resolvedData = coalesceVersion("main");
    if (!resolvedData) {
        throw error(500, 'Could not load main CV data');
    }
</script>
  
<CV {...resolvedData} pdfLink="/morgan-williams.pdf" />