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
2. Use the CV structure with: skills, experience, keywords (optional), company (optional), title (optional), normalizedTitle (optional)
3. Each experience must have: title, company, start, end (if applicable), achievements (array of strings), skills (optional array)
4. If company/title were not provided above, extract and suggest them from the job description in the response
5. Determine the best matching job title category from the existing ones above, or suggest a new normalized one if none fit
6. Include a "normalizedTitle" field with the chosen category (e.g., "fullstack", "backend", "data")
7. Tailor achievements to match the job description while staying truthful to the source data
8. Reorder and prioritize experiences and achievements that best match the job requirements
9. Include relevant skills from the source data that match the job description
10. Add up to 30 relevant keywords for ATS optimization
11. Focus on measurable achievements and use STAR method where possible

Generate the CV now:
