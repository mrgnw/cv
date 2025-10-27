import { defineConfig } from "vitest/config";
import { sveltekit } from "@sveltejs/kit/vite";

export default defineConfig({
    plugins: [sveltekit()],
    test: {
        include: ["tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        environment: "node",
        globals: true,
        setupFiles: ["./tests/setup.js"],
    },
    resolve: {
        alias: {
            $lib: new URL("./src/lib", import.meta.url).pathname,
            $app: new URL(
                "./node_modules/@sveltejs/kit/src/runtime/app",
                import.meta.url,
            ).pathname,
        },
    },
    define: {
        global: "globalThis",
    },
    optimizeDeps: {
        exclude: ["@cloudflare/workerd-darwin-arm64", "workerd"],
    },
    ssr: {
        noExternal: ["date-fns"],
    },
});
