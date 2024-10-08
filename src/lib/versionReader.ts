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
	// Merges version (slug) on top of main
	const main = getMainVersion();
	const version = getVersion(slug);

	if (!main || !version) {
		return null;
	}

	// Start with the main data
	const merged: CVData = { ...main, ...version };

	// Handle the experience field separately
	if (main.experience && version.experience) {
		merged.experience = coalesceExperiences(main.experience, version.experience);
	}

	return merged;
}

function coalesceExperiences(
	mainExperiences: Experience[],
	versionExperiences: Experience[]
): Experience[] {
	const mergedExperiences: Experience[] = [];

	// Create a map of main experiences indexed by company
	const mainExperienceMap = new Map<string, Experience>();
	for (const exp of mainExperiences) {
		mainExperienceMap.set(exp.company, exp);
	}

	// Iterate over version experiences to merge
	for (const versionExp of versionExperiences) {
		const company = versionExp.company;
		const mainExp = mainExperienceMap.get(company);

		if (mainExp) {
			// Merge descriptions line by line
			const mergedDescription = coalesceDescriptions(
				mainExp.description,
				versionExp.description
			);

			// Merge the experiences
			const mergedExp: Experience = {
				...mainExp,
				...versionExp,
				description: mergedDescription,
			};

			mergedExperiences.push(mergedExp);
			mainExperienceMap.delete(company); // Remove it from the map as it's processed
		} else {
			// If not present in main, use the version experience as is
			mergedExperiences.push(versionExp);
		}
	}

	// Add any remaining main experiences that were not in version
	for (const mainExp of mainExperienceMap.values()) {
		mergedExperiences.push(mainExp);
	}

	return mergedExperiences;
}

function coalesceDescriptions(
	mainDescription: string[],
	versionDescription: string[]
): string[] {
	const maxLength = Math.max(mainDescription.length, versionDescription.length);
	const mergedDescription: string[] = [];

	for (let i = 0; i < maxLength; i++) {
		const versionLine = versionDescription[i]?.trim();
		if (versionLine) {
			mergedDescription[i] = versionLine;
		} else {
			mergedDescription[i] = mainDescription[i];
		}
	}

	return mergedDescription;
}
