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
	pdfLink: string;
	experience: Array<Experience>;
	skills: string[];
	education: Array<{
		degree: string;
		provider: string;
		summary?: string;
		year: string;
	}>;
}

