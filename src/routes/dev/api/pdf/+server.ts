import { json } from '@sveltejs/kit';
import { spawn } from 'child_process';

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

export const POST = async (event) => {
  const { request } = event;
  if (process.env.NODE_ENV === 'production') {
    return json({ error: 'Disabled in production' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { versions = [], force = false } = body as { versions?: string[]; force?: boolean };

  console.log('🔄 PDF Generation Request:', { versions, force, timestamp: new Date().toISOString() });

  // Build argument list
  const args = ['pdf-cli.js'];
  if (force) args.push('--force');
  if (versions.length === 0) {
    args.push('all');
  } else {
    args.push(...versions);
  }

  console.log('🚀 Executing command:', 'node', args.join(' '));

  const start = Date.now();
  const result = await run('node', args);
  const duration = ((Date.now() - start) / 1000).toFixed(2);

  console.log('📊 PDF Generation Result:', { 
    success: result.code === 0, 
    duration: duration + 's',
    exitCode: result.code,
    stdoutLength: result.stdout.length,
    stderrLength: result.stderr.length
  });

  if (result.stdout) {
    console.log('📄 STDOUT:', result.stdout);
  }
  
  if (result.stderr) {
    console.log('🚨 STDERR:', result.stderr);
  }

  if (result.code !== 0) {
    console.error('❌ PDF generation failed with exit code:', result.code);
    return json({ ok: false, duration, stdout: result.stdout, stderr: result.stderr }, { status: 500 });
  }
  
  console.log('✅ PDF generation completed successfully');
  return json({ ok: true, duration, stdout: result.stdout, stderr: result.stderr });
};
