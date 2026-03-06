# plan-ideas

## Summary
CV/resume generation system with CLI + web UI. Originally a monolithic `pdf.js` script (~360 lines), now refactored into a modular system on the `cli` branch with browser-safe core modules, Handlebars templates, and a SvelteKit web UI with live preview. The refactor is extensive but entirely uncommitted -- the working tree has massive changes (7 modified files, 20+ new untracked files/directories). Deployed to Cloudflare Workers. Intent: revival.

## Action Items
- [ ] Commit the modular refactor on the `cli` branch (huge uncommitted diff -- core system rewrite)
- [ ] Verify the CLI still works: `node pdf.js profile/Experience.json5 output.pdf`
- [ ] Verify the SvelteKit web UI works at `/cv` route
- [ ] Fix Svelte 5 compatibility -- `cv/+page.svelte` uses legacy `$:` reactive statement and `on:click` syntax
- [ ] Wire the web UI to use actual profile data (currently uses placeholder JSON)
- [ ] Set up template serving -- web UI fetches `/templates/default/html.hbs` and `style.css` but templates are in `/templates/` not `/static/templates/default/`
- [ ] Move profile data from `data/` (deleted in diff) to `profile/` (new location) and verify consistency
- [ ] Test Cloudflare Workers deployment with the new modular structure
- [ ] Clean up documentation bloat: MODULARIZATION_SUMMARY.md, SETUP_SUMMARY.md, lib/README.md, lib/SVELTE_EXAMPLE.md, lib/SVELTE_SIMPLE.md, lib/CLOUDFLARE_WORKERS.md -- consolidate or remove

## Detailed Assessment

### Project Status
Major refactor in progress. The system has been split from one file into:

```
pdf.js                  -> 8-line CLI entry point calling lib/cli.js
lib/cli.js              -> CLI orchestration + arg parsing
lib/generate-cv.js      -> high-level API (generatePreview, generatePdfFile, generateCv)
lib/client-pdf.js       -> browser print-to-PDF via iframe
lib/core/resume.js      -> JSON5 parsing + merging (browser-safe)
lib/core/templates.js   -> Handlebars template rendering (browser-safe)
lib/core/html.js        -> HTML generation from resume + template
lib/core/utils.js       -> date/url/experience formatting
lib/core/pdf.js         -> Playwright-based PDF generation (Node only)
lib/core/pdf-cloudflare.js -> Cloudflare Browser Rendering API
```

SvelteKit app added:
- `src/routes/+page.svelte` -- just "Howdy"
- `src/routes/cv/+page.svelte` -- JSON5 editor + live preview + PDF download
- `src/routes/layout.css` -- Tailwind
- `src/lib/` mirrors some core modules for Svelte imports

Profile data moved from `data/` to `profile/`:
- `profile/Experience.json5`, `profile/defaults.json5`, `profile/projects.jsonc`, `profile/work-projects.md`

Templates:
- `templates/html.hbs` -- Handlebars HTML template
- `templates/style.css` -- resume CSS

Additional:
- `pdf.py` -- Python alternative for PDF generation
- Playwright e2e tests scaffolded
- Wrangler config for Cloudflare Workers deploy

### Git Status
Branch: `cli` (synced with origin/cli, 0 ahead / 0 behind)
Dirty: massive uncommitted changes
Modified (7 files):
- `.gitignore` (+9/-1), `.npmrc` (-1 line), `pdf.js` (360 -> 8 lines)
- Deleted: `data/Experience.json5`, `data/defaults.json5`, `data/projects.jsonc`, `data/work-projects.md`
Untracked (20+ items):
- `.rules`, `MODULARIZATION_SUMMARY.md`, `README.md`, `SETUP_SUMMARY.md`
- `e2e/`, `jsconfig.json`, `lib/` (entire modular system), `logs/`
- `package.json`, `playwright.config.js`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- `profile/`, `src/` (entire SvelteKit app), `static/`, `svelte.config.js`, `vite.config.js`, `wrangler.jsonc`

### Last Activity
Last commit: 2025-12-19 ("rearrange" -- on cli branch)
Last file edit: 2026-01-02 (logs/pdf-daemon-error.log), 2025-12-19 for source files

### Existing Plans & TODOs
No PLAN.md, no todos/ folder, no TODO/FIXME in source.
MODULARIZATION_SUMMARY.md outlines "Next Steps":
1. Modularization complete
2. Implement Svelte page using lib/generate-cv.js (partially done)
3. Create API endpoint for PDF generation (not done)
4. Add styling and UX refinements (not done)

SETUP_SUMMARY.md notes Cloudflare Workers PDF generation as optional (can use browser print instead).

### Remaining Work

**Immediate (commit the refactor):**
- Stage and commit all changes on `cli` branch
- This is the most critical action -- 2+ months of work is uncommitted

**Fix the web UI:**
- `src/routes/cv/+page.svelte` uses Svelte 4 syntax (`$:` reactive, `on:click`) -- needs migration to Svelte 5 runes
- Template files need to be accessible from the web (move to `static/templates/default/` or create a server endpoint)
- Resume editor should load from `profile/Experience.json5` as default instead of placeholder

**Consolidate duplicated modules:**
- `lib/core/` and `src/lib/core/` appear to be duplicates -- SvelteKit imports from `$lib/` so only `src/lib/` matters for the web UI
- `lib/` (top-level) is for CLI use -- clarify the boundary

**PDF generation strategy:**
- CLI: Playwright (works, just needs testing)
- Web: three options documented but none fully wired:
	1. Browser print dialog via `client-pdf.js` (simplest)
	2. Server endpoint with Playwright
	3. Cloudflare Browser Rendering API
- Pick one for web and implement it end-to-end

**Deployment:**
- Wrangler config exists but unclear if it deploys correctly with the new structure
- Need to verify `pnpm run deploy` works

**Cleanup:**
- 6 documentation files created during refactor -- most are redundant. Keep at most a single README
- `logs/` directory with daemon logs -- gitignore
- `pdf.py` -- decide if Python PDF path is still needed alongside JS

### Ideas & Considerations
- The modular architecture is well-designed -- browser-safe core with Node-only PDF is the right split
- For revival, the fastest path is: commit, fix Svelte 5 syntax, make templates accessible, verify deploy
- Consider using the profile JSON5 files as the default state in the web editor (load server-side)
- Could add multiple resume versions/templates (the template system supports it)
- A "tailor resume to job posting" feature using LLM could be valuable
- The many git branches (25+) suggest a long history of experiments -- consider cleaning up stale remote branches
