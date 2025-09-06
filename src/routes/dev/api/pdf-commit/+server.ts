import { json } from '@sveltejs/kit';
import { writeFileSync, readFileSync, existsSync } from 'fs';

export const POST = async (event) => {
  const { request } = event;
  if (process.env.NODE_ENV === 'production') {
    return json({ error: 'Disabled in production' }, { status: 403 });
  }

  console.log('🚀 Git workflow request:', { timestamp: new Date().toISOString() });

  try {
    // Create a trigger file that the host can watch for
    const triggerFile = '/app/.git-trigger';
    const timestamp = new Date().toISOString();
    
    writeFileSync(triggerFile, JSON.stringify({
      action: 'pdf-commit-push',
      timestamp,
      requested_by: 'docker_debug_ui'
    }));

    console.log('📝 Created git trigger file:', triggerFile);
    
    // Return instructions for the user
    return json({ 
      ok: true, 
      message: 'Git trigger created. Run this on your host machine to execute:',
      command: './host-pdf-commit.sh',
      note: 'The Docker container cannot access your git credentials, so this must be run on the host.'
    });

  } catch (error) {
    console.error('❌ Failed to create git trigger:', error);
    return json({ 
      ok: false, 
      error: 'Failed to create git trigger file',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
};

export const GET = async () => {
  // Check trigger file status
  const triggerFile = '/app/.git-trigger';
  
  if (!existsSync(triggerFile)) {
    return json({ status: 'no_trigger' });
  }

  try {
    const content = JSON.parse(readFileSync(triggerFile, 'utf-8'));
    return json({ 
      status: 'trigger_exists', 
      trigger: content,
      instruction: 'Run ./host-pdf-commit.sh on your host machine to process this trigger'
    });
  } catch (error) {
    return json({ 
      status: 'trigger_corrupted',
      error: 'Could not read trigger file'
    });
  }
};
