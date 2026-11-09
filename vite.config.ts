import { sveltekit } from "@sveltejs/kit/vite";
import { isMainThread } from 'node:worker_threads';
import { defineConfig } from "vite";
import checker from 'vite-plugin-checker';

export default defineConfig({
	plugins: [
		sveltekit(),
		isMainThread &&
			checker({
				svelteCheck: { flags: '--tsconfig ./tsconfig.json' },
				enableBuild: false
			})
	],
	server: {
		allowedHosts: ['.skate-in.ts.net'],
		watch: {
			// Ignore PDF files and cache files to prevent page refresh during generation
			ignored: [
				'**/static/**/*.pdf',
				'**/.pdf-cache.json',
				'**/pdf-*.log'
			]
		}
	}
});
