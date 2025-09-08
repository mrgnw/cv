<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import { getAllVersionMeta } from '$lib/versionReader';
    import { Separator } from "$lib/components/ui/separator/index.js";
    import { browser } from '$app/environment';
    import type { VersionMeta } from '../../types';
    
    const { data } = $props();
    const isDev = data.dev;
    
    const meta = getAllVersionMeta();
    
    let generating = $state(false);
    let generatingVersion = $state<string | null>(null);
    let committing = $state(false);
    let lastResult = $state<{ ok: boolean; duration: string; stdout?: string; stderr?: string; timestamp?: string } | null>(null);
    let lastCommitResult = $state<{ ok: boolean; duration: string; stdout?: string; stderr?: string; timestamp?: string } | null>(null);
    let resultHistory = $state<Array<{ ok: boolean; duration: string; stdout?: string; stderr?: string; timestamp: string; versions?: string[] }>>([]);
    let requestId = $state<string | null>(null);
    // Minimal grouping control for Version List
    let groupBy = $state<'none' | 'company' | 'job'>('none');

    // Sort meta once for consistent display (main first)
    const sortedMeta: VersionMeta[] = (() => {
        const list = [...meta];
        list.sort((a, b) => {
            if (a.slug === 'main' && b.slug !== 'main') return -1;
            if (b.slug === 'main' && a.slug !== 'main') return 1;
            return a.slug.localeCompare(b.slug);
        });
        return list;
    })();

    // Build groups based on current grouping option
    type Group = { name: string; items: VersionMeta[] };
    let groups = $state<Group[]>([]);
    $effect(() => {
        const by = groupBy; // track dependency
        if (by === 'none') {
            groups = [];
            return;
        }
        const buckets = new Map<string, VersionMeta[]>();
        for (const m of sortedMeta) {
            const key = m.slug === 'main'
                ? 'Base'
                : by === 'company'
                    ? (m.company || 'Other')
                    : (m.job || 'Other');
            if (!buckets.has(key)) buckets.set(key, []);
            buckets.get(key)!.push(m);
        }
        const arr: Group[] = Array.from(buckets.entries()).map(([name, items]) => ({ name, items }));
        arr.sort((a, b) => {
            if (a.name === 'Base') return -1;
            if (b.name === 'Base') return 1;
            return a.name.localeCompare(b.name);
        });
        groups = arr;
    });

    function groupBtnClass(option: 'none' | 'company' | 'job') {
        const isActive = groupBy === option;
        return [
            'px-2 py-1 text-sm',
            'border-r last:border-r-0',
            'transition-colors',
            isActive ? 'bg-gray-200 text-gray-900' : 'bg-white text-gray-600 hover:bg-gray-50'
        ].join(' ');
    }

    // Restore state on mount (history, grouping, in-progress generation)
    import { onMount } from 'svelte';
    onMount(() => {
        if (!browser) return;
        try {
            const saved = localStorage.getItem('pdf-generation-history');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    resultHistory = parsed;
                    lastResult = resultHistory[0] ?? null;
                }
            }
        } catch (e) {
            console.warn('Failed to parse saved history:', e);
        }

        const savedGroup = localStorage.getItem('cv-group-by');
        if (savedGroup === 'none' || savedGroup === 'company' || savedGroup === 'job') {
            groupBy = savedGroup as typeof groupBy;
        }

        const savedGenerating = localStorage.getItem('pdf-generating');
        if (savedGenerating) {
            try {
                const { timestamp, id } = JSON.parse(savedGenerating);
                if (Date.now() - timestamp < 30000) {
                    generating = true;
                    requestId = id;
                    console.log('🔄 Resumed generation state after page refresh');
                    pollForCompletion(id);
                } else {
                    localStorage.removeItem('pdf-generating');
                }
            } catch {
                localStorage.removeItem('pdf-generating');
            }
        }
    });

    // Persist grouping preference
    $effect(() => {
        if (browser) localStorage.setItem('cv-group-by', groupBy);
    });

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

    async function triggerCommitPush() {
        if (committing) {
            console.log('⚠️ Commit/push already in progress, ignoring request');
            return;
        }

        committing = true;
        
        console.log('🔄 Starting remote PDF generation + local git workflow');
        
        try {
            // Step 1: Trigger PDF generation on remote server
            console.log('🌐 Triggering remote PDF generation...');
            const pdfRes = await fetch('https://cv.skate-in.ts.net/dev/api/pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ force: false })
            });
            
            if (!pdfRes.ok) {
                throw new Error(`Remote PDF generation failed: ${pdfRes.status}`);
            }
            
            const pdfData = await pdfRes.json();
            console.log('✅ Remote PDF generation completed:', pdfData);
            
            // Step 2: Wait a moment then trigger local git operations
            console.log('⏳ Waiting 5 seconds for files to sync...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Step 3: Create trigger for local git operations
            const gitRes = await fetch('/dev/api/pdf-commit', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }
            });
            
            const gitData = await gitRes.json();
            
            lastCommitResult = { 
                ok: pdfData.ok && gitData.ok, 
                duration: pdfData.duration || '0s', 
                stdout: `PDF Generation:\n${pdfData.stdout || 'Success'}\n\nGit Workflow:\n${gitData.message || 'Trigger created'}`,
                stderr: pdfData.stderr || gitData.error || '',
                timestamp: new Date().toLocaleTimeString()
            };
            
        } catch (e: any) {
            console.error('❌ Auto-workflow failed:', e);
            
            lastCommitResult = { 
                ok: false, 
                duration: '0s', 
                stderr: e.message,
                stdout: 'Remote PDF generation and git workflow failed',
                timestamp: new Date().toLocaleTimeString()
            };
        } finally {
            committing = false;
        }
    }
</script>

<svelte:head>
    <meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex">
    <meta name="googlebot" content="noindex, nofollow">
    <meta name="bingbot" content="noindex, nofollow">
</svelte:head>

<div class="container mx-auto p-6 space-y-6 max-w-4xl">
    {#if isDev}
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

    <!-- Commit/Push Status Banner -->
    {#if committing}
        <div class="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div class="flex items-center gap-3">
                <svg class="h-5 w-5 animate-spin text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <div>
                    <div class="font-medium text-purple-900">
                        Generating PDFs, committing, and pushing...
                    </div>
                    <div class="text-sm text-purple-700">
                        This includes: PDF generation → Git add → Git commit → Git push
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <!-- Quick Actions -->
    <div class="flex gap-3 flex-wrap">
            <Button 
                onclick={() => triggerGeneration(false)} 
                disabled={generating || committing}
                variant="default"
            >
                {generating && !generatingVersion ? 'Generating...' : 'Generate All'}
            </Button>
            
            <Button 
                onclick={() => triggerGeneration(true)} 
                disabled={generating || committing}
                variant="secondary"
            >
                {generating && !generatingVersion ? 'Regenerating...' : 'Regenerate All'}
            </Button>

            <Button 
                onclick={triggerCommitPush}
                disabled={generating || committing}
                variant="outline"
                class="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
            >
                {committing ? 'Creating Trigger...' : '🤖 Auto-Generate & Deploy'}
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
                        <li>Run <code class="bg-white px-1 rounded">docker-compose logs -f app</code> to see live Docker logs</li>
                        <li>Check if PDFs were actually generated in the <code class="bg-white px-1 rounded">static/</code> folder</li>
                        <li>The page may refresh due to Vite detecting file changes after PDF generation</li>
                        <li>Network errors often mean the generation completed but the response was lost due to page refresh</li>
                    </ul>
                </div>
            {/if}
        </div>
    {/if}

    <!-- Commit/Push Result Display -->
    {#if lastCommitResult}
        <div class="p-4 rounded-lg border {lastCommitResult.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium">
                    🚀 {lastCommitResult.ok ? '✅ Commit & Push Success' : '❌ Commit & Push Failed'} in {lastCommitResult.duration}s
                    {#if lastCommitResult.timestamp}
                        <span class="text-gray-500 ml-2">at {lastCommitResult.timestamp}</span>
                    {/if}
                </span>
            </div>
            
            {#if lastCommitResult.stdout}
                <details class="mt-2" open={!lastCommitResult.ok}>
                    <summary class="cursor-pointer text-sm text-gray-700 hover:text-gray-900">
                        Git Output
                    </summary>
                    <pre class="mt-2 text-xs bg-white/50 p-3 rounded font-mono overflow-x-auto whitespace-pre-wrap">{lastCommitResult.stdout.trim()}</pre>
                </details>
            {/if}
            
            {#if lastCommitResult.stderr}
                <details class="mt-2" open={true}>
                    <summary class="cursor-pointer text-sm text-red-700 hover:text-red-900">
                        Git Errors
                    </summary>
                    <pre class="mt-2 text-xs bg-red-100 p-3 rounded font-mono overflow-x-auto whitespace-pre-wrap">{lastCommitResult.stderr.trim()}</pre>
                </details>
            {/if}
            
            {#if !lastCommitResult.ok}
                <div class="mt-3 p-3 bg-gray-100 rounded text-sm">
                    <strong>Git troubleshooting:</strong>
                    <ul class="mt-1 text-xs space-y-1 list-disc list-inside">
                        <li>Check if git is configured: <code class="bg-white px-1 rounded">git config --list</code></li>
                        <li>Verify you have push permissions to the current branch</li>
                        <li>Check git status: <code class="bg-white px-1 rounded">git status</code></li>
                        <li>Look at Docker logs: <code class="bg-white px-1 rounded">docker-compose logs -f app</code></li>
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
    {/if}

    <!-- Group by control and Version List -->
    <div class="space-y-3">
        <div class="flex items-center justify-between gap-3">
            <div class="text-sm text-gray-600">Group by</div>
            <div class="inline-flex rounded-md border border-gray-200 overflow-hidden">
                <button class={groupBtnClass('none')} onclick={() => (groupBy = 'none')} aria-pressed={groupBy === 'none'}>None</button>
                <button class={groupBtnClass('company')} onclick={() => (groupBy = 'company')} aria-pressed={groupBy === 'company'}>Company</button>
                <button class={groupBtnClass('job')} onclick={() => (groupBy = 'job')} aria-pressed={groupBy === 'job'}>Job</button>
            </div>
        </div>

        {#if groupBy === 'none'}
            <div>
                {#each sortedMeta as m}
                    <div class="flex items-center gap-3 py-1 hover:bg-gray-50 rounded px-2">
                        {#if isDev}
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
                        {/if}

                        <a 
                            href="/{m.slug}" 
                            class="font-mono text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                            {m.slug}
                        </a>

                        <a 
                            href="/morgan-williams{m.slug === 'main' ? '' : `.${m.slug}`}.pdf"
                            class="text-gray-600 hover:text-blue-600 text-sm"
                            title="File: {m.path}"
                            target="_blank"
                        >
                            morgan-williams{m.slug === 'main' ? '' : `.${m.slug}`}.pdf
                        </a>
                    </div>
                {/each}
            </div>
        {:else}
            <div class="space-y-4">
                {#each groups as group}
                    <section>
                        <div class="flex items-center justify-between py-1">
                            <h2 class="text-sm font-medium text-gray-700">{group.name}</h2>
                            <span class="text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5">{group.items.length}</span>
                        </div>
                        <div>
                            {#each group.items as m}
                                <div class="flex items-center gap-3 py-1 hover:bg-gray-50 rounded px-2">
                                    {#if isDev}
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
                                    {/if}

                                    <a 
                                        href="/{m.slug}" 
                                        class="font-mono text-blue-600 hover:text-blue-800 text-sm font-medium"
                                    >
                                        {m.slug}
                                    </a>

                                    <a 
                                        href="/morgan-williams{m.slug === 'main' ? '' : `.${m.slug}`}.pdf"
                                        class="text-gray-600 hover:text-blue-600 text-sm"
                                        title="File: {m.path}"
                                        target="_blank"
                                    >
                                        morgan-williams{m.slug === 'main' ? '' : `.${m.slug}`}.pdf
                                    </a>
                                </div>
                            {/each}
                        </div>
                    </section>
                {/each}
            </div>
        {/if}
    </div>
</div>
