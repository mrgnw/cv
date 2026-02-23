import adapter from "@sveltejs/adapter-cloudflare";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		alias: {
			$lib: "src/lib",
			$templates: "templates",
			$profile: "profile",
			$stores: "src/stores",
		},
	},
};

export default config;
