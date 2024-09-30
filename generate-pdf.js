import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import http from 'http';


function getVersionNames() {
	const versionsDir = path.join('src', 'lib', 'versions');
	const files = fs.readdirSync(versionsDir);
	return files
		.filter((file) => file.endsWith('.json'))
		.map((file) => `/${path.parse(file).name}`);
}

function waitForServer(url, timeout = 10000) {
	return new Promise((resolve, reject) => {
		const startTime = Date.now();
		(function ping() {
			http
				.get(url, () => resolve())
				.on('error', () => {
					if (Date.now() - startTime > timeout) {
						reject(new Error('Server did not start in time'));
					} else {
						setTimeout(ping, 200);
					}
				});
		})();
	});
}

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

	for (const route of routes) {
		try {
			const url = `${serverUrl}${route}`;
			const fileName = route === '/' ? 'index' : route.replace('/', '');
			console.log(`🌐 ${url}`);

			await page.goto(url, { waitUntil: 'networkidle' });
			const pdfPath = path.join('static', 'cv', `${fileName}.pdf`);
			await page.pdf({
				path: pdfPath,
				format: 'A4',
				printBackground: true,
				margin: {
					top: '20mm',
					bottom: '20mm',
					left: '20mm',
					right: '20mm',
				},
				scale: 0.87,
			});
			console.log(`📄 ${pdfPath}`);
		} catch (error) {
			console.error(`⚠️ ${route}:`, error);
		}
	}

	await browser.close();
	console.log('✅ All PDFs generated successfully.');
	process.exit(0);
})();
