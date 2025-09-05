// Node.js compatible version reader for PDF generation
import fs from 'fs';
import path from 'path';
import JSON5 from 'json5';

/**
 * Normalize a string to be a valid URL slug
 */
function normalizeSlug(str) {
	return str
		.toLowerCase()
		.trim()
		.replace(/[\s_]+/g, '-')
		.replace(/[^\w-]/g, '')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Parse a version file path to extract job title and company
 */
function parseVersionPath(filePath) {
	const relativePath = path.relative('src/lib/versions', filePath);
	const pathWithoutExt = relativePath.replace(/\.(json[c5]?)$/, '');
	
	// Handle main file
	if (pathWithoutExt === 'main') {
		return { job: null, company: null, sourceType: 'base' };
	}
	
	// Check if it's nested (job/company)
	const parts = pathWithoutExt.split(path.sep);
	if (parts.length === 2) {
		return { job: parts[0], company: parts[1], sourceType: 'scoped' };
	} else if (parts.length === 1) {
		return { job: parts[0], company: null, sourceType: 'generic' };
	}
	
	throw new Error(`Unexpected path structure: ${filePath}`);
}

/**
 * Get all version files recursively
 */
function getVersionFiles(dir) {
	const files = [];
	const items = fs.readdirSync(dir, { withFileTypes: true });
	
	for (const item of items) {
		const fullPath = path.join(dir, item.name);
		if (item.isDirectory()) {
			files.push(...getVersionFiles(fullPath));
		} else if (/\.(json[c5]?)$/.test(item.name) && !item.name.includes('.es.')) {
			// Skip Spanish versions as per our plan
			files.push(fullPath);
		}
	}
	
	return files;
}

/**
 * Get all available version slugs (Node.js compatible)
 */
// Internal caches to avoid re-walking filesystem repeatedly
let _cached = null;
let _cachedMTimeSignature = '';

function computeDirSignature(dir) {
	const files = getVersionFiles(dir);
	const stats = files.map(f => fs.statSync(f).mtimeMs).join('|');
	return stats;
}

function buildCache() {
	const versionsDir = path.join('src', 'lib', 'versions');
	if (!fs.existsSync(versionsDir)) {
		return { versions: [], meta: [], map: {} };
	}
	const files = getVersionFiles(versionsDir);
	const tempEntries = [];
	for (const filePath of files) {
		try {
			const { job, company, sourceType } = parseVersionPath(filePath);
			if (job === 'es' && !company) continue; // skip Spanish base if any
			tempEntries.push({ filePath, job, company, sourceType });
		} catch (err) {
			console.error('Error parsing version path', filePath, err);
		}
	}
	const companyCount = new Map();
	tempEntries.forEach(e => {
		if (e.company) {
			const c = normalizeSlug(e.company);
			companyCount.set(c, (companyCount.get(c) || 0) + 1);
		}
	});
	const slugConflicts = new Map();
	const slugToEntry = new Map();
	for (const entry of tempEntries) {
		let slug;
		if (entry.sourceType === 'base') {
			slug = 'main';
		} else if (entry.company) {
			const normalizedCompany = normalizeSlug(entry.company);
			const normalizedJob = normalizeSlug(entry.job);
			if (companyCount.get(normalizedCompany) === 1) {
				slug = normalizedCompany;
			} else {
				slug = `${normalizedCompany}-${normalizedJob}`;
			}
		} else {
			slug = normalizeSlug(entry.job);
		}
		if (slugConflicts.has(slug)) {
			slugConflicts.get(slug).push(entry.filePath);
		} else {
			slugConflicts.set(slug, [entry.filePath]);
		}
		slugToEntry.set(slug, entry);
	}
	for (const [slug, paths] of slugConflicts) {
		if (paths.length > 1) throw new Error(`Slug collision detected for "${slug}": ${paths.join(', ')}`);
	}
	const versions = Array.from(slugToEntry.keys());
	const meta = versions.map(slug => {
		const entry = slugToEntry.get(slug);
		return {
			slug,
			job: entry.job,
			company: entry.company,
			path: entry.filePath,
			sourceType: entry.sourceType
		};
	});
	const map = {};
	for (const m of meta) map[m.slug] = m.path;
	return { versions, meta, map };
}

function ensureCache() {
	const versionsDir = path.join('src', 'lib', 'versions');
	const sig = fs.existsSync(versionsDir) ? computeDirSignature(versionsDir) : '';
	if (!_cached || sig !== _cachedMTimeSignature) {
		_cached = buildCache();
		_cachedMTimeSignature = sig;
	}
}

export function getAllVersions() {
	ensureCache();
	return _cached.versions;
}

/**
 * Get version metadata (simplified for PDF generation)
 */
export function getAllVersionMeta() {
	ensureCache();
	return _cached.meta;
}

export function getVersionFileMap() {
	ensureCache();
	return { ..._cached.map };
}

