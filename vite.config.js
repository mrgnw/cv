import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	ssr: {
		external: ["playwright", "playwright-core"],
	},
	optimizeDeps: {
		exclude: ["playwright", "playwright-core"],
	},
});
