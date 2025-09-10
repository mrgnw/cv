# User Prompt Template

Generate a tailored CV for this job description:

## JOB DESCRIPTION:
{jobDescription}

{company ? `## COMPANY: ${company}` : ''}
{title ? `## POSITION: ${title}` : ''}

## SOURCE EXPERIENCE DATA:
{experienceData}

## Requirements:
1. Return ONLY valid JSON, no markdown or explanations
2. Use the CV structure with: skills, experience, keywords (optional)
3. Each experience must have: title, company, start, end (if applicable), achievements (array of strings), skills (optional array)
4. Tailor achievements to match the job description while staying truthful to the source data
5. Reorder and prioritize experiences and achievements that best match the job requirements
6. Include relevant skills from the source data that match the job description
7. Add up to 30 relevant keywords for ATS optimization
8. Focus on measurable achievements and use STAR method where possible

Generate the CV now:
