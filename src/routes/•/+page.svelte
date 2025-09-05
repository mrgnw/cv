<script lang="ts">
    import { getAllVersions, getAllVersionMeta } from '$lib/versionReader';
    import { Button } from "$lib/components/ui/button/index.js";
    import { Separator } from "$lib/components/ui/separator/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import { browser } from '$app/environment';
    
    const versions = getAllVersions();
    const meta = getAllVersionMeta();
    
    let generating = $state(false);
    let generatingVersion = $state<string | null>(null);
    let lastResult = $state<{ ok: boolean; duration: string; stdout?: string; stderr?: string; timestamp?: string } | null>(null);
    let resultHistory = $state<Array<{ ok: boolean; duration: string; stdout?: string; stderr?: string; timestamp: string; versions?: string[] }>>([]);
    let requestId = $state<string | null>(null);

    // Persist results across page reloads
    if (browser) {
        const savedHistory = localStorage.getItem('pdf-generation-history');
        if (savedHistory) {
            try {
                const parsed = JSON.parse(savedHistory);
                resultHistory = parsed;
                if (parsed.length > 0) {
                    lastResult = parsed[0];
                }
            } catch (e) {
                console.warn('Failed to parse saved history:', e);
            }
        }

        // Check if we were in the middle of generating when page refreshed
        const savedGenerating = localStorage.getItem('pdf-generating');
        if (savedGenerating) {
            const { timestamp, id } = JSON.parse(savedGenerating);
            // If less than 30 seconds ago, assume still generating
            if (Date.now() - timestamp < 30000) {
                generating = true;
                requestId = id;
                console.log('🔄 Resumed generation state after page refresh');
                
                // Poll for completion
                pollForCompletion(id);
            } else {
                localStorage.removeItem('pdf-generating');
            }
        }
    }

    function saveGeneratingState(id: string) {
        if (browser) {
            localStorage.setItem('pdf-generating', JSON.stringify({
                timestamp: Date.now(),
                id
            }));
        }
    }

    function clearGeneratingState() {
        if (browser) {
            localStorage.removeItem('pdf-generating');
        }
    }

    async function pollForCompletion(id: string) {
        // Poll the server to see if generation is complete
        try {
            const res = await fetch(`/dev/api/pdf/status?id=${id}`);
            if (res.ok) {
                const data = await res.json();
                if (data.complete) {
                    handleGenerationComplete(data.result);
                    return;
                }
            }
        } catch (e) {
            console.log('Polling failed, will retry...');
        }
        
        // Continue polling if still generating
        if (generating && requestId === id) {
            setTimeout(() => pollForCompletion(id), 1000);
        }
    }

    function handleGenerationComplete(result: any) {
        lastResult = result;
        saveToHistory(result);
        generating = false;
        generatingVersion = null;
        requestId = null;
        clearGeneratingState();
        console.log('✅ Generation completed:', result);
    }

    function saveToHistory(result: any, targetVersions?: string[]) {
        const entry = {
            ...result,
            timestamp: new Date().toLocaleTimeString(),
            versions: targetVersions?.length ? targetVersions : ['all']
        };
        resultHistory.unshift(entry);
        resultHistory = resultHistory.slice(0, 10); // Keep last 10 results
        
        if (browser) {
            localStorage.setItem('pdf-generation-history', JSON.stringify(resultHistory));
        }
    }

    async function triggerGeneration(force = false, targetVersions?: string[]) {
        // Prevent duplicate requests
        if (generating) {
            console.log('⚠️ Generation already in progress, ignoring request');
            return;
        }

        const id = Math.random().toString(36).substring(7);
        generating = true;
        generatingVersion = targetVersions?.length === 1 ? targetVersions[0] : null;
        requestId = id;
        
        saveGeneratingState(id);
        
        // Don't show a result immediately to avoid showing "FAILED"
        // The generating state banner will show the progress instead
        
        console.log('🔄 Starting PDF generation:', { force, targetVersions, id });
        
        try {
            const versionsToGenerate = targetVersions || [];
            
            console.log('📡 Sending request to /dev/api/pdf');
            
            // Use a longer timeout and better error handling
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
            
            const res = await fetch('/dev/api/pdf', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ versions: versionsToGenerate, force, requestId: id }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            console.log('📨 Response status:', res.status);
            
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            
            const data = await res.json();
            console.log('📄 Response data:', data);
            
            const result = { 
                ok: data.ok, 
                duration: data.duration, 
                stdout: data.stdout,
                stderr: data.stderr,
                timestamp: new Date().toLocaleTimeString()
            };
            
            handleGenerationComplete(result);
            
        } catch (e: any) {
            console.error('❌ Generation failed:', e);
            
            let errorMessage = e.message;
            if (e.name === 'AbortError') {
                errorMessage = 'Request timed out after 60 seconds';
            } else if (errorMessage.includes('NetworkError') || errorMessage.includes('fetch')) {
                errorMessage = 'Network error - PDF generation may have completed. Check Docker logs. Page may have refreshed due to file changes.';
            }
            
            const result = { 
                ok: false, 
                duration: '0', 
                stderr: errorMessage,
                stdout: 'Check Docker container logs with: docker-compose logs -f svelte',
                timestamp: new Date().toLocaleTimeString()
            };
            handleGenerationComplete(result);
        }
    }

    function clearHistory() {
        resultHistory = [];
        lastResult = null;
        if (browser) {
            localStorage.removeItem('pdf-generation-history');
        }
    }
</script>

<svelte:head>
    <title>• Debug & Tools - Morgan Williams</title>
</svelte:head>

<div class="container mx-auto p-6 space-y-6 max-w-4xl">
    <div>
        <h1 class="text-2xl font-semibold text-gray-900 mb-2">• Debug & Tools</h1>
        <p class="text-gray-600 text-sm">PDF generation and version management</p>
    </div>

    <!-- Generation Status Banner -->
    {#if generating}
        <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex items-center gap-3">
                <svg class="h-5 w-5 animate-spin text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <div>
                    <div class="font-medium text-blue-900">
                        {generatingVersion ? `Generating ${generatingVersion}...` : 'Generating all PDFs...'}
                    </div>
                    <div class="text-sm text-blue-700">
                        This may take a moment. Results will persist if the page refreshes.
                        {#if requestId}
                            <span class="font-mono text-xs">({requestId})</span>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <!-- Quick Actions -->
    <div class="flex gap-3">
        <Button 
            onclick={() => triggerGeneration(false)} 
            disabled={generating}
            variant="default"
        >
            {generating && !generatingVersion ? 'Generating...' : 'Generate All'}
        </Button>
        
        <Button 
            onclick={() => triggerGeneration(true)} 
            disabled={generating}
            variant="secondary"
        >
            {generating && !generatingVersion ? 'Regenerating...' : 'Regenerate All'}
        </Button>

        <Button 
            onclick={async () => {
                try {
                    const res = await fetch('/dev/api/pdf/test');
                    const data = await res.json();
                    console.log('Test result:', data);
                    lastResult = {
                        ok: data.ok,
                        duration: '0',
                        stdout: data.message,
                        stderr: data.error || '',
                        timestamp: new Date().toLocaleTimeString()
                    };
                } catch (e) {
                    console.error('Test failed:', e);
                }
            }}
            variant="outline"
            size="sm"
        >
            Test API
        </Button>

        {#if generating}
            <Button 
                onclick={() => {
                    generating = false;
                    generatingVersion = null;
                    requestId = null;
                    clearGeneratingState();
                }}
                variant="outline"
                size="sm"
            >
                Cancel
            </Button>
        {/if}
    </div>

    <!-- Result Display -->
    {#if lastResult}
        <div class="p-4 rounded-lg border {lastResult.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium">
                    {lastResult.ok ? '✅ Success' : '❌ Failed'} in {lastResult.duration}s
                    {#if lastResult.timestamp}
                        <span class="text-gray-500 ml-2">at {lastResult.timestamp}</span>
                    {/if}
                </span>
                {#if resultHistory.length > 1}
                    <Button variant="ghost" size="sm" onclick={clearHistory}>
                        Clear History
                    </Button>
                {/if}
            </div>
            
            {#if lastResult.stdout}
                <details class="mt-2" open={!lastResult.ok}>
                    <summary class="cursor-pointer text-sm text-gray-700 hover:text-gray-900">
                        Output
                    </summary>
                    <pre class="mt-2 text-xs bg-white/50 p-3 rounded font-mono overflow-x-auto whitespace-pre-wrap">{lastResult.stdout.trim()}</pre>
                </details>
            {/if}
            
            {#if lastResult.stderr}
                <details class="mt-2" open={true}>
                    <summary class="cursor-pointer text-sm text-red-700 hover:text-red-900">
                        Errors
                    </summary>
                    <pre class="mt-2 text-xs bg-red-100 p-3 rounded font-mono overflow-x-auto whitespace-pre-wrap">{lastResult.stderr.trim()}</pre>
                </details>
            {/if}
            
            {#if !lastResult.ok}
                <div class="mt-3 p-3 bg-gray-100 rounded text-sm">
                    <strong>Debugging tips:</strong>
                    <ul class="mt-1 text-xs space-y-1 list-disc list-inside">
                        <li>Run <code class="bg-white px-1 rounded">docker-compose logs -f svelte</code> to see live Docker logs</li>
                        <li>Check if PDFs were actually generated in the <code class="bg-white px-1 rounded">static/</code> folder</li>
                        <li>The page may refresh due to Vite detecting file changes after PDF generation</li>
                        <li>Network errors often mean the generation completed but the response was lost due to page refresh</li>
                    </ul>
                </div>
            {/if}
        </div>
    {/if}

    <!-- Result History -->
    {#if resultHistory.length > 1}
        <details class="space-y-2">
            <summary class="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                Recent History ({resultHistory.length - 1} more)
            </summary>
            <div class="space-y-2 mt-2">
                {#each resultHistory.slice(1) as result}
                    <div class="p-3 rounded border bg-gray-50 text-sm">
                        <div class="flex items-center justify-between mb-1">
                            <span class="font-medium">
                                {result.ok ? '✅' : '❌'} {result.versions?.join(', ') || 'all'} in {result.duration}s
                            </span>
                            <span class="text-gray-500 text-xs">{result.timestamp}</span>
                        </div>
                        {#if result.stderr}
                            <pre class="text-xs text-red-700 font-mono mt-1">{result.stderr.slice(0, 200)}{result.stderr.length > 200 ? '...' : ''}</pre>
                        {/if}
                    </div>
                {/each}
            </div>
        </details>
    {/if}

    <Separator />

    <!-- Version List -->
    <div>
        {#each meta as m}
            <div class="flex items-center gap-3 py-1 hover:bg-gray-50 rounded px-2">
                <button 
                    onclick={() => triggerGeneration(true, [m.slug])}
                    disabled={generating}
                    class="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                    title="Regenerate PDF"
                >
                    {#if generating && generatingVersion === m.slug}
                        ⟳
                    {:else}
                        ↻
                    {/if}
                </button>
                
                <a href="/{m.slug}" class="font-mono text-blue-600 hover:text-blue-800 text-sm font-medium">
                    {m.slug}
                </a>
                
                <span 
                    class="text-gray-600 text-sm"
                    title="File: {m.path}"
                >
                    morgan-williams{m.slug === 'main' ? '' : `.${m.slug}`}.pdf
                </span>
            </div>
        {/each}
    </div>
</div>
