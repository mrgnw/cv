// src/types/index.ts

export interface Experience {
	title: string;
	company: string;
	start: string;
	end?: string;
	accomplishments: string[];
	skills?: string[];
}
export interface Project {
	name: string;
	localized_name?: string;
	url: string;
	description: string;
	skills?: string[];
}

export interface CV {
	name: string;
	title: string;
	email: string;
	github: string;
	experience: Experience[];
	skills: string[];
	education: EducationItem[];
	projects?: (string | Project)[];  // Can be strings (raw) or full objects
	resolvedProjects?: Project[];     // Fully resolved projects (computed)
	pdfLink?: string;
	version?: string;
	lang?: string;
	variant?: 'modern' | 'traditional';
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
