I’ve reviewed your plan and scanned the repo to map where this fits; here’s a concise, end-to-end approach without writing any code yet.

## Checklist of requirements

- Create route /new in our Svelte 5 project. /new will accept a job description as input and generates a CV template using an LLM to tailor existing experience/skills to the job description.
- Use OpenRouter to run the llm, use=ing one of the models that we specify: ['openai/gpt-4.1-mini', 'google/gemini-2.5-flash', 'google/gemini-2.5-pro', 'openai/gpt-5', 'anthropic/claude-sonnet-4']
  - The LLM uses [Experience.json5](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) as the source of truth for past experiences.
  - The LLM will ouput JSON following our template structure:
    - overall skills (filtered/relevant)
    - Keywords (additional skills that may be useful for SEO/ATS, but not necessary in the main skills section). There can be up to 30 of these.
    - previous work experience details: All of our previous work experience items, with updates to skills and achievements that match the job description while also being realistic to my actual experience in Experience.json5
      - Prioritize items matching the JD (reordering within jobs and experiences).
      - Exclude irrelevant skills; only add skills if they're relevant to the job description and also related to my existing skills

Version 1 will display the generated JSON side-by-side with the JD on a Svelte page.

versoion 2 will also save the generated JSON5 into `src/lib/versions/{job_position}/{company}` for the PDF pipeline; naming/slugging should fit existing version mapping.

## What’s in the codebase now (relevant pieces)

- Versions and schema:
  - Current versions live under `src/lib/versions/**.{json,json5,jsonc}` (e.g., [main.json](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html), [allianz.json5](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html), [allianz.json5](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html), etc.).
  - [versionReader.ts](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html):
    - Loads all versions dynamically, supports JSON/JSON5/JSONC.
    - Migrates [description](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) → [accomplishments](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) automatically.
    - Merges a chosen version with [main](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) via [coalesceVersion(slug)](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) including projects resolution.
    - Slugging rules match your existing PDF names and routing.
  - Types ([index.ts](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html)): [Experience](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) has [accomplishments: string[\]; skills?: string[];](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) but no per-experience `keywords` yet. [CV](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) has top-level [skills](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html), [experience](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html), etc.
  - [Experience.json5](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html): canonical, deduped accomplishments across roles—good feedstock for prompting.
- Rendering and routes:
  - [CV.svelte](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) renders top-level [skills](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html), [experience[*\].accomplishments](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html), and projects. It doesn’t currently display per-experience `keywords`, which is fine if those are “invisible/ATS-only”.
  - [+page.server.ts](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) uses [coalesceVersion(slug)](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) to serve versions for preview/PDF.
- PDF pipeline:
  - [pdf-version-reader.js](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) (Node runtime) mirrors the TS version loader and enforces slug rules.
  - [pdf-cli.js](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) supports selective regeneration, `--list`, `--watch`, `--changed`, etc. File outputs go to `static/*.pdf`.
  - Dev API to trigger generation: [+server.ts](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html).
- Runtime/deploy:
  - we don't need to run the dev server, it's always running at cv.skate-in.ts.net and autorestarts when we change anything
  - [svelte.config.js](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) switches to adapter-node in dev/docker; cloudflare adapter otherwise. File writes in dev/docker are fine because the container mounts the workspace (`.:/app`). Writing at runtime on Cloudflare won’t be possible (we’ll keep the generator dev-only initially).

## Fit to your plan

- Data contract for generated “template”:
  - Use existing [CV](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) shape and [Experience](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) structure. Prefer the field name [accomplishments](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) to align with renderers and migration logic. If the LLM returns [achievements](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html), we’ll post-process to [accomplishments](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html).
  - Per-experience [skills](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) is supported today ([Experience.skills?: string[\]](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html)).
  - - 
- Source inputs:
  - Job description (user-pasted).
  - [Experience.json5](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) (authoritative accomplishments).
- Prioritization and filtering:
  - Prompt the LLM to rank skills and accomplishments by JD relevance and keep the count tight (top N). Also request it to constrain to skills I have demonstrable history with (list provided from repo).
  - Post-process safety net: compute a simple relevance score from JD keyword overlap to reorder or drop stragglers (keeps output consistent across models).
- Model routing and prompts:
  - Use OpenRouter’s routing with a prioritized model list:
    - ['openai/gpt-4.1-mini', 'google/gemini-2.5-flash', 'google/gemini-2.5-pro', 'openai/gpt-5', 'anthropic/claude-sonnet-4']
  - Response constraints:
    - JSON/JSON5, no comments, no markdown fences.
    - Include guidance for STAR-style bullet quality and measurable impact.
  - Integrate prompts that we specify in separate files (e.g., `src/lib/prompts/*.txt|.md`) to simplify maintenance.
  - API key via [.env](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) (server-only), accessed with SvelteKit server env APIs (no client exposure).
- v1 UI:
  - A new Svelte page with:
    - Left: JD paste area. Pasting into the area triggers the CV template generation
    - Right: JSON preview (syntax-highlighted) and optionally a live CV preview using [CV.svelte](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) with the generated data (non-persisted).
  - Server endpoint to call OpenRouter and return structured JSON.
- v2 persistence:
  - Save to `src/lib/versions/{job_slug}/{company_slug}.json5` (or top-level `{slug}.json5` when unscoped).
  - Slug generation must match `versionReader` rules:
    - If nested job/company, the slug becomes [company](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) or [company-job](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) if there are multiple entries for that company.
  - Docker dev server can write to the mounted repo path; for now, this is sufficient for our needs; we do not need to worry about other deployment environments yet.

## Minimal “contract” for the generator

- Input:
  - jobDescription: string
  - options: { title?: string; company?: string; maxExperiences?: number; language?: 'en' | 'es' }
- Internal data:
  - experienceSource: parsed [Experience.json5](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html)
  - baseline skills: from [main.json](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) (skills) + optionally tools
- Output:
  - JSON object matching [CV](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) subset:
    - skills: string[]
    - experience: up to N items with { title, company?, start, end?, skills?, accomplishments: string[], keywords?: string[] }
    - keywords?: string[] (global)
    - optional title and company field to aid naming
- Errors:
  - Non-JSON output, empty result, or unsafe fields → respond 400 with a clear message.

## Storage and PDF integration

- On save, write JSON5 to `src/lib/versions/{job}/{company}.json5` (no comments), using the same path shape your PDF tooling already watches.
- The existing PDF pipeline will auto-detect the new version, generate the correct slug, and produce the PDF in [static](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html).

## Security and environment

- Server-only endpoint for OpenRouter calls; [.env](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) key read via SvelteKit’s private env accessors.
- No client-side exposure of the key; rate-limit or debounce generate calls to avoid accidental spam.

## Edge cases to handle

- JD with minimal detail: fall back to strongest accomplishments from [Experience.json5](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html).
- Missing start/end dates: allow omission of [end](vscode-file://vscode-app/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) for current roles; ensure ISO date strings for consistency.
- Non-ASCII characters or model hallucinations: validate fields against allowlists (skills set derived from repo) and strip unknowns unless closely related.

## Proposed next steps

- Confirm: per-experience `keywords` should be saved in the version files (hidden in print) — OK to add to types?
  - we don't need per-experience keywords, those should only be per CV.
- Confirm: target route path for the generator UI (e.g., `/new`).
- I’ll then implement:
  - Server route for OpenRouter generation with model routing and strict JSON output.
  - A simple Svelte 5 page (split view) to paste JD and preview generated JSON (and optional live CV render).
  - Save endpoint that writes into `src/lib/versions/...` with proper slugging and JSON5 formatting.
  - Prompts organized under `src/lib/prompts/` with STAR guidance and schema rules.

Requirements coverage: all items accounted for; per-experience keywords will require a small type extension. If you confirm the two points above, I can proceed with the implementation.



## Added functionality after:

- llm suggests
  - company/job title
  - pay range
  - rate my match to my current skills