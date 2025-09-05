import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { execSync } from 'child_process';

// Import our Node.js compatible version reader functions
import { getAllVersions, getAllVersionMeta } from './pdf-version-reader.js';


// Use our new version reader to get available versions
const getAvailableVersions = () => {
	try {
		return getAllVersions();
	} catch (error) {
		console.error('Error getting versions from version reader:', error);
		// Fallback to empty array
		return [];
	}
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
	const allVersions = getAvailableVersions();

	if (specificVersions?.includes('all')) {
		return allVersions;
	}

	// If specific versions are provided, only process those
	if (specificVersions?.length) {
		return allVersions.filter(version => specificVersions.includes(version));
	}

	return allVersions;
};

/**
 * Detect which port the preview server is running on
 */
const detectServerPort = async () => {
	const ports = [4173, 4174, 4175, 4176, 4177];
	
	for (const port of ports) {
		const url = `http://localhost:${port}`;
		try {
			await new Promise((resolve, reject) => {
				const req = http.get(url, (res) => {
					resolve();
				});
				req.on('error', reject);
				req.setTimeout(2000, () => {
					req.destroy();
					reject(new Error('Timeout'));
				});
			});
			console.log(`✅ Found preview server on port ${port}`);
			return url;
		} catch (error) {
			// Try next port
		}
	}
	
	throw new Error('Preview server not found on any expected port (4173-4177)');
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
  // Build URL and paths based on style (simplified - no Spanish handling)
  const stylePrefix = isSansStyle ? '/sans' : '';
  const url = `${serverUrl}${stylePrefix}/${version}?print`;
  
  const styleInfix = isSansStyle ? '-sans' : '';
  const pdfName = version === 'main' ?
    `morgan-williams${styleInfix}.pdf` :
    `morgan-williams.${version}${styleInfix}.pdf`;
  
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
  // Get versions from command line args OR get all available versions
  const specificVersions = process.argv.length > 2 ?
    process.argv.slice(2) :
    getAvailableVersions();

  console.log('🔍 Detecting preview server...');
  let serverUrl;
  try {
    serverUrl = await detectServerPort();
  } catch (error) {
    console.error('❌', error.message);
    console.log('💡 Make sure to run `npm run preview` first');
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
