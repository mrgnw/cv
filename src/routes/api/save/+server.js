import { json } from '@sveltejs/kit';
import JSON5 from 'json5';

// Helper functions (copied from +page.server.js)
function normalizeJobTitle(title) {
	if (!title) return 'general';
	return title
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 50);
}

function normalizeCompanyName(company) {
	if (!company) return 'general';
	return company
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 30);
}

async function getNextVersionNumber(jobTitle, companySlug) {
	try {
		const fs = await import('node:fs/promises');
		const path = await import('node:path');
		const baseDir = process.cwd();
		const versionsDir = path.join(baseDir, 'src', 'lib', 'versions', jobTitle);
		
		try {
			const files = await fs.readdir(versionsDir);
			const versionFiles = files.filter(f => f.startsWith(`${companySlug}.v`) && f.endsWith('.json5'));
			const versions = versionFiles.map(f => {
				const match = f.match(/\.v(\d+)\.json5$/);
				return match ? parseInt(match[1], 10) : 0;
			});
			return Math.max(0, ...versions) + 1;
		} catch {
			return 1;
		}
	} catch {
		return 1;
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	try {
		const { cvData, company, title, createNewVersion } = await request.json();

		if (!cvData) {
			return json({ error: 'No CV data to save' }, { status: 400 });
		}

		// Parse CV data
		const cv = typeof cvData === 'string' ? JSON5.parse(cvData) : cvData;

		const jobTitle = cv.normalizedTitle || normalizeJobTitle(title) || 'general';
		const companySlug = normalizeCompanyName(company);
		
		// Generate versioned filename if requested
		let actualFilename = `${companySlug}.json5`;
		let slug = companySlug;
		
		if (createNewVersion) {
			// Check for existing versions and increment
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
			const versionNumber = await getNextVersionNumber(jobTitle, companySlug);
			actualFilename = `${companySlug}.v${versionNumber}.json5`;
			slug = `${companySlug}-v${versionNumber}`;
			
			// Add version metadata to CV
			cv.versionInfo = {
				version: versionNumber,
				createdAt: timestamp,
				baseCompany: companySlug,
				isLatest: false
			};
		} else {
			// Mark as latest version
			cv.versionInfo = {
				version: 1,
				createdAt: new Date().toISOString(),
				baseCompany: companySlug,
				isLatest: true
			};
		}

		const filename = `${jobTitle}/${actualFilename}`;

		// Try to save locally if filesystem is available (dev/local)
		let saved = false;
		let saveError = '';
		try {
			// Dynamic import to avoid bundling on Cloudflare
			const fs = await import('node:fs/promises');
			const path = await import('node:path');
			const baseDir = process.cwd();
			const versionsDir = path.join(baseDir, 'src', 'lib', 'versions', jobTitle);
			await fs.mkdir(versionsDir, { recursive: true });
			const filePath = path.join(versionsDir, actualFilename);
			const content = JSON5.stringify(cv, null, 2);
			await fs.writeFile(filePath, content, 'utf-8');
			saved = true;
			console.log('Saved CV version:', filePath);
		} catch (err) {
			saveError = err instanceof Error ? err.message : String(err);
			console.log('Filesystem save skipped or failed (likely Cloudflare):', saveError);
		}

		// Return success response
		return json({
			filename,
			slug,
			jobTitle,
			company: companySlug,
			saved,
			saveError: saved ? '' : saveError,
			isNewVersion: createNewVersion,
			versionNumber: cv.versionInfo?.version || 1
		});

	} catch (error) {
		console.error('Save API error:', error);
		const message = error instanceof Error ? error.message : String(error);
		return json({ error: `Failed to save: ${message}` }, { status: 500 });
	}
}