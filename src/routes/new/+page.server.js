import { fail, redirect } from '@sveltejs/kit';
import { OPENROUTER_API_KEY } from '$env/static/private';
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
			
			// Generate CV using OpenRouter
			const cv = await generateCVFromJobDescription({
				jobDescription,
				company,
				title,
				experienceData
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
 */
async function generateCVFromJobDescription({ jobDescription, company, title, experienceData }) {
	const prompt = await buildGenerationPrompt({
		jobDescription,
		company,
		title,
		experienceData
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
	
	// Generate filename based on company and title
	const slug = generateVersionSlug({ company, title });
	const filename = `${slug}.json5`;
	const filepath = path.join(versionsDir, filename);

	// Ensure the directory exists
	await fs.mkdir(versionsDir, { recursive: true });

	// Format as JSON5 (basically JSON with better formatting)
	const json5Content = JSON.stringify(cv, null, 2);

	await fs.writeFile(filepath, json5Content, 'utf8');
	
	console.log(`Saved CV version: ${filename}`);
	return { filename, slug };
}

/**
 * Generate a slug for the version filename
 * @param {Object} params
 * @param {string} params.company
 * @param {string} params.title
 */
function generateVersionSlug({ company, title }) {
	const parts = [];
	
	if (company) {
		parts.push(company.toLowerCase().replace(/[^a-z0-9]/g, '-'));
	}
	
	if (title) {
		parts.push(title.toLowerCase().replace(/[^a-z0-9]/g, '-'));
	}
	
	if (parts.length === 0) {
		// Fallback to timestamp if no company/title
		parts.push(`generated-${Date.now()}`);
	}
	
	return parts.join('-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Build the generation prompt
 * @param {Object} params
 * @param {string} params.jobDescription
 * @param {string} params.company
 * @param {string} params.title
 * @param {any} params.experienceData
 */
async function buildGenerationPrompt({ jobDescription, company, title, experienceData }) {
	return `Generate a tailored CV for this job description:

JOB DESCRIPTION:
${jobDescription}

${company ? `COMPANY: ${company}` : ''}
${title ? `POSITION: ${title}` : ''}

SOURCE EXPERIENCE DATA:
${JSON.stringify(experienceData, null, 2)}

Requirements:
1. Return ONLY valid JSON, no markdown or explanations
2. Use the CV structure with: skills, experience, keywords (optional)
3. Each experience must have: title, company, start, end (if applicable), achievements (array of strings), skills (optional array)
4. Tailor achievements to match the job description while staying truthful to the source data
5. Reorder and prioritize experiences and achievements that best match the job requirements
6. Include relevant skills from the source data that match the job description
7. Add up to 30 relevant keywords for ATS optimization
8. Focus on measurable achievements and use STAR method where possible

Generate the CV now:`;
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
  "keywords": ["keyword1", "keyword2", ...] (optional, for ATS)
}`;
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
