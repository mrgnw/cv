// src/lib/versionLoader.ts
import type { CVData } from "../types"; // Define your CV data type

// Dynamically import all JSON files in the versions directory
const versions = import.meta.glob<CVData>("/src/lib/versions/*.json", {
	eager: true,
});

// Create a mapping from slug to data
const versionMap: Record<string, CVData> = {};

for (const path in versions) {
	const slug = path.match(/\/src\/lib\/versions\/(.*)\.json$/)?.[1];
	if (slug) {
		versionMap[slug] = {
			...versions[path].default,
			pdfLink: `/cv/${slug}/morgan-williams.pdf`,
		};
	}
}

export function getVersion(slug: string): CVData | null {
	return versionMap[slug] || null;
}

export function getMainVersion(): CVData | null {
	return versionMap["main"] || null;
}
export function coalesceVersion(slug: string): CVData | null {
	// merges version (slug) on top of main
	const main = getMainVersion();
	const version = getVersion(slug);

	if (!main || !version) {
		return null;
	}
	
	return {
		...main,
		...version,
	};
}
