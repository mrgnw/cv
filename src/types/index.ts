// src/types/index.ts

export interface Experience {
	title: string;
	company: string;
	start: string;
	end?: string;
	description: string[];
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
}

export interface CVProps {
	name: string;
	title: string;
	email: string;
	github: string;
	pdfLink: string;
	experience: ExperienceItem[];
	skills: string[];
	education: EducationItem[];
}