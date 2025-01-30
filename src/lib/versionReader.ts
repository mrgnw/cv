import type { CVData, Experience, Project } from "../types";
import JSON5 from 'json5';

/**
 * Dynamically import all JSON files in the versions directory.
 */
const versionFiles = {
	...import.meta.glob<string>('/src/lib/versions/*.json', { as: 'raw', eager: true }),
	...import.meta.glob<string>('/src/lib/versions/*.json5', { as: 'raw', eager: true }),
	...import.meta.glob<string>('/src/lib/versions/*.jsonc', { as: 'raw', eager: true }),
};

/**
 * Maps each version slug to its corresponding CV data.
 */
const versionMap: Record<string, CVData> = {};

for (const path in versionFiles) {
	const slugMatch = path.match(/\/src\/lib\/versions\/(.+?)\.(json[c5]?)$/);
	if (slugMatch) {
		const slug = slugMatch[1];
		try {
			const content = versionFiles[path];
			if (!content) {
				console.error(`No content found for ${path}`);
				continue;
			}
			// Remove BOM if present
			const cleanContent = content.replace(/^\uFEFF/, '');
			console.log(`Parsing ${path}, content:`, {
				firstChars: cleanContent.slice(0, 20),
				charCodes: Array.from(cleanContent.slice(0, 5)).map(c => c.charCodeAt(0))
			});
			versionMap[slug] = {
				...JSON5.parse(cleanContent),
				pdfLink: `/cv/${slug}/morgan-williams.pdf`,
			};
		} catch (error) {
			console.error(`Error parsing ${path}:`, error);
			throw error;
		}
	}
}

// Import and parse projects
const projectFiles = import.meta.glob<string>('/src/lib/projects.jsonc', { as: 'raw', eager: true });
const projectContent = projectFiles['/src/lib/projects.jsonc'];

if (!projectContent) {
	console.error('Could not find projects.jsonc file');
	throw new Error('Projects file not found');
}

// Remove BOM if present and parse
const cleanProjectContent = projectContent.replace(/^\uFEFF/, '');
const projectsList = JSON5.parse(cleanProjectContent) as Project[];

// Create projects map
const projectsMap = new Map<string, Project>(
	projectsList.map(project => [project.name, project])
);

function resolveProjects(projects: (string | Project)[] | undefined): Project[] {
	if (!projects) return [];
	
	return projects.map(project => {
		if (typeof project === "string") {
			// If project is specified by name, look it up in projectsMap
			const fullProject = projectsMap.get(project);
			if (!fullProject) {
				console.warn(`Project "${project}" not found in projects.jsonc`);
				return null;
			}
			return fullProject;
		}
		// If it's a full project definition, use it as is
		return project;
	}).filter((p): p is Project => p !== null);
}

/**
 * Retrieves a specific version by its slug.
 * @param slug - The slug identifier for the version.
 * @returns The corresponding CVData or null if not found.
 */
export function getVersion(slug: string): CVData | null {
	return versionMap[slug] || null;
}

/**
 * Combines the main version with a specified version.
 * @param slug - The slug identifier for the version to combine.
 * @returns The merged CVData or null if merging isn't possible.
 */
export function coalesceVersion(slug: string): CVData | null {
	const main = versionMap["main"];
	const version = getVersion(slug);

	if (!main || !version) {
		return null;
	}

	const merged: CVData = { ...main, ...version };

	// Resolve projects if they exist in the version
	if (version.projects) {
		merged.projects = resolveProjects(version.projects);
	}

	// Merge experience sections if they exist in both
	if (main.experience && version.experience) {
		merged.experience = mergeExperiences(main.experience, version.experience);
	}

	return merged;
}

/**
 * Merges two arrays of Experience objects by their index.
 * @param mainExperiences - The primary array of experiences.
 * @param versionExperiences - The array of experiences to merge from the version.
 * @returns A new array of merged Experience objects.
 */
function mergeExperiences(
	mainExperiences: Experience[],
	versionExperiences: Experience[]
): Experience[] {
	const maxLength = Math.max(mainExperiences.length, versionExperiences.length);
	const mergedExperiences: Experience[] = [];

	for (let i = 0; i < maxLength; i++) {
		const mainExp = mainExperiences[i];
		const versionExp = versionExperiences[i];

		if (mainExp && versionExp) {
			mergedExperiences.push({
				...mainExp,
				...versionExp,
				description: mergeDescriptions(mainExp.description, versionExp.description),
			});
		} else if (versionExp) {
			mergedExperiences.push(versionExp);
		} else if (mainExp) {
			mergedExperiences.push(mainExp);
		}
	}

	return mergedExperiences;
}

/**
 * Merges two arrays of description strings line by line.
 * Prefer version descriptions over main descriptions when available.
 * @param mainDescription - The primary array of descriptions.
 * @param versionDescription - The array of descriptions to merge from the version.
 * @returns A new array of merged description strings.
 */
function mergeDescriptions(
	mainDescription: string[],
	versionDescription: string[]
): string[] {
	const maxLength = Math.max(mainDescription.length, versionDescription.length);
	const mergedDescription: string[] = [];

	for (let i = 0; i < maxLength; i++) {
		const versionLine = versionDescription[i]?.trim();
		mergedDescription[i] = versionLine || mainDescription[i] || "";
	}

	return mergedDescription;
}

/**
 * Retrieves all available versions.
 * @returns An array of slugs representing all versions.
 */
export function getAllVersions(): string[] {
	return Object.keys(versionMap);
}
