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
export function getAllVersions() {
	const versionsDir = path.join('src', 'lib', 'versions');
	
	if (!fs.existsSync(versionsDir)) {
		console.error('Versions directory not found:', versionsDir);
		return [];
	}
	
	const files = getVersionFiles(versionsDir);
	const tempEntries = [];
	
	// Parse all files
	for (const filePath of files) {
		try {
			const { job, company, sourceType } = parseVersionPath(filePath);
			// Skip the 'es' file as it's a Spanish version
			if (job === 'es' && !company) continue;
			
			tempEntries.push({ filePath, job, company, sourceType });
		} catch (error) {
			console.error(`Error parsing path ${filePath}:`, error);
		}
	}
	
	// Count company occurrences
	const companyCount = new Map();
	tempEntries.forEach(entry => {
		if (entry.company) {
			const normalizedCompany = normalizeSlug(entry.company);
			companyCount.set(normalizedCompany, (companyCount.get(normalizedCompany) || 0) + 1);
		}
	});
	
	// Generate slugs and check for collisions
	const slugConflicts = new Map();
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
		
		// Track collisions
		if (slugConflicts.has(slug)) {
			slugConflicts.get(slug).push(entry.filePath);
		} else {
			slugConflicts.set(slug, [entry.filePath]);
		}
	}
	
	// Validate no conflicts
	for (const [slug, paths] of slugConflicts) {
		if (paths.length > 1) {
			throw new Error(`Slug collision detected for "${slug}": ${paths.join(', ')}`);
		}
	}
	
	return Array.from(slugConflicts.keys());
}

/**
 * Get version metadata (simplified for PDF generation)
 */
export function getAllVersionMeta() {
	// For PDF generation, we mainly just need the slugs
	return getAllVersions().map(slug => ({
		slug,
		job: null, // Not needed for PDF generation
		company: null, // Not needed for PDF generation
		path: '', // Not needed for PDF generation
		sourceType: 'unknown' // Not needed for PDF generation
	}));
}
