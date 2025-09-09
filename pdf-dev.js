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
 * Detect if preview server is running on any port
 */
async function detectServerPort() {
	const ports = [4173, 4174, 4175, 4176, 4177];
	
	for (const port of ports) {
		try {
			const testServer = spawn('curl', ['-s', `http://localhost:${port}`], { stdio: 'ignore' });
			const result = await new Promise((resolve) => {
				testServer.on('close', (code) => resolve(code === 0));
			});
			
			if (result) {
				console.log(`✅ Preview server found on port ${port}`);
				return port;
			}
		} catch (error) {
			// Try next port
		}
	}
	
	return null;
}

/**
 * Start the preview server if not running
 */
async function ensureServerRunning() {
	const existingPort = await detectServerPort();
	
	if (existingPort) {
		console.log(`✅ Preview server already running on port ${existingPort}`);
		return;
	}
	
	console.log('🚀 Starting preview server...');
	const server = spawn('npm', ['run', 'preview'], { 
		stdio: 'inherit',
		detached: true 
	});
	
	// Give server time to start
	await new Promise(resolve => setTimeout(resolve, 3000));
	
	const newPort = await detectServerPort();
	if (newPort) {
		console.log(`✅ Preview server started on port ${newPort}`);
	} else {
		throw new Error('Failed to start preview server');
	}
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
 * Watch mode - intelligently regenerate only affected PDFs
 */
function startWatchMode() {
	console.log('👀 Watching for changes...');
	console.log('   📁 Version files: src/lib/versions/**/*.{json,json5,jsonc}');
	console.log('   🎨 Component files: src/lib/{CVSans,EngCV}.svelte');
	console.log('   📄 Main data: src/lib/{projects,projects-es}.jsonc');
	
	// Watch version files for specific regeneration
	const versionWatcher = watch('src/lib/versions/**/*.{json,json5,jsonc}', {
		ignored: /(^|[\/\\])\../, 
		persistent: true
	});
	
	// Watch component and project files for full regeneration
	const globalWatcher = watch([
		'src/lib/CVSans.svelte',
		'src/lib/EngCV.svelte', 
		'src/lib/projects.jsonc',
		'src/lib/projects-es.jsonc'
	], {
		ignored: /(^|[\/\\])\../, 
		persistent: true
	});
	
	/**
	 * Map changed file path to affected version slug
	 */
	function getAffectedVersion(filePath) {
		try {
			// Extract the version identifier from the path
			const match = filePath.match(/src\/lib\/versions\/(.+?)\.(json[c5]?)$/);
			if (!match) return null;
			
			const pathWithoutExt = match[1];
			
			// Use our version reader to find the corresponding slug
			const allMeta = getAllVersionMeta();
			const meta = allMeta.find(m => {
				const metaPath = m.path.replace(/^\//, '');
				const metaWithoutExt = metaPath.replace(/\.(json[c5]?)$/, '').replace('src/lib/versions/', '');
				return metaWithoutExt === pathWithoutExt;
			});
			
			return meta ? meta.slug : null;
		} catch (error) {
			console.warn('⚠️  Could not determine affected version for:', filePath);
			return null;
		}
	}
	
	let versionTimeout;
	const debouncedVersionGenerate = (changedVersions) => {
		clearTimeout(versionTimeout);
		versionTimeout = setTimeout(async () => {
			const uniqueVersions = [...new Set(changedVersions.filter(Boolean))];
			if (uniqueVersions.length === 0) return;
			
			console.log(`🎯 Regenerating PDFs for: ${uniqueVersions.join(', ')}`);
			try {
				await generatePDFs(uniqueVersions);
				console.log('✅ Selective PDF update complete');
			} catch (error) {
				console.error('❌ Failed to regenerate specific PDFs:', error.message);
			}
		}, 1000);
	};
	
	let globalTimeout;
	const debouncedGlobalGenerate = () => {
		clearTimeout(globalTimeout);
		globalTimeout = setTimeout(async () => {
			console.log('🔄 Global files changed, regenerating all PDFs...');
			try {
				await generatePDFs();
				console.log('✅ Full PDF regeneration complete');
			} catch (error) {
				console.error('❌ Failed to regenerate all PDFs:', error.message);
			}
		}, 1000);
	};
	
	// Track changed versions for batching
	const changedVersions = [];
	
	versionWatcher
		.on('add', path => {
			const version = getAffectedVersion(path);
			console.log(`➕ Added: ${path} → ${version || 'unknown'}`);
			if (version) {
				changedVersions.push(version);
				debouncedVersionGenerate([...changedVersions]);
			}
		})
		.on('change', path => {
			const version = getAffectedVersion(path);
			console.log(`🔄 Changed: ${path} → ${version || 'unknown'}`);
			if (version) {
				changedVersions.push(version);
				debouncedVersionGenerate([...changedVersions]);
			}
		})
		.on('unlink', path => {
			const version = getAffectedVersion(path);
			console.log(`➖ Removed: ${path} → ${version || 'unknown'}`);
			// On deletion, regenerate all to clean up
			debouncedGlobalGenerate();
		});
	
	globalWatcher
		.on('add', path => {
			console.log(`➕ Global file added: ${path}`);
			debouncedGlobalGenerate();
		})
		.on('change', path => {
			console.log(`🔄 Global file changed: ${path}`);
			debouncedGlobalGenerate();
		})
		.on('unlink', path => {
			console.log(`➖ Global file removed: ${path}`);
			debouncedGlobalGenerate();
		});
	
	// Clear changed versions after processing
	setInterval(() => {
		changedVersions.length = 0;
	}, 2000);
	
	// Handle graceful shutdown
	process.on('SIGINT', () => {
		console.log('\n👋 Stopping watch mode...');
		versionWatcher.close();
		globalWatcher.close();
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
