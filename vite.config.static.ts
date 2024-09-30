import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import svelteConfig from "./svelte.config.static.js";

export default defineConfig({
	plugins: [sveltekit(svelteConfig)],
});
