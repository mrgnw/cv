import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import http from 'http';

const getVersionNames = () => {
	const versionsDir = path.join('src', 'lib', 'versions');
	return fs.readdirSync(versionsDir)
		.filter(file => file.endsWith('.json'))
		.map(file => `/${path.parse(file).name}`);
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
	const serverUrl = 'http://localhost:4173'; // Adjust port if necessary
	console.log('Waiting for the preview server to start...');
	try {
		await waitForServer(serverUrl);
	} catch (error) {
		console.error(error);
		process.exit(1);
	}

	const routes = getVersionNames();
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
		scale: 0.84,
	};

	for (const route of routes) {
		try {
			const url = `${serverUrl}${route}`;
			const versionName = route === '/' ? 'index' : route.slice(1);

			// Navigate to the page and capture the response
			const response = await page.goto(url, { waitUntil: 'networkidle' });

			// Check if the response is ok (status code 2xx)
			if (!response || !response.ok()) {
				console.error(`❌ ${response ? response.status() : 'Error'} ${route}`);
				continue; // Skip PDF generation for this route
			}

			if (versionName === 'main') {
				const mainPdfPath = path.join('static', 'morgan-williams.pdf');
				await page.pdf({ path: mainPdfPath, ...pdfOptions });
				console.log(`🕴️ ${mainPdfPath}`);
			}

			const pdfPath = path.join('static', 'cv', versionName, 'morgan-williams.pdf');
			await page.pdf({ path: pdfPath, ...pdfOptions });
			console.log(`📄 ${pdfPath}`);
		} catch (error) {
			console.error(`⚠️ ${route}:`, error);
		}
	}

	await browser.close();
	console.log('✅ Done');
	process.exit(0);
})();
