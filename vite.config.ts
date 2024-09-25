import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import json5Hmr from "./plugins/json5-hmr";

export default defineConfig({
	plugins: [sveltekit(), json5Hmr()],
});
