// import { mdsvex } from "mdsvex";
import fs from 'fs';
import path from 'path';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

console.log("svelte.config.static.js");

function getAllSlugs() {
	const versionsDir = path.join('src', 'lib', 'versions');
	const files = fs.readdirSync(versionsDir);
	return files
		.filter((file) => file.endsWith('.json'))
		.map((file) => `/${path.parse(file).name}`);
}

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
			entries: ['*', ...getAllSlugs()] // Prerender all routes
		}
	},

	extensions: [".svelte", ".svx"]
};

export default config;
