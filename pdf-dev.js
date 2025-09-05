#!/usr/bin/env node

/**
 * Developer convenience script for PDF generation
 * Usage:
 *   npm run pdf              # Generate all PDFs
 *   npm run pdf main         # Generate main PDF only
 *   npm run pdf allianz      # Generate allianz PDFs
 *   npm run pdf --watch      # Watch for changes and regenerate
 *   npm run pdf --force      # Force regenerate all
 */

import { spawn } from 'child_process';
import { watch } from 'chokidar';
import { getAllVersions, getAllVersionMeta } from './pdf-version-reader.js';

const args = process.argv.slice(2);
const isWatch = args.includes('--watch');
const isForce = args.includes('--force');
const specificVersions = args.filter(arg => !arg.startsWith('--'));

console.log('📄 PDF Generator');

// If force flag, use optimized generator
const generatorScript = isForce ? 'generate-pdf-optimized.js' : 'generate-pdf.js';

/**
 * Start the preview server if not running
 */
async function ensureServerRunning() {
	return new Promise((resolve) => {
		const testServer = spawn('curl', ['-s', 'http://localhost:4173'], { stdio: 'ignore' });
		
		testServer.on('close', (code) => {
			if (code === 0) {
				console.log('✅ Preview server already running');
				resolve();
			} else {
				console.log('🚀 Starting preview server...');
				const server = spawn('npm', ['run', 'preview'], { 
					stdio: 'inherit',
					detached: true 
				});
				
				// Give server time to start
				setTimeout(() => {
					console.log('✅ Preview server started');
					resolve();
				}, 3000);
			}
		});
	});
}

/**
 * Generate PDFs
 */
async function generatePDFs(versions = []) {
	const versionArgs = versions.length > 0 ? versions : ['all'];
	
	return new Promise((resolve, reject) => {
		const child = spawn('node', [generatorScript, ...versionArgs], {
			stdio: 'inherit'
		});
		
		child.on('close', (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`PDF generation failed with code ${code}`));
			}
		});
	});
}

/**
 * Watch mode - regenerate PDFs when version files change
 */
function startWatchMode() {
	console.log('👀 Watching for changes...');
	
	const watcher = watch('src/lib/versions/**/*.{json,json5,jsonc}', {
		ignored: /(^|[\/\\])\../, // ignore dotfiles
		persistent: true
	});
	
	let timeout;
	const debouncedGenerate = () => {
		clearTimeout(timeout);
		timeout = setTimeout(async () => {
			console.log('🔄 Files changed, regenerating PDFs...');
			try {
				await generatePDFs();
				console.log('✅ PDFs updated');
			} catch (error) {
				console.error('❌ Failed to regenerate PDFs:', error.message);
			}
		}, 1000);
	};
	
	watcher
		.on('add', path => {
			console.log(`➕ Added: ${path}`);
			debouncedGenerate();
		})
		.on('change', path => {
			console.log(`🔄 Changed: ${path}`);
			debouncedGenerate();
		})
		.on('unlink', path => {
			console.log(`➖ Removed: ${path}`);
			debouncedGenerate();
		});
	
	// Handle graceful shutdown
	process.on('SIGINT', () => {
		console.log('\n👋 Stopping watch mode...');
		watcher.close();
		process.exit(0);
	});
}

/**
 * Main execution
 */
async function main() {
	try {
		// Show available versions
		const allVersions = getAllVersions();
		console.log(`📋 Available versions (${allVersions.length}):`, allVersions.join(', '));
		
		if (specificVersions.length > 0) {
			console.log(`🎯 Targeting: ${specificVersions.join(', ')}`);
		}
		
		// Ensure server is running
		await ensureServerRunning();
		
		// Generate PDFs
		if (!isWatch) {
			await generatePDFs(specificVersions);
			console.log('🎉 PDF generation complete!');
		} else {
			// Initial generation
			await generatePDFs(specificVersions);
			// Start watch mode
			startWatchMode();
		}
		
	} catch (error) {
		console.error('❌ Error:', error.message);
		
		if (error.message.includes('Server')) {
			console.log('💡 Make sure to run `npm run build` first, then `npm run preview`');
		}
		
		process.exit(1);
	}
}

main();
