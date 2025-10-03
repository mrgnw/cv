import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		allowedHosts: ['.skate-in.ts.net'],
		watch: {
			// Ignore PDF files and cache files to prevent page refresh during generation
			ignored: [
				'**/static/**/*.pdf',
				'**/.pdf-cache.json',
				'**/pdf-*.log',
				// Ignore generated CV version files to avoid triggering full reloads on save
				'**/src/lib/versions/**'
			]
		}
	}
});
