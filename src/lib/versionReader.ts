// src/lib/versionLoader.ts
import type { CVData } from '../types'; // Define your CV data type

// Dynamically import all JSON files in the versions directory
const versions = import.meta.glob<CVData>('/src/lib/versions/*.json', { eager: true });

// Create a mapping from slug to data
const versionMap: Record<string, CVData> = {};

for (const path in versions) {
    const slug = path.match(/\/src\/lib\/versions\/(.*)\.json$/)?.[1];
    if (slug) {
        versionMap[slug] = { ...versions[path].default, pdfLink: `/cv/${slug}/morgan-williams-cv.pdf` };
    }
}

export function getVersion(slug: string): CVData | null {
    return versionMap[slug] || null;
}

export function getMainVersion(): CVData | null {
    return versionMap['main'] || null;
}