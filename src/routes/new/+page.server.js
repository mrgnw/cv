import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import JSON5 from 'json5';

// Import static files for Cloudflare compatibility
import experienceData from '$lib/Experience.json5?raw';
import systemPromptContent from '$lib/prompts/system.md?raw';
import userTemplateContent from '$lib/prompts/user-template.md?raw';
import prefsJson from '$lib/prefs.json?raw';

/** @type {import('./$types').PageServerLoad} */
export async function load() {
	return {};
}

/** @satisfies {import('./$types').Actions} */
export const actions = {
	extractFromUrl: async ({ request }) => {
		const formData = await request.formData();
		const url = formData.get('url')?.toString();

		if (!url) {
			return fail(400, { error: 'URL is required' });
		}

		try {
			const jobDescription = await extractJobDescriptionFromUrl(url);
			return {
				success: true,
				jobDescription,
				extractedUrl: url
			};
		} catch (error) {
			console.error('URL extraction error:', error);
			return fail(500, { error: 'Failed to extract job description from URL' });
		}
	},

	generate: async ({ request }) => {
		const formData = await request.formData();
		const jobDescription = formData.get('jobDescription')?.toString();
		const company = formData.get('company')?.toString() || '';
		const title = formData.get('title')?.toString() || '';
		const modelOrderJson = formData.get('modelOrder')?.toString();

		if (!jobDescription || jobDescription.length < 50) {
			return fail(400, { error: 'Job description must be at least 50 characters' });
		}

		if (!env.OPENROUTER_API_KEY) {
			return fail(500, { error: 'OpenRouter API key not configured' });
		}

		// Parse model order from frontend
		let modelOrder = [
			'openai/gpt-4.1-mini',
			'google/gemini-2.5-flash', 
			'google/gemini-2.5-pro',
			'openai/gpt-5',
			'anthropic/claude-sonnet-4'
		];

		if (modelOrderJson) {
			try {
				modelOrder = JSON.parse(modelOrderJson);
			} catch (error) {
				console.warn('Failed to parse model order, using default:', error);
			}
		}

		try {
			// Load source experience data
			const experienceData = await readExperienceData();
			const existingJobTitles = await getExistingJobTitles();
			
			// Generate CV using OpenRouter
			const result = await generateCVFromJobDescription({
				jobDescription,
				company,
				title,
				experienceData,
				existingJobTitles,
				modelOrder
			});

			return {
				success: true,
				cv: result.cv,
				company,
				title,
				modelUsed: result.modelUsed,
				generatedAt: result.generatedAt
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
			// Be lenient with incoming JSON
			const cv = JSON5.parse(cvData);
			
			const jobTitle = cv.normalizedTitle || normalizeJobTitle(title) || 'general';
			const companySlug = normalizeCompanyName(company);
			const filename = `${jobTitle}/${companySlug}.json5`;

			// Try to save locally if filesystem is available (dev/local)
			let saved = false;
			let saveError = '';
			try {
				// Dynamic import to avoid bundling on Cloudflare
				const fs = await import('node:fs/promises');
				const path = await import('node:path');
				const baseDir = process.cwd();
				const versionsDir = path.join(baseDir, 'versions', jobTitle);
				await fs.mkdir(versionsDir, { recursive: true });
				const filePath = path.join(versionsDir, `${companySlug}.json5`);
				const content = JSON5.stringify(cv, null, 2);
				await fs.writeFile(filePath, content, 'utf-8');
				saved = true;
				console.log('Saved CV version:', filePath);
			} catch (err) {
				saveError = err instanceof Error ? err.message : String(err);
				console.log('Filesystem save skipped or failed (likely Cloudflare):', saveError);
			}

			// Return plain data; SvelteKit enhance() will wrap with { type: 'success', data }
			return {
				filename,
				slug: `${jobTitle}-${companySlug}`,
				jobTitle,
				company: companySlug,
				saved,
				saveError: saved ? '' : saveError
			};
		} catch (error) {
			// Avoid failing the whole request; return a structured response so the client can display the parse error
			const jobTitle = normalizeJobTitle(title) || 'general';
			const companySlug = normalizeCompanyName(company);
			const filename = `${jobTitle}/${companySlug}.json5`;
			const message = error instanceof Error ? error.message : String(error);
			console.error('Save parse error:', message);
			return {
				filename,
				slug: `${jobTitle}-${companySlug}`,
				jobTitle,
				company: companySlug,
				saved: false,
				saveError: `Failed to parse CV JSON for saving: ${message}`
			};
		}
	}
};

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
 * Extract job description from a URL
 * @param {string} url
 */
async function extractJobDescriptionFromUrl(url) {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

	try {
		// Basic URL validation
		const urlObj = new URL(url);
		if (!['http:', 'https:'].includes(urlObj.protocol)) {
			throw new Error('Invalid URL protocol');
		}

		const response = await fetch(url, {
			signal: controller.signal,
			headers: {
				'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.9',
				'Accept-Encoding': 'gzip, deflate, br',
				'DNT': '1',
				'Connection': 'keep-alive',
				'Upgrade-Insecure-Requests': '1',
				'Sec-Fetch-Dest': 'document',
				'Sec-Fetch-Mode': 'navigate',
				'Sec-Fetch-Site': 'none',
				'Sec-Fetch-User': '?1',
				'Cache-Control': 'max-age=0'
			}
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const html = await response.text();
		
		// Extract job description using multiple strategies
		const jobDescription = extractJobDescriptionFromHTML(html, url);
		
		if (!jobDescription || jobDescription.length < 100) {
			throw new Error('Could not extract meaningful job description from page');
		}

		return jobDescription;
	} catch (error) {
		clearTimeout(timeoutId);
		
		if (error instanceof Error && error.name === 'AbortError') {
			throw new Error('Request timed out after 15 seconds');
		}
		
		const errorMessage = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to extract from URL: ${errorMessage}`);
	}
}

/**
 * Extract job description from HTML content
 * @param {string} html
 * @param {string} url
 */
function extractJobDescriptionFromHTML(html, url) {
	// Remove HTML tags and get text content
	const textContent = html
		.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
		.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
		.replace(/<[^>]+>/g, ' ') // Remove HTML tags
		.replace(/\s+/g, ' ') // Normalize whitespace
		.trim();

	// Try different extraction strategies based on the URL
	if (url.includes('linkedin.com')) {
		return extractLinkedInJobDescription(textContent);
	} else if (url.includes('indeed.com')) {
		return extractIndeedJobDescription(textContent);
	} else if (url.includes('glassdoor.com')) {
		return extractGlassdoorJobDescription(textContent);
	} else {
		return extractGenericJobDescription(textContent);
	}
}

/**
 * Extract job description from LinkedIn text
 * @param {string} text
 */
function extractLinkedInJobDescription(text) {
	// Look for common LinkedIn job description patterns
	const patterns = [
		/About the job(.*?)(?:Show more|Apply|Save|Show less|Skills|Seniority level|$)/is,
		/Job description(.*?)(?:Show more|Apply|Save|Show less|Skills|Seniority level|$)/is,
		/Description(.*?)(?:Show more|Apply|Save|Show less|Skills|Seniority level|$)/is,
		/(?:We are|We're)\s+(?:looking|seeking|hiring)(.*?)(?:Apply|Save|Skills|Requirements|$)/is
	];

	for (const pattern of patterns) {
		const match = text.match(pattern);
		if (match && match[1]) {
			let description = match[1].trim();
			// Clean up common LinkedIn artifacts
			description = description
				.replace(/\s+/g, ' ')
				.replace(/\b(?:Show more|Show less|Apply now|Easy Apply)\b/gi, '')
				.trim();
			
			if (description.length > 100) {
				return description.substring(0, 3000);
			}
		}
	}

	// Fallback: extract text between common markers
	const startMarkers = ['About the job', 'Job description', 'Description', 'Role', 'Position', 'We are looking', 'We\'re looking'];
	const endMarkers = ['Apply', 'Save', 'Show more', 'Skills', 'Requirements', 'Qualifications', 'Seniority level', 'Employment type'];
	
	return extractBetweenMarkers(text, startMarkers, endMarkers);
}

/**
 * Extract job description from Indeed text
 * @param {string} text
 */
function extractIndeedJobDescription(text) {
	const patterns = [
		/Job details(.*?)(?:Apply|Save|Report|$)/is,
		/Full job description(.*?)(?:Apply|Save|Report|$)/is,
		/Description(.*?)(?:Apply|Save|Report|$)/is
	];

	for (const pattern of patterns) {
		const match = text.match(pattern);
		if (match && match[1]) {
			const description = match[1].trim();
			if (description.length > 100) {
				return description.substring(0, 3000);
			}
		}
	}

	return extractBetweenMarkers(text, ['Job details', 'Description'], ['Apply', 'Save', 'Report']);
}

/**
 * Extract job description from Glassdoor text
 * @param {string} text
 */
function extractGlassdoorJobDescription(text) {
	const patterns = [
		/Job Description(.*?)(?:Apply|Save|Report|$)/is,
		/Description(.*?)(?:Apply|Save|Report|$)/is
	];

	for (const pattern of patterns) {
		const match = text.match(pattern);
		if (match && match[1]) {
			const description = match[1].trim();
			if (description.length > 100) {
				return description.substring(0, 3000);
			}
		}
	}

	return extractBetweenMarkers(text, ['Job Description', 'Description'], ['Apply', 'Save', 'Report']);
}

/**
 * Extract job description from generic text
 * @param {string} text
 */
function extractGenericJobDescription(text) {
	// Look for common job posting patterns
	const patterns = [
		/(?:Job|Position|Role)\s+(?:Description|Summary|Details|Overview)(.*?)(?:Apply|Requirements|Qualifications|Skills|$)/is,
		/(?:About|Description|Summary|Overview|Details)(.*?)(?:Apply|Requirements|Qualifications|Skills|$)/is,
		/(?:We are looking|We're looking|Looking for|Seeking)(.*?)(?:Apply|Requirements|Qualifications|Skills|$)/is
	];

	for (const pattern of patterns) {
		const match = text.match(pattern);
		if (match && match[1]) {
			const description = match[1].trim();
			if (description.length > 100) {
				return description.substring(0, 3000);
			}
		}
	}

	// Fallback: try to find the main content area
	const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
	const contentLines = lines.filter(line => 
		line.length > 50 && 
		!line.toLowerCase().includes('cookie') &&
		!line.toLowerCase().includes('privacy') &&
		!line.toLowerCase().includes('navigation')
	);

	if (contentLines.length > 3) {
		return contentLines.slice(0, 20).join(' ').substring(0, 3000);
	}

	throw new Error('Could not identify job description content');
}

/**
 * Extract text between start and end markers
 * @param {string} text
 * @param {string[]} startMarkers
 * @param {string[]} endMarkers
 */
function extractBetweenMarkers(text, startMarkers, endMarkers) {
	const lowerText = text.toLowerCase();
	
	let startIndex = -1;
	for (const marker of startMarkers) {
		const index = lowerText.indexOf(marker.toLowerCase());
		if (index !== -1) {
			startIndex = index + marker.length;
			break;
		}
	}

	if (startIndex === -1) {
		throw new Error('Could not find job description start marker');
	}

	let endIndex = text.length;
	for (const marker of endMarkers) {
		const index = lowerText.indexOf(marker.toLowerCase(), startIndex);
		if (index !== -1 && index < endIndex) {
			endIndex = index;
		}
	}

	const extracted = text.substring(startIndex, endIndex).trim();
	if (extracted.length < 100) {
		throw new Error('Extracted content too short');
	}

	return extracted.substring(0, 3000);
}

/**
 * Generate CV from job description using OpenRouter API
 * @param {Object} params
 * @param {string} params.jobDescription
 * @param {string} params.company
 * @param {string} params.title  
 * @param {any} params.experienceData
 * @param {string[]} params.existingJobTitles
 * @param {string[]} params.modelOrder
 */
async function generateCVFromJobDescription({ jobDescription, company, title, experienceData, existingJobTitles, modelOrder }) {
	const prompt = await buildGenerationPrompt({
		jobDescription,
		company,
		title,
		experienceData,
		existingJobTitles,
		prefs: await getPrefs()
	});

	// Use provided model order, fallback to default
	const models = modelOrder || [
		'openai/gpt-4.1-mini',
		'google/gemini-2.5-flash', 
		'google/gemini-2.5-pro',
		'openai/gpt-5',
		'anthropic/claude-sonnet-4'
	];

	let lastError;
	const generatedAt = new Date().toISOString();
	
	for (const model of models) {
		try {
			const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
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
			
			// Add generation metadata
			cv.metadata = {
				modelUsed: model,
				generatedAt: generatedAt,
				modelOrder: models
			};
			
			return {
				cv: cv,
				modelUsed: model,
				generatedAt: generatedAt
			};

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
	// Remove potential markdown code fences and trim
	let cleaned = content.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();

	// If the model wrapped extra text around JSON, try to isolate the outermost JSON object
	const firstBrace = cleaned.indexOf('{');
	const lastBrace = cleaned.lastIndexOf('}');
	if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
		cleaned = cleaned.slice(firstBrace, lastBrace + 1);
	}

	// Try strict JSON first, then fall back to JSON5 for leniency (trailing commas, comments, etc.)
	let cv;
	try {
		cv = JSON.parse(cleaned);
	} catch (e1) {
		try {
			cv = JSON5.parse(cleaned);
		} catch (e2) {
			const msg1 = e1 instanceof Error ? e1.message : String(e1);
			const msg2 = e2 instanceof Error ? e2.message : String(e2);
			throw new Error(`Failed to parse generated CV: ${msg1}; JSON5 fallback: ${msg2}`);
		}
	}

	// Validate required structure
	if (!cv.experience || !Array.isArray(cv.experience)) {
		throw new Error('Failed to parse generated CV: Invalid CV structure: missing experience array');
	}

	// Ensure achievements field (not accomplishments)
	cv.experience = cv.experience.map(/** @param {any} exp */ (exp) => {
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
}

/**
 * Build the generation prompt
 * @param {Object} params
 * @param {string} params.jobDescription
 * @param {string} params.company
 * @param {string} params.title
 * @param {any} params.experienceData
 * @param {string[]} params.existingJobTitles
 * @param {any} params.prefs
 */
async function buildGenerationPrompt({ jobDescription, company, title, experienceData, existingJobTitles, prefs }) {
	try {
		// Use imported template content instead of reading from filesystem
		let template = userTemplateContent;
		
		// Replace template variables
			template = template
			.replace('{jobDescription}', jobDescription)
			.replace('{experienceData}', JSON.stringify(experienceData, null, 2))
				.replace('{existingJobTitles}', existingJobTitles.join(', '));

			// Inject preferences (weights, signals, skill caps)
			template += `\n\n## PREFERENCES (for calibration, not part of output):\n${JSON.stringify(prefs, null, 2)}\n`;
		
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
		console.warn('Could not process user template, using fallback');
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
2. Use the CV structure with: skills, experience, keywords (optional), company (optional), title (optional), normalizedTitle (optional), matchScore (required), payScale (optional)
3. Each experience must have: title, company, start, end (if applicable), achievements (array of strings), skills (optional array)
4. If company/title were not provided above, extract and suggest them from the job description in the response
5. Extract salary/pay information if mentioned and include in "payScale" field (e.g., "$80k-$100k", "€60-80k")
6. Determine the best matching job title category from the existing ones, or suggest a new normalized one if none fit
7. Include a "normalizedTitle" field with the chosen category (e.g., "fullstack", "backend", "data")
8. Calculate a "matchScore" (1-10) based on technology stack alignment, company culture, and personal fit
9. Tailor achievements to match the job description while staying truthful to the source data
10. Reorder and prioritize experiences and achievements that best match the job requirements
11. Include relevant skills from the source data that match the job description
12. Add up to 30 relevant keywords for ATS optimization
13. Focus on measurable achievements and use STAR method where possible

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
		// Use imported system prompt content instead of reading from filesystem
		return systemPromptContent;
	} catch (error) {
		console.warn('Could not load system prompt, using fallback');
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

/** Read user preferences (static import of JSON raw) */
async function getPrefs() {
	try {
		return JSON.parse(prefsJson);
	} catch (e) {
		return {
			weights: { techStack: 4, role: 2, culture: 2, domain: 1, constraints: 1 },
			positives: { tech: ["Svelte 5", "SvelteKit 2", "FastAPI", "Python", "TypeScript", "Node.js", "Bun"] },
			negatives: { ecosystem: ["Microsoft Azure", "Microsoft Teams", "SharePoint"] },
			skills: { maxPrimary: 10, maxPerExperience: 5 }
		};
	}
}

/**
 * Get existing job title categories from the versions folder
 */
async function getExistingJobTitles() {
	try {
		// Return hardcoded job titles for Cloudflare compatibility
		// These are the common job categories we support
		return ['backend', 'data', 'fullstack', 'frontend', 'dx', 'devops', 'mobile', 'ml', 'security', 'qa'];
	} catch (error) {
		console.warn('Could not get existing job titles:', error);
		return ['backend', 'data', 'fullstack', 'frontend', 'dx']; // fallback
	}
}

/**
 * Read the canonical experience data
 */
async function readExperienceData() {
	try {
		// Use imported experience data instead of reading from filesystem
		return experienceData;
	} catch (error) {
		console.error('Failed to read experience data:', error);
		throw new Error('Failed to load experience data');
	}
}
