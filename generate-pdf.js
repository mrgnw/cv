import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { execSync } from 'child_process';


const getAllVersions = () => {
	const versions = [];
	const versionsDir = path.join('src', 'lib', 'versions');
	const esDir = path.join(versionsDir, 'es');

	// Get main versions
	const mainVersions = fs.readdirSync(versionsDir)
		.filter(file => /\.(json[c5]?)$/.test(file))
		.map(file => path.parse(file).name);
	versions.push(...mainVersions);

	// Get Spanish versions if they exist
	if (fs.existsSync(esDir)) {
		const esVersions = fs.readdirSync(esDir)
			.filter(file => /\.(json[c5]?)$/.test(file))
			.map(file => `es/${path.parse(file).name}`);
		versions.push(...esVersions);
	}

	return versions;
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
	const versions = [];
	const versionsDir = path.join('src', 'lib', 'versions');
	const esDir = path.join(versionsDir, 'es');

	// Get main versions
	let files = fs.readdirSync(versionsDir)
		.filter(file => /\.(json[c5]?)$/.test(file))
		.map(file => path.parse(file).name);

	// Get Spanish versions if they exist
	if (fs.existsSync(esDir)) {
		const esFiles = fs.readdirSync(esDir)
			.filter(file => /\.(json[c5]?)$/.test(file))
			.map(file => `es/${path.parse(file).name}`);
		files.push(...esFiles);
	}

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

export function generatePDF() {
    // PDF generation disabled for now
    console.log('PDF generation disabled');
}

// Configuration option to control sans version generation
const GENERATE_SANS_VERSION = false; // Set to true to enable sans version generation

// Helper function to generate PDF for a specific version and style
async function generateVersionPDF(page, serverUrl, version, options, isSansStyle = false) {
  const isSpanish = version.startsWith('es/');
  const versionName = isSpanish ? version.replace('es/', '') : version;
  const langPrefix = isSpanish ? '/es' : '';
  
  // Build URL and paths based on style
  const stylePrefix = isSansStyle ? '/sans' : '';
  const url = `${serverUrl}${stylePrefix}${langPrefix}/${versionName}?print`;
  
  const styleInfix = isSansStyle ? '-sans' : '';
  const pdfName = versionName === 'main' ?
    `morgan-williams${styleInfix}${isSpanish ? '.es' : ''}.pdf` :
    `morgan-williams.${versionName}${styleInfix}${isSpanish ? '.es' : ''}.pdf`;
  
  const outputDir = isSansStyle ? path.join('static', 'sans') : 'static';
  const pdfPath = path.join(outputDir, pdfName);
  
  let projectsToRemove = 0;
  let pageCount;
  
  do {
    await page.goto(`${url}&removeProjects=${projectsToRemove}`, { waitUntil: 'networkidle' });
    pageCount = await checkPdfPageCount(page, options);
    
    if (pageCount > 1) {
      projectsToRemove++;
      console.log(`  - project ${projectsToRemove} (${pageCount} pages)`);
    }
  } while (pageCount > 1 && projectsToRemove < 5);
  
  await page.pdf({ path: pdfPath, ...options });
  console.log(`🖨️  ${pdfPath}${projectsToRemove > 0 ? ` (removed ${projectsToRemove} projects)` : ''}`);
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

  // Ensure static directory exists
  if (!fs.existsSync('static')) {
    fs.mkdirSync('static');
  }
  
  // Ensure sans directory exists if needed
  if (GENERATE_SANS_VERSION && !fs.existsSync('static/sans')) {
    fs.mkdirSync('static/sans');
  }

  // Process each version
  for (const version of versions) {
    try {
      // Generate regular version
      await generateVersionPDF(page, serverUrl, version, pdfOptions, false);
      
      // Optionally generate sans version
      if (GENERATE_SANS_VERSION) {
        await generateVersionPDF(page, serverUrl, version, pdfOptions, true);
      }
    } catch (error) {
      console.error(`Error generating PDFs for version ${version}:`, error);
    }
  }

  await browser.close();
  console.log('✅ Done');
  process.exit(0);
})();
