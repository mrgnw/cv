// src/types/index.ts

export interface Experience {
	title: string;
	company: string;
	start: string;
	end?: string;
	description: string[];
	stack?: string[];
}
export interface Project {
	name: string;
	localized_name?: string;
	url: string;
	description: string;
	stack?: string[];
}

export interface RawCVData {
	name: string;
	title: string;
	email: string;
	github: string;
	experience: Array<Experience>;
	skills: string[];
	education: Array<{
		degree: string;
		provider: string;
		summary?: string;
		year: string;
	}>;
	projects?: (string | Project)[];  // Can be either project names or full definitions
	pdfLink?: string;
}

export interface CVData {
	name: string;
	title: string;
	email: string;
	github: string;
	experience: Array<Experience>;
	skills: string[];
	education: Array<{
		degree: string;
		provider: string;
		summary?: string;
		year: string;
	}>;
	projects: Project[];  // Required: should be resolved by coalesceVersion
	pdfLink?: string;  // Added for dynamic PDF link generation
}

export interface ExperienceItem {
	title: string;
	company: string;
	start: string;
	end?: string;
	description: string[];
}

export interface EducationItem {
	degree: string;
	provider: string;
	summary?: string;
	year: string;
	achievements?: string[];
}

export interface VersionMeta {
	slug: string;
	job: string | null;
	company: string | null;
	path: string;
	sourceType: 'generic' | 'scoped' | 'base';
}

export interface CVProps {
	name: string;
	title: string;
	email: string;
	github: string;
	projects: Project[];  // Required and fully resolved
	experience: ExperienceItem[];
	skills: string[];
	education: EducationItem[];
	pdfLink?: string;
	version?: string;
	lang?: string;
}
