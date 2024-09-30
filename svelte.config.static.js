// import { mdsvex } from "mdsvex";
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

console.log("svelte.config.static.js");

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [
		vitePreprocess(),
		// mdsvex()
	],

	kit: {
		adapter: adapter({
			// default options are shown
			pages: 'build',
			assets: 'build',
			fallback: undefined,
			precompress: true,
			strict: false,
		}),
		prerender: {
			entries: ['*'] // Prerender all routes
		}
	},

	extensions: [".svelte", ".svx"]
};

export default config;
