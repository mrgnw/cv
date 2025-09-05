<script lang="ts">
import "../app.css";
/** @type {{children?: import('svelte').Snippet}} */
let { children } = $props();
</script>

<svelte:head>
	<title>Morgan Williams</title>
	<meta name="description" content="Morgan Williams - Experienced software engineer">
	<meta name="keywords" content="Morgan Williams, full-stack development, data engineering, Python, Svelte, data architecture, servers">
</svelte:head>

{@render children?.()}

