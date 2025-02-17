<script>
import "../../app.css";
	/** @type {{children?: import('svelte').Snippet}} */
	let { children } = $props();
</script>

<svelte:head>
	<title>Morgan Williams</title>
	<meta name="description" content="Morgan Williams - Ingeniero de software experimentado">
	<meta name="keywords" content="Morgan Williams, desarrollo full-stack, ingeniería de datos, Python, Svelte, arquitectura de datos, servidores">
</svelte:head>

{@render children?.()}
