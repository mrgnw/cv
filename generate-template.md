## preparation

1) refactor: 
   - [x] experience.stack -> skills (done)
   - [x] experience.description -> accomplishments

2. prep:
   - [x] create Experience.json5 from our existing resumes

# Generate template from job description

We are adding a way to enter a job description, then generate a resume template using my existing skills and experience and tailing it to the job description provided.

We use modern svelte 5. Do not write any javascript code until you confirm with me that you understand what Svelte 5 is.

A template containing our previous experience will be in src/lib/Experience.json5.

Your task is to combine my reference from Experience.json5 and the job description provided, to create a new template.

## Template structure

The template contains:

- skills (python, SQL, etc), 
- multiple `experience` items (up to 5 usually), each of which is a previous job with:
  - title
  -  `start` date
  -  `end` date (optional)
  - skills
  - achievements
  - keywords (invisible on the printed resume, but still used for SEO and ATS)

 Here's an example:

```json
{
"skills": ["Python","PostgreSQL","JavaScript","Svelte","AWS","Linux","ETL"],
"experience": [
{
"title": "Data Engineering Consultant",
"company": "National Care Dental",
"start": "2022-05-01",
"skills": ["Python", "AWS", "ETL", "SQL", "APIs", "Mentoring"],
"achievements": [
"Designed and implemented data infrastructure and pipelines, enabling faster business operations and enhanced data insights while cutting costs significantly.",
"Transitioned legacy workflows to modern data pipelines, accelerating tasks by 100x to 1000x through automation, reducing multi-hour processes to seconds or milliseconds.",
"Mentored data analysts in Python and SQL, expanding their skills and capabilities, resulting in a substantial increase in productivity."
]
},
// ...
"keywords": ["experienced","docker"]
}

```

Items that match the job description should be prioritized, putting them higher in the list of that job experience.

You can exclude skills from the output if they are not relevant. You can add skills if they are related to what I already have, but try not to add things that I haven't actually done.

## Generation methodology

### LLM using OpenRouter

We will use [OpenRouter](https://openrouter.ai/docs/) to prompt the LLM for our output. We will get the OPENROUTER_API_KEY from our project's .env file to use in the API calls.

#### Models

We will provide a short list of [models](https://openrouter.ai/docs/features/model-routing) to use. For now we'll start with `['openai/gpt-4.1-mini', 'google/gemini-2.5-flash', 'google/gemini-2.5-pro', 'openai/gpt-5', 'anthropic/claude-sonnet-4']`

#### Prompts

We will add prompts to improve the output. 1) we want the output to be in json/json5, and not to include any comments, and 2) we will provide guidance on how to write good achievements (e.g. using the STAR method). 

We can include the prompts in separate files if it keeps our code clean and easy to read and maintain, then load them at relevant points in the workflow.

## Output v1: Just output the json and display it on a svelte page, next to the component where we paste the job description

## Output v2: save the output

- using the title, save the output json5 in a way that fits our workflow for generating pdfs

  - title can come from an input on the page, or maybe the LLM can add a 'title' field its output that we can set as the value for that input.

  

Saving the file: we currently read versions from src/lib/versions/{job_position}/{company}. The server that we primarily use runs in docker — if it will have access to save files to that directory, we can continue to do that and save directly to that directory. If not, we may need to find another way to store files in a way that we can both read and write directly from our svelte application.

# Future

Do not write code for this until the previous items are accomplished, but if we can make design decision that make it easier to add these later without adding complexity now, let's talk about it.

### Edit versions directly: 

The ability to edit individual items in a job experience, which will then update the version file. We can also make it regenerate the pdf automatically on "save" (cmd+s). We would show a toast on save.

### 

