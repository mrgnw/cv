import { json } from '@sveltejs/kit';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

function run(cmd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => stdout += d.toString());
    child.stderr.on('data', d => stderr += d.toString());
    child.on('close', code => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

export const GET = async () => {
  console.log('🧪 Running PDF API test...');
  
  const tests = [];
  
  // Test 1: Check if pdf-cli.js exists
  try {
    const pdfCliPath = path.resolve('./pdf-cli.js');
    if (fs.existsSync(pdfCliPath)) {
      tests.push('✅ pdf-cli.js file exists');
    } else {
      tests.push('❌ pdf-cli.js file not found');
    }
  } catch (e: any) {
    tests.push(`❌ Error checking pdf-cli.js: ${e.message}`);
  }
  
  // Test 2: Check Node.js
  try {
    const result = await run('node', ['--version']);
    if (result.code === 0) {
      tests.push(`✅ Node.js version: ${result.stdout.trim()}`);
    } else {
      tests.push(`❌ Node.js check failed: ${result.stderr}`);
    }
  } catch (e: any) {
    tests.push(`❌ Node.js error: ${e.message}`);
  }
  
  // Test 3: Check if pdf-cli.js can run with --list
  try {
    console.log('Running: node pdf-cli.js --list');
    const result = await run('node', ['pdf-cli.js', '--list']);
    if (result.code === 0) {
      tests.push(`✅ pdf-cli.js --list works (${result.stdout.length} chars output)`);
      if (result.stdout.length > 0) {
        tests.push(`📄 Output preview: ${result.stdout.substring(0, 200)}...`);
      }
    } else {
      tests.push(`❌ pdf-cli.js --list failed (exit ${result.code})`);
      if (result.stderr) {
        tests.push(`🚨 Error: ${result.stderr}`);
      }
    }
  } catch (e: any) {
    tests.push(`❌ pdf-cli.js test error: ${e.message}`);
  }
  
  // Test 4: Check playwright installation
  try {
    const result = await run('node', ['-e', 'console.log(require("playwright").version || "installed")']);
    if (result.code === 0) {
      tests.push(`✅ Playwright: ${result.stdout.trim()}`);
    } else {
      tests.push(`❌ Playwright check failed`);
    }
  } catch (e: any) {
    tests.push(`❌ Playwright error: ${e.message}`);
  }
  
  const allPassed = tests.every(t => t.startsWith('✅'));
  
  return json({
    ok: allPassed,
    message: tests.join('\n'),
    tests: tests.length,
    passed: tests.filter(t => t.startsWith('✅')).length
  });
};
