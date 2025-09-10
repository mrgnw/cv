import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import fs from 'fs/promises';
import path from 'path';
import JSON5 from 'json5';

/** @type {import('./$types').PageServerLoad} */
export async function load() {
	return {};
}

/** @satisfies {import('./$types').Actions} */
export const actions = {
	generate: async ({ request }) => {
		const formData = await request.formData();
		const jobDescription = formData.get('jobDescription')?.toString();
		const company = formData.get('company')?.toString() || '';
		const title = formData.get('title')?.toString() || '';

		if (!jobDescription || jobDescription.length < 50) {
			return fail(400, { error: 'Job description must be at least 50 characters' });
		}

		if (!OPENROUTER_API_KEY) {
			return fail(500, { error: 'OpenRouter API key not configured' });
		}

		try {
			// Load source experience data
			const experienceData = await readExperienceData();
			const existingJobTitles = await getExistingJobTitles();
			
			// Generate CV using OpenRouter
			const cv = await generateCVFromJobDescription({
				jobDescription,
				company,
				title,
				experienceData,
				existingJobTitles
			});

			return {
				success: true,
				cv,
				company,
				title
			};
		} catch (error) {
			console.error('CV generation error:', error);
			return fail(500, { error: 'Failed to generate CV. Please try again.' });
		}
	},

	save: async ({ request }) => {
		const formData = await request.formData();
		const cvData = formData.get('cvData')?.toString();
		const company = formData.get('company')?.toString() || '';
		const title = formData.get('title')?.toString() || '';

		if (!cvData) {
			return fail(400, { error: 'No CV data to save' });
		}

		try {
			const cv = JSON.parse(cvData);
			const result = await saveCVVersion(cv, { company, title });
			
			return {
				success: true,
				filename: result.filename,
				slug: result.slug
			};
		} catch (error) {
			console.error('Save error:', error);
			return fail(500, { error: 'Failed to save CV version' });
		}
	}
};

/**
 * Generate CV from job description using OpenRouter API
 * @param {Object} params
 * @param {string} params.jobDescription
 * @param {string} params.company
 * @param {string} params.title  
 * @param {any} params.experienceData
 * @param {string[]} params.existingJobTitles
 */
async function generateCVFromJobDescription({ jobDescription, company, title, experienceData, existingJobTitles }) {
	const prompt = await buildGenerationPrompt({
		jobDescription,
		company,
		title,
		experienceData,
		existingJobTitles
	});

	const models = [
		'openai/gpt-4.1-mini',
		'google/gemini-2.5-flash', 
		'google/gemini-2.5-pro',
		'openai/gpt-5',
		'anthropic/claude-sonnet-4'
	];

	let lastError;
	
	for (const model of models) {
		try {
			const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
					'Content-Type': 'application/json',
					'X-Title': 'CV Generator'
				},
				body: JSON.stringify({
					model,
					messages: [
						{
							role: 'system',
							content: await getSystemPrompt()
						},
						{
							role: 'user',
							content: prompt
						}
					],
					temperature: 0.7,
					max_tokens: 4000
				})
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.warn(`Model ${model} failed:`, errorText);
				lastError = new Error(`${model}: ${response.status} ${errorText}`);
				continue;
			}

			const result = await response.json();
			const content = result.choices?.[0]?.message?.content;
			
			if (!content) {
				lastError = new Error(`${model}: No content in response`);
				continue;
			}

			// Parse the JSON response
			const cv = parseGeneratedCV(content);
			return cv;

		} catch (error) {
			console.warn(`Model ${model} error:`, error);
			lastError = error;
			continue;
		}
	}

	throw lastError || new Error('All models failed');
}

/**
 * Parse the generated CV content, handling potential JSON formatting issues
 * @param {string} content
 */
function parseGeneratedCV(content) {
	// Remove potential markdown code blocks
	let jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
	
	try {
		const cv = JSON.parse(jsonStr);
		
		// Validate required structure
		if (!cv.experience || !Array.isArray(cv.experience)) {
			throw new Error('Invalid CV structure: missing experience array');
		}

		// Ensure achievements field (not accomplishments)
		cv.experience = cv.experience.map(/** @param {any} exp */ exp => {
			if (exp.accomplishments && !exp.achievements) {
				exp.achievements = exp.accomplishments;
				delete exp.accomplishments;
			}
			if (!exp.achievements || !Array.isArray(exp.achievements)) {
				exp.achievements = [];
			}
			return exp;
		});

		return cv;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to parse generated CV: ${errorMessage}`);
	}
}

/**
 * Save the generated CV as a new version file
 * @param {any} cv
 * @param {Object} params
 * @param {string} params.company
 * @param {string} params.title
 */
async function saveCVVersion(cv, { company, title }) {
	const versionsDir = path.join(process.cwd(), 'src/lib/versions');
	
	// Get normalized job title from CV or fallback to user input
	const jobTitle = cv.normalizedTitle || normalizeJobTitle(title) || 'general';
	const companySlug = normalizeCompanyName(company);
	
	// Create job title folder
	const jobTitleDir = path.join(versionsDir, jobTitle);
	await fs.mkdir(jobTitleDir, { recursive: true });
	
	// Generate filename: company.json5
	const filename = `${companySlug}.json5`;
	const filepath = path.join(jobTitleDir, filename);

	// Format as JSON5
	const json5Content = JSON.stringify(cv, null, 2);
	await fs.writeFile(filepath, json5Content, 'utf8');
	
	const relativePath = `${jobTitle}/${filename}`;
	console.log(`Saved CV version: ${relativePath}`);
	return { 
		filename: relativePath, 
		slug: `${jobTitle}-${companySlug}`,
		jobTitle,
		company: companySlug
	};
}

/**
 * Normalize job title to match existing folder structure
 * @param {string} title
 */
function normalizeJobTitle(title) {
	if (!title) return '';
	
	const normalized = title.toLowerCase().replace(/[^a-z0-9]/g, '');
	
	// Map common variations to existing job titles
	const jobTitleMappings = {
		'fullstack': ['fullstack', 'full-stack', 'fullstackdeveloper', 'fullstackengineer'],
		'backend': ['backend', 'back-end', 'backenddeveloper', 'backendengineer', 'serverside'],
		'data': ['data', 'dataengineer', 'datascientist', 'dataanalyst', 'ml', 'machinelearning'],
		'frontend': ['frontend', 'front-end', 'frontenddeveloper', 'frontendengineer'],
		'dx': ['dx', 'devex', 'developerexperience', 'devtools', 'platform']
	};
	
	for (const [category, variations] of Object.entries(jobTitleMappings)) {
		if (variations.some(variation => normalized.includes(variation))) {
			return category;
		}
	}
	
	// If no match, return the normalized title
	return title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Normalize company name for filename
 * @param {string} company
 */
function normalizeCompanyName(company) {
	if (!company) return 'unknown';
	return company.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Build the generation prompt
 * @param {Object} params
 * @param {string} params.jobDescription
 * @param {string} params.company
 * @param {string} params.title
 * @param {any} params.experienceData
 * @param {string[]} params.existingJobTitles
 */
async function buildGenerationPrompt({ jobDescription, company, title, experienceData, existingJobTitles }) {
	try {
		// Try to load user template file
		const templatePath = path.join(process.cwd(), 'src/lib/prompts/user-template.md');
		let template = await fs.readFile(templatePath, 'utf8');
		
		// Replace template variables
		template = template
			.replace('{jobDescription}', jobDescription)
			.replace('{experienceData}', JSON.stringify(experienceData, null, 2))
			.replace('{existingJobTitles}', existingJobTitles.join(', '));
		
		// Handle optional company and title
		if (company) {
			template = template.replace('{company ? `## COMPANY: ${company}` : \'\'}', `## COMPANY: ${company}`);
		} else {
			template = template.replace('{company ? `## COMPANY: ${company}` : \'\'}', '');
		}
		
		if (title) {
			template = template.replace('{title ? `## POSITION: ${title}` : \'\'}', `## POSITION: ${title}`);
		} else {
			template = template.replace('{title ? `## POSITION: ${title}` : \'\'}', '');
		}
		
		return template;
	} catch (error) {
		console.warn('Could not load user template file, using fallback');
		// Fallback to hardcoded prompt
		return `Generate a tailored CV for this job description:

JOB DESCRIPTION:
${jobDescription}

${company ? `COMPANY: ${company}` : ''}
${title ? `POSITION: ${title}` : ''}

EXISTING JOB TITLE CATEGORIES:
${existingJobTitles.join(', ')}

SOURCE EXPERIENCE DATA:
${JSON.stringify(experienceData, null, 2)}

Requirements:
1. Return ONLY valid JSON, no markdown or explanations
2. Use the CV structure with: skills, experience, keywords (optional), company (optional), title (optional), normalizedTitle (optional), matchScore (required)
3. Each experience must have: title, company, start, end (if applicable), achievements (array of strings), skills (optional array)
4. If company/title were not provided above, extract and suggest them from the job description in the response
5. Determine the best matching job title category from the existing ones, or suggest a new normalized one if none fit
6. Include a "normalizedTitle" field with the chosen category (e.g., "fullstack", "backend", "data")
7. Calculate a "matchScore" (1-10) based on technology stack alignment, company culture, and personal fit
8. Tailor achievements to match the job description while staying truthful to the source data
9. Reorder and prioritize experiences and achievements that best match the job requirements
10. Include relevant skills from the source data that match the job description
11. Add up to 30 relevant keywords for ATS optimization
12. Focus on measurable achievements and use STAR method where possible

MATCH SCORING CRITERIA (1-10 scale):
- High Priority (+2-3): Svelte/SvelteKit, FastAPI, Python, modern web tech, startup culture, remote-first
- Medium Priority (+1): TypeScript, Node.js, API development, full-stack, Docker, modern frameworks
- Neutral (0): Standard enterprise tech, traditional corporate environment
- Negative (-1 to -2): Heavy Microsoft ecosystem (Azure, Teams), legacy tech, overly corporate language

Generate the CV now:`;
	}
}

/**
 * Get the system prompt for CV generation
 */
async function getSystemPrompt() {
	try {
		const promptPath = path.join(process.cwd(), 'src/lib/prompts/system.md');
		return await fs.readFile(promptPath, 'utf8');
	} catch (error) {
		console.warn('Could not load system prompt file, using fallback');
		return `You are an expert CV writer and career consultant. Your task is to generate tailored CVs that match job descriptions while being truthful to the candidate's actual experience.

Key principles:
- Only use achievements and skills that can be reasonably inferred from the source experience data
- Reorder and prioritize content to match job requirements, but don't fabricate
- Use quantifiable achievements and STAR method (Situation, Task, Action, Result) where possible
- Ensure the CV is ATS-friendly with relevant keywords
- Return only valid JSON with no additional text or formatting

CV Structure:
{
  "skills": ["skill1", "skill2", ...],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name", 
      "start": "YYYY-MM-DD",
      "end": "YYYY-MM-DD" (or omit for current role),
      "achievements": ["achievement 1", "achievement 2", ...],
      "skills": ["relevant skills for this role"] (optional)
    }
  ],
  "keywords": ["keyword1", "keyword2", ...] (optional, for ATS),
  "company": "Target Company Name" (optional, extracted from job description),
  "title": "Target Position Title" (optional, extracted from job description)
}`;
	}
}

/**
 * Get existing job title categories from the versions folder
 */
async function getExistingJobTitles() {
	try {
		const versionsDir = path.join(process.cwd(), 'src/lib/versions');
		const entries = await fs.readdir(versionsDir, { withFileTypes: true });
		
		const jobTitles = entries
			.filter(entry => entry.isDirectory())
			.map(entry => entry.name)
			.filter(name => !name.startsWith('.')) // Skip hidden folders
			.sort();
		
		return jobTitles;
	} catch (error) {
		console.warn('Could not read existing job titles:', error);
		return ['backend', 'data', 'fullstack', 'frontend', 'dx']; // fallback
	}
}

/**
 * Read the canonical experience data
 */
async function readExperienceData() {
	try {
		const experiencePath = path.join(process.cwd(), 'src/lib/Experience.json5');
		const content = await fs.readFile(experiencePath, 'utf8');
		
		// Parse JSON5
		return JSON5.parse(content);
	} catch (error) {
		console.error('Failed to read experience data:', error);
		throw new Error('Failed to load experience data');
	}
}
