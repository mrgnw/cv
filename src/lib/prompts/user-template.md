# User Prompt Template

Generate a tailored CV for this job description:

## JOB DESCRIPTION:
{jobDescription}

{company ? `## COMPANY: ${company}` : ''}
{title ? `## POSITION: ${title}` : ''}

## EXISTING JOB TITLE CATEGORIES:
{existingJobTitles}

## SOURCE EXPERIENCE DATA:
{experienceData}

## Requirements:
1. Return ONLY valid JSON, no markdown or explanations
2. Use the CV structure with: skills (primary, max ~8–12), secondarySkills (optional), experience, keywords (optional), company (optional), title (optional), normalizedTitle (optional), matchScore (required), matchFactors (optional breakdown), payScale (optional)
3. Each experience must have: title, company, start, end (if applicable), achievements (array of strings), skills (optional array)
4. If company/title were not provided above, extract and suggest them from the job description in the response
5. Extract salary/pay information if mentioned and include in "payScale" field
6. Determine the best matching job title category from the existing ones above, or suggest a new normalized one if none fit
7. Include a "normalizedTitle" field with the chosen category (e.g., "fullstack", "backend", "data")
8. Calculate a "matchScore" (1-10) using a weighted rubric: tech stack (0–4), role fit (0–2), culture/ways of working (0–2), domain (0–1), constraints (0–1). Prefer Svelte 5/SvelteKit 2.x, FastAPI/Python, and TypeScript/Node/Bun. Penalize heavy Microsoft-only ecosystems (Microsoft Azure, Microsoft Teams, SharePoint). Optionally include `matchFactors` with positives, negatives, a `scoreBreakdown` object with these weights, and a 1–2 sentence summary.
9. Tailor achievements to match the job description while staying truthful to the source data
10. Reorder and prioritize experiences and achievements that best match the job requirements
11. Include only the most relevant skills from the source data (deduplicate synonyms). Limit top-level skills and place overflow in `secondarySkills`.
12. Add up to 30 relevant keywords for ATS optimization
13. Focus on measurable achievements and use STAR method where possible

Generate the CV now:
