import { mdsvex } from "mdsvex";
import adapter from '@sveltejs/adapter-cloudflare';
import nodeAdapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Use node adapter for Docker containers and development (supports child_process)
// Use cloudflare adapter for production deployments
const isDocker = process.env.DOCKER === '1' || process.env.IN_DOCKER === '1';
const isDev = process.env.NODE_ENV === 'development';
const useNodeAdapter = isDocker || isDev || process.env.USE_NODE_ADAPTER === '1';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [vitePreprocess(), mdsvex()],
	kit: {
		adapter: useNodeAdapter ? nodeAdapter() : adapter(),
	},
	extensions: [".svelte", ".svx"]
};

export default config;
