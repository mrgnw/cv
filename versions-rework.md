# Versions Rework

Goal: Support many targeted resume versions while keeping public URLs flat & simple.

## File Layout
- Base version: `src/lib/versions/main.(json|json5|jsonc)` (required).
- Generic role versions: `src/lib/versions/<job_title>.<ext>`.
- Company-specific versions: `src/lib/versions/<job_title>/<company>.<ext>`.
- (Ignore previous multi-language `.es` files for now.)

## Slug Generation (Public Route `/[slug]`)
1. Parse every file under `versions/**/*.{json,json5,jsonc}`.
2. Extract: `job_title`, optional `company`.
3. Slug candidates:
   - If company present and its normalized name appears only once → `company`.
   - If company appears multiple times (multiple roles) → `company-job`.
   - Generic (no company) → `job`.
   - `main` is reserved for the base file only.
4. Normalization: lowercase; trim; spaces/underscores → dash; strip leading/trailing punctuation; collapse multiple dashes.
5. Collision → build-time error (fail fast).

## Data Assembly
- All versions parsed eagerly at build into `versionMap` & `metaMap`.
- `coalesceVersion(slug)` merges chosen version over `main`:
  - Shallow merge of top-level fields (except `projects`).
  - `experience` arrays merged index-wise (keep existing description merge logic).
  - `projects` resolved only from the specific version (not inherited) via shared projects list (cache once).

## Exposed API (Planned)
- `getVersion(slug)` → raw merged data (already coalesced or direct? decided: keep separate: raw map + coalesce for merging).
- `coalesceVersion(slug)` → merged with `main`.
- `getAllVersions()` → string[] slugs.
- `getAllVersionMeta()` → array of `{ slug, job, company, path, sourceType }`.

## PDF Links
- Pattern: `slug === 'main' ? '/morgan-williams.pdf' : '/morgan-williams.' + slug + '.pdf'`.

## Future: Descriptions Sync
- Planned layout: `descriptions/<job_title>/<company>/` (company-specific) and `descriptions/<job_title>/` (generic).
- Use `VersionMeta.job` & `VersionMeta.company` for mapping.

## Simplifications
- Removed language toggle & `.es` handling (can reintroduce later with parallel mechanism, not special-casing in slugs now).
- One parsing pass; project file(s) parsed once & cached.

## Edge Rules / Validation
- Missing `main` → error.
- Duplicate (job, company) pair or multiple extensions for same target → error.
- Slug collision after normalization → error.
- Adding a second role for a company upgrades first slug from `company` to `company-job` only if you choose to regenerate; accepted trade-off (documented risk). Optionally preempt by always using `company-job`; current choice: shorter unique slug.

## Implementation Order (Brief)
1. Refactor `versionReader.ts` (glob recursion, slug algo, metadata, caching, validation).
2. Adjust route load to new `coalesceVersion` (no language branches).
3. Simplify `EngCV.svelte` (remove direct JSON import & language switcher; rely on props).
4. Update PDF generation if it enumerates slugs.
5. (Optional) Add a dev-only console/table listing of slugs & sources.

---
Keep this file concise; extend only if requirements materially change.
