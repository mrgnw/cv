import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { execSync } from 'child_process';


const getAllVersions = () => {
	return fs.readdirSync(path.join('src', 'lib', 'versions'))
		.filter(file => /\.(json[c5]?)$/.test(file))
		.map(file => path.parse(file).name);
};

// const getChangedVersions = () => {
// 	try {
// 		const modified_versions = execSync('git diff --name-only HEAD HEAD~1').toString();

// 		return modified_versions
// 			.split('\n')
// 			.filter(file => file.startsWith('src/lib/versions/') && file.endsWith('.json'))
// 			.map(file => path.parse(file).name);
// 	} catch (error) {
// 		console.error('Error getting changed versions:', error.message);
// 		return [];
// 	}
// };

const getVersionNames = (specificVersions) => {
	const versionsDir = path.join('src', 'lib', 'versions');
	let files = fs.readdirSync(versionsDir)
		.filter(file => /\.(json[c5]?)$/.test(file))
		.map(file => path.parse(file).name);

	if (specificVersions?.includes('all')) {
		return files;
	}

	// If specific versions are provided, only process those
	if (specificVersions?.length) {
		files = files.filter(file => specificVersions.includes(file));
	}

	return files;
};

const waitForServer = (url) => {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			reject(new Error('Server start timeout'));
		}, 30000);

		const checkServer = () => {
			http.get(url, (res) => {
				clearTimeout(timeout);
				resolve();
			}).on('error', () => {
				setTimeout(checkServer, 100);
			});
		};

		checkServer();
	});
};

async function getPageCount(page) {
	return await page.evaluate(() => {
		const height = document.documentElement.scrollHeight;
		const pageHeight = 1123; // A4 height in pixels at 96 DPI
		return Math.ceil(height / pageHeight);
	});
}

// Helper function to check PDF page count
async function checkPdfPageCount(page, options) {
	const pdf = await page.pdf({ ...options });
	const pageCount = (pdf.toString().match(/\/Page\s*$/gm) || []).length;
	return pageCount;
}

(async () => {
	// Get versions from command line args OR get changed versions
	const specificVersions = process.argv.length > 2 ?
		process.argv.slice(2) :
		getAllVersions();

	const serverUrl = 'http://localhost:4173';
	console.log('Waiting for the preview server to start...');
	try {
		await waitForServer(serverUrl);
	} catch (error) {
		console.error(error);
		process.exit(1);
	}

	const versions = getVersionNames(specificVersions);
	if (versions.length === 0) {
		console.log('No versions to process');
		process.exit(0);
	}

	console.log('Generating PDFs for versions:', versions.join(', '));
	const browser = await chromium.launch();
	const page = await browser.newPage();

	const pdfOptions = {
		format: 'A4',
		printBackground: false,
		margin: {
			top: '6mm',
			bottom: '6mm',
			left: '8mm',
			right: '8mm',
		},
	};

	// Ensure static and sans directories exist
	if (!fs.existsSync('static')) {
		fs.mkdirSync('static');
	}
	if (!fs.existsSync('static/sans')) {
		fs.mkdirSync('static/sans');
	}

	// Generate both regular and engineering versions
	for (const version of versions) {
		try {
			// Engineering version (now the default route)
			const url = `${serverUrl}/${version}?print`;
			const pdfName = version === 'main' ?
				'morgan-williams.pdf' :
				`morgan-williams.${version}.pdf`;
			const pdfPath = path.join('static', pdfName);

			let projectsToRemove = 0;
			let pageCount;

			do {
				await page.goto(`${url}&removeProjects=${projectsToRemove}`, { waitUntil: 'networkidle' });
				pageCount = await checkPdfPageCount(page, pdfOptions);
				
				if (pageCount > 1) {
					projectsToRemove++;
					console.log(`${pdfName}: Removing project ${projectsToRemove} (${pageCount} pages)`);
				}
			} while (pageCount > 1 && projectsToRemove < 5);

			await page.pdf({ path: pdfPath, ...pdfOptions });
			console.log(`🖨️  ${pdfPath}${projectsToRemove > 0 ? ` (removed ${projectsToRemove} projects)` : ''}`);

			// Sans version
			const sansUrl = `${serverUrl}/sans/${version}?print`;
			const sansPdfName = version === 'main' ?
				'morgan-williams-sans.pdf' :
				`morgan-williams.${version}-sans.pdf`;
			const sansPdfPath = path.join('static', 'sans', sansPdfName);

			projectsToRemove = 0;
			do {
				await page.goto(`${sansUrl}&removeProjects=${projectsToRemove}`, { waitUntil: 'networkidle' });
				pageCount = await checkPdfPageCount(page, pdfOptions);
				
				if (pageCount > 1) {
					projectsToRemove++;
					console.log(`${sansPdfName}: Removing project ${projectsToRemove} (${pageCount} pages)`);
				}
			} while (pageCount > 1 && projectsToRemove < 5);

			await page.pdf({ path: sansPdfPath, ...pdfOptions });
			console.log(`🖨️  ${sansPdfPath}${projectsToRemove > 0 ? ` (removed ${projectsToRemove} projects)` : ''}`);

		} catch (error) {
			console.error(`Error generating PDFs for version ${version}:`, error);
		}
	}

	await browser.close();
	console.log('✅ Done');
	process.exit(0);
})();
