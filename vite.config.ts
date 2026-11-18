import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
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
