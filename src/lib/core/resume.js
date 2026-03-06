import JSON5 from "json5";
import fs from "fs";

const DEFAULTS = {
	name: "Your Name",
	email: "email@example.com",
	github: "https://github.com",
	linkedin: "https://linkedin.com",
	education: [],
	projects: [],
	lang: "en",
};

/**
 * Load defaults from defaults.json5 or return hardcoded defaults
 * @param {string} defaultsPath - Path to defaults.json5 file
 * @returns {Object} Default resume data
 */
export function loadDefaults(defaultsPath) {
	if (!defaultsPath || !fs.existsSync(defaultsPath)) {
		return DEFAULTS;
	}

	try {
		const content = fs.readFileSync(defaultsPath, "utf-8");
		const parsed = JSON5.parse(content);
		return {
			name: parsed.name || DEFAULTS.name,
			email: parsed.email || DEFAULTS.email,
			github: parsed.github || DEFAULTS.github,
			linkedin: parsed.linkedin || DEFAULTS.linkedin,
			education: parsed.education || DEFAULTS.education,
			projects: parsed.projects || DEFAULTS.projects,
			lang: parsed.lang || DEFAULTS.lang,
		};
	} catch (err) {
		console.warn(`Warning: Failed to parse defaults.json5: ${err.message}`);
		return DEFAULTS;
	}
}

/**
 * Load and parse a resume JSON5 file
 * @param {string} filePath - Path to resume file
 * @returns {Object} Parsed resume data
 */
export function loadResume(filePath) {
	if (!fs.existsSync(filePath)) {
		throw new Error(`File not found: ${filePath}`);
	}

	const content = fs.readFileSync(filePath, "utf-8");
	try {
		return JSON5.parse(content);
	} catch (err) {
		throw new Error(`Failed to parse ${filePath}: ${err.message}`);
	}
}

/**
 * Load a resume from JSON5 string (for use in browser/Svelte)
 * @param {string} jsonString - JSON5 string
 * @returns {Object} Parsed resume data
 */
export function loadResumeFromString(jsonString) {
	try {
		return JSON5.parse(jsonString);
	} catch (err) {
		throw new Error(`Failed to parse JSON5: ${err.message}`);
	}
}

/**
 * Merge resume data with defaults
 * @param {Object} resume - Resume data
 * @param {Object} defaults - Default values
 * @returns {Object} Merged resume data
 */
export function mergeWithDefaults(resume, defaults) {
	return {
		name: resume.name ?? defaults.name,
		email: resume.email ?? defaults.email,
		github: resume.github ?? defaults.github,
		linkedin: resume.linkedin ?? defaults.linkedin,
		education:
			resume.education !== undefined ? resume.education : defaults.education,
		projects:
			resume.projects !== undefined ? resume.projects : defaults.projects,
		summary: resume.summary || "",
		skills: resume.skills || [],
		experience: resume.experience || [],
		lang: resume.lang || "en",
	};
}

/**
 * Get hardcoded default values
 * @returns {Object} Default resume data
 */
export function getDefaultDefaults() {
	return DEFAULTS;
}
