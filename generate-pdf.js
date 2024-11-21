import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { execSync } from 'child_process';

const getChangedVersions = () => {
	try {
		// Get changed files between HEAD and the previous commit
		const output = execSync('git diff --name-only HEAD HEAD~1').toString();
		
		// Filter for version files and extract version names
		return output
			.split('\n')
			.filter(file => file.startsWith('src/lib/versions/') && file.endsWith('.json'))
			.map(file => path.parse(file).name);
	} catch (error) {
		console.error('Error getting changed versions:', error.message);
		return [];
	}
};

const getVersionNames = (specificVersions) => {
	const versionsDir = path.join('src', 'lib', 'versions');
	let files = fs.readdirSync(versionsDir)
		.filter(file => file.endsWith('.json'))
		.map(file => `/${path.parse(file).name}`);

	// If specific versions are provided, only process those
	if (specificVersions && specificVersions.length > 0) {
		files = files.filter(file => 
			specificVersions.includes(file.slice(1)) // Remove leading slash
		);
	}

	return files;
};

const waitForServer = (url, timeout = 10000) => new Promise((resolve, reject) => {
	const startTime = Date.now();
	(function ping() {
		http.get(url, () => resolve()).on('error', () => {
			if (Date.now() - startTime > timeout) {
				reject(new Error('Server did not start in time'));
			} else {
				setTimeout(ping, 200);
			}
		});
	})();
});

(async () => {
	// Get versions from command line args OR get changed versions
	const specificVersions = process.argv.length > 2 ? 
		process.argv.slice(2) : 
		getChangedVersions();
	
	const serverUrl = 'http://localhost:4173';
	console.log('Waiting for the preview server to start...');
	try {
		await waitForServer(serverUrl);
	} catch (error) {
		console.error(error);
		process.exit(1);
	}

	const routes = getVersionNames(specificVersions);
	if (routes.length === 0) {
		console.log('No versions to process');
		process.exit(0);
	}

	console.log('Generating PDFs for versions:', routes.join(', '));
	const browser = await chromium.launch();
	const page = await browser.newPage();

	const pdfOptions = {
		format: 'A4',
		printBackground: true,
		margin: {
			top: '10mm',
			bottom: '10mm',
			left: '16mm',
			right: '16mm',
		},
		scale: 0.80,
	};

	for (const route of routes) {
		try {
			const url = `${serverUrl}${route}?print`;
			const versionName = route === '/' ? 'index' : route.slice(1);

			// Navigate to the page and capture the response
			const response = await page.goto(url, { waitUntil: 'networkidle' });

			// Check if the response is ok (status code 2xx)
			if (!response || !response.ok()) {
				console.error(`❌ ${response?.status()} ${route}`);
				continue; // Skip PDF generation for this route
			}

			if (versionName === 'main') {
				const mainPdfPath = path.join('static', 'morgan-williams.pdf');
				await page.pdf({ path: mainPdfPath, ...pdfOptions });
				console.log(`🕴️ ${mainPdfPath}`);
			}

			const pdfPath = path.join('static', 'cv', versionName, 'morgan-williams.pdf');
			await page.pdf({ path: pdfPath, ...pdfOptions });
			console.log(`🖨️  ${pdfPath}`);
		} catch (error) {
			console.error(`⚠️ ${route}:`, error);
		}
	}

	await browser.close();
	console.log('✅ Done');
	process.exit(0);
})();
