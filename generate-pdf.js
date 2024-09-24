import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
	const buildPath = path.join(__dirname, 'build');

	if (!fs.existsSync(buildPath)) {
		console.error('Build directory does not exist. Please run the build process first.');
		process.exit(1);
	}

	const browser = await chromium.launch();
	const context = await browser.newContext();
	const page = await context.newPage();

	try {
		await page.goto(`http://localhost:4173`, { waitUntil: 'networkidle' });

		await page.waitForSelector('body');

		await page.pdf({
			path: 'static/morgan-williams-cv.pdf',
			format: 'A4',
			printBackground: true,
			margin: {
				top: '20px',
				bottom: '20px',
				left: '20px',
				right: '20px',
			},
		});

		console.log('🖨️ static/morgan-williams-cv.pdf');
	} catch (error) {
		console.error('Error generating PDF:', error);
	} finally {
		await browser.close();
	}
})();