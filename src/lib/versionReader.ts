import type { CV, Experience, Project, VersionMeta } from "../types";
import JSON5 from "json5";

/**
 * Dynamically import all JSON files in the versions directory (including subdirectories).
 */
const versionFiles = {
    ...import.meta.glob<string>("/src/lib/versions/**/*.json", {
        query: "?raw",
        import: "default",
        eager: true,
    }),
    ...import.meta.glob<string>("/src/lib/versions/**/*.json5", {
        query: "?raw",
        import: "default",
        eager: true,
    }),
    ...import.meta.glob<string>("/src/lib/versions/**/*.jsonc", {
        query: "?raw",
        import: "default",
        eager: true,
    }),
};

/**
 * Normalize a string to be a valid URL slug
 */
function normalizeSlug(str: string): string {
    return str
        .toLowerCase()
        .trim()
        .replace(/[\s_]+/g, "-")
        .replace(/[^\w-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/**
 * Parse a version file path to extract job title and company
 */
function parseVersionPath(path: string): {
    job: string | null;
    company: string | null;
    sourceType: VersionMeta["sourceType"];
} {
    // Remove extension and prefix
    const pathMatch = path.match(/\/src\/lib\/versions\/(.+?)\.(json[c5]?)$/);
    if (!pathMatch) {
        throw new Error(`Invalid version path: ${path}`);
    }

    const [, pathPart] = pathMatch;

    // Handle main file
    if (pathPart === "main") {
        return { job: null, company: null, sourceType: "base" };
    }

    // Check if it's nested (job/company)
    const parts = pathPart.split("/");
    if (parts.length === 2) {
        return { job: parts[0], company: parts[1], sourceType: "scoped" };
    } else if (parts.length === 1) {
        return { job: parts[0], company: null, sourceType: "generic" };
    }

    throw new Error(`Unexpected path structure: ${path}`);
}

/**
 * Maps each version slug to its corresponding CV data.
 */
const versionMap: Record<string, CV> = {};

/**
 * Maps each version slug to its metadata.
 */
const metaMap: Record<string, VersionMeta> = {};

// First pass: parse all files and extract metadata
const tempEntries: Array<{
    path: string;
    content: string;
    job: string | null;
    company: string | null;
    sourceType: VersionMeta["sourceType"];
}> = [];

for (const path in versionFiles) {
    const content = versionFiles[path];
    if (!content) {
        console.error(`No content found for ${path}`);
        continue;
    }

    try {
        const { job, company, sourceType } = parseVersionPath(path);
        tempEntries.push({
            path,
            content: content.replace(/^\uFEFF/, ""), // Remove BOM
            job,
            company,
            sourceType,
        });
    } catch (error) {
        console.error(`Error parsing path ${path}:`, error);
        throw error;
    }
}

// Count company occurrences to determine slug strategy
const companyCount = new Map<string, number>();
tempEntries.forEach((entry) => {
    if (entry.company) {
        const normalizedCompany = normalizeSlug(entry.company);
        companyCount.set(
            normalizedCompany,
            (companyCount.get(normalizedCompany) || 0) + 1,
        );
    }
});

// Second pass: generate slugs and build maps
const slugConflicts = new Map<string, string[]>();

for (const entry of tempEntries) {
    let slug: string;

    if (entry.sourceType === "base") {
        slug = "main";
    } else if (entry.company) {
        const normalizedCompany = normalizeSlug(entry.company);
        const normalizedJob = normalizeSlug(entry.job!);

        if (companyCount.get(normalizedCompany) === 1) {
            slug = normalizedCompany;
        } else {
            slug = `${normalizedCompany}-${normalizedJob}`;
        }
    } else {
        slug = normalizeSlug(entry.job!);
    }

    // Check for conflicts
    if (slugConflicts.has(slug)) {
        slugConflicts.get(slug)!.push(entry.path);
    } else {
        slugConflicts.set(slug, [entry.path]);
    }

    // Parse and store data
    try {
        const parsedData = JSON5.parse(entry.content);

        // Migrate old experience format to new format
        if (parsedData.experience && Array.isArray(parsedData.experience)) {
            parsedData.experience = parsedData.experience.map((exp: any) => {
                // Handle null entries
                if (!exp) return null;

                return {
                    ...exp,
                    // Migrate description/accomplishments -> achievements if needed
                    achievements:
                        exp.achievements ||
                        exp.accomplishments ||
                        exp.description ||
                        [],
                    // Remove old property names if they exist
                    description: undefined,
                    accomplishments: undefined,
                };
            });
        }

        // Generate PDF link
        const pdfLink =
            slug === "main"
                ? "/morgan-williams.pdf"
                : `/morgan-williams.${slug}.pdf`;

        versionMap[slug] = {
            ...parsedData,
            pdfLink,
        };

        metaMap[slug] = {
            slug,
            job: entry.job,
            company: entry.company,
            path: entry.path,
            sourceType: entry.sourceType,
        };
    } catch (error) {
        console.error(`Error parsing JSON for ${entry.path}:`, error);
        throw error;
    }
}

// Validate no conflicts
for (const [slug, paths] of slugConflicts) {
    if (paths.length > 1) {
        throw new Error(
            `Slug collision detected for "${slug}": ${paths.join(", ")}`,
        );
    }
}

/**
 * Retrieves a specific version by its slug.
 * @param slug - The slug identifier for the version.
 * @returns The corresponding CV or null if not found.
 */
export function getVersion(slug: string): CV | null {
    return versionMap[slug] || null;
}

/**
 * Combines the main version with a specified version.
 * @param slug - The slug identifier for the version to combine.
 * @returns The merged CV or null if merging isn't possible.
 */
export function coalesceVersion(slug: string): CV | null {
    const main = versionMap["main"];
    const version = getVersion(slug);

    if (!main || !version) {
        return null;
    }

    // Import and parse projects (cache this once for better performance)
    const projectFiles = {
        ...import.meta.glob<string>("/src/lib/projects.jsonc", {
            query: "?raw",
            import: "default",
            eager: true,
        }),
    };

    const projectContent = projectFiles["/src/lib/projects.jsonc"];
    if (!projectContent) {
        console.error(`Could not find projects file`);
        throw new Error("Projects file not found");
    }

    // Remove BOM if present and parse
    const cleanProjectContent = projectContent.replace(/^\uFEFF/, "");
    const projectsList = JSON5.parse(cleanProjectContent) as Project[];

    // Create projects map
    const projectsMap = new Map<string, Project>(
        projectsList.map((project) => [project.name, project]),
    );

    function resolveProjects(
        projects: (string | Project)[] | undefined,
    ): Project[] {
        if (!projects) return [];

        return projects
            .map((project) => {
                if (typeof project === "string") {
                    // If project is specified by name, look it up in projectsMap
                    const fullProject = projectsMap.get(project);
                    if (!fullProject) {
                        console.warn(
                            `Project "${project}" not found in projects.jsonc`,
                        );
                        return null;
                    }
                    return fullProject;
                }
                // If it's a full project definition, use it as is
                return project;
            })
            .filter((p): p is Project => p !== null);
    }

    // Create merged object without projects first
    const { projects: mainProjects = [], ...mainRest } = main;
    const { projects: versionProjects = [], ...versionRest } = version;

    // Resolve projects from version (or fall back to main)
    const projectsToUse =
        versionProjects.length > 0 ? versionProjects : mainProjects;
    const resolvedProjects = resolveProjects(projectsToUse);

    // Create the merged CV object
    const merged: CV = {
        ...mainRest,
        ...versionRest,
        projects: projectsToUse, // Keep the raw projects
        resolvedProjects, // Add resolved projects
    };

    // Use version experience if it exists, otherwise use main experience
    if (version.experience) {
        merged.experience = version.experience;
    } else if (main.experience) {
        merged.experience = main.experience;
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
    versionExperiences: Experience[],
): Experience[] {
    const maxLength = Math.max(
        mainExperiences.length,
        versionExperiences.length,
    );
    const mergedExperiences: Experience[] = [];

    for (let i = 0; i < maxLength; i++) {
        const mainExp = mainExperiences[i];
        const versionExp = versionExperiences[i];

        if (mainExp && versionExp) {
            mergedExperiences.push({
                ...mainExp,
                ...versionExp,
                achievements: mergeAchievements(
                    mainExp.achievements,
                    versionExp.achievements,
                ),
            });
        } else if (versionExp) {
            // Ensure version experience has achievements array
            mergedExperiences.push({
                ...versionExp,
                achievements: versionExp.achievements || [],
            });
        } else if (mainExp) {
            // Ensure main experience has achievements array
            mergedExperiences.push({
                ...mainExp,
                achievements: mainExp.achievements || [],
            });
        }
    }

    return mergedExperiences;
}

/**
 * Merges two arrays of achievements strings line by line.
 * Prefer version achievements over main achievements when available.
 * @param mainAchievements - The primary array of achievements.
 * @param versionAchievements - The array of achievements to merge from the version.
 * @returns A new array of merged achievements strings.
 */
function mergeAchievements(
    mainAchievements: string[] | undefined,
    versionAchievements: string[] | undefined,
): string[] {
    // Handle undefined cases
    const safeMainAchievements = mainAchievements || [];
    const safeVersionAchievements = versionAchievements || [];

    const maxLength = Math.max(
        safeMainAchievements.length,
        safeVersionAchievements.length,
    );
    const mergedAchievements: string[] = [];

    for (let i = 0; i < maxLength; i++) {
        const versionLine =
            typeof safeVersionAchievements[i] === "string"
                ? safeVersionAchievements[i].trim()
                : "";
        mergedAchievements[i] = versionLine || safeMainAchievements[i] || "";
    }

    return mergedAchievements;
}

/**
 * Retrieves all available versions.
 * @returns An array of slugs representing all versions.
 */
export function getAllVersions(): string[] {
    return Object.keys(versionMap);
}

/**
 * Retrieves all version metadata.
 * @returns An array of VersionMeta objects.
 */
export function getAllVersionMeta(): VersionMeta[] {
    return Object.values(metaMap);
}
