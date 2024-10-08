import type { CVData, Experience } from "../types"; // Ensure Experience is imported if defined separately

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

export function coalesceVersion(slug: string): CVData | null {
	// Merges version (slug) on top of main
	const main =  versionMap["main"];
	const version = getVersion(slug);

	if (!main || !version) {
		return null;
	}

	// Start with the main data
	const merged: CVData = { ...main, ...version };

	// Handle the experience field by index
	if (main.experience && version.experience) {
		merged.experience = coalesceExperiencesByIndex(main.experience, version.experience);
	}

	// Optionally combine skills and education
	merged.skills = Array.from(new Set([...(main.skills || []), ...(version.skills || [])]));
	merged.education = [...(main.education || []), ...(version.education || [])];

	return merged;
}

function coalesceExperiencesByIndex(
	mainExperiences: Experience[],
	versionExperiences: Experience[]
): Experience[] {
	const maxLength = Math.max(mainExperiences.length, versionExperiences.length);
	const mergedExperiences: Experience[] = [];

	for (let i = 0; i < maxLength; i++) {
		const mainExp = mainExperiences[i];
		const versionExp = versionExperiences[i];

		if (mainExp && versionExp) {
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
		} else if (versionExp) {
			// If only version experience exists, use it
			mergedExperiences.push(versionExp);
		} else if (mainExp) {
			// If only main experience exists, use it
			mergedExperiences.push(mainExp);
		}
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
		} else if (mainDescription[i]) {
			mergedDescription[i] = mainDescription[i];
		} else {
			mergedDescription[i] = ""; // Default to empty string if both are undefined
		}
	}

	return mergedDescription;
}
