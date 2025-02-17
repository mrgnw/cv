export interface Project {
    name: string;
    url: string;
    description: string;
}

export interface Experience {
    title: string;
    company: string;
    start: string;
    end?: string;
    description: string[];
    stack?: string[];
}

export interface Education {
    degree: string;
    provider: string;
    year: string;
    summary?: string;
}

export interface CVProps {
    name?: string;
    title?: string;
    email?: string;
    github?: string;
    pdfLink?: string;
    projects?: Project[];
    experience?: Experience[];
    skills?: string[];
    education?: Education[];
    version?: string;
    lang?: 'en' | 'es';
}
