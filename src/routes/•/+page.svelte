<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import { getAllVersionMeta } from '$lib/versionReader';
    import { Separator } from "$lib/components/ui/separator/index.js";
    import { browser } from '$app/environment';
    import { onMount } from 'svelte';
    import type { VersionMeta } from '../../types';
    
    const { data } = $props();
    const isDev = data.dev;
    const meta = getAllVersionMeta();
    
    let generating = $state(false);
    let generatingVersion = $state<string | null>(null);
    let committing = $state(false);
    let lastResult = $state<any>(null);
    let lastCommitResult = $state<any>(null);
    let resultHistory = $state<any[]>([]);
    let requestId = $state<string | null>(null);
    let groupBy = $state<'skill' | 'company'>('skill');

    const sortedMeta = [...meta].sort((a, b) => 
        a.slug === 'main' ? -1 : b.slug === 'main' ? 1 : a.slug.localeCompare(b.slug)
    );

    // Debug logging (reactive)
    let debugInfo = $derived({ meta: meta.length, sortedMeta: sortedMeta.length, groupBy });

    let groups = $derived((() => {
        const buckets = new Map<string, VersionMeta[]>();
        for (const m of sortedMeta) {
            const key = m.slug === 'main' ? 'Base' : 
                       groupBy === 'skill' ? (m.job || 'Other') : (m.company || 'Other');
            if (!buckets.has(key)) buckets.set(key, []);
            buckets.get(key)!.push(m);
        }
        const result = Array.from(buckets.entries())
            .map(([name, items]) => ({ name, items }))
            .sort((a, b) => a.name === 'Base' ? -1 : b.name === 'Base' ? 1 : a.name.localeCompare(b.name));
        
        console.log('Groups result:', result);
        return result;
    })());

    function displayName(m: VersionMeta): string {
        if (m.slug === 'main') return 'main';
        return groupBy === 'skill' ? (m.company ?? m.slug) : (m.job ?? m.slug);
    }

    onMount(() => {
        if (!browser) return;
        
        // Restore history
        try {
            const saved = localStorage.getItem('pdf-generation-history');
            if (saved) {
                resultHistory = JSON.parse(saved);
                lastResult = resultHistory[0] ?? null;
            }
        } catch {}

        // Restore grouping
        const savedGroup = localStorage.getItem('cv-group-by');
        if (savedGroup === 'skill' || savedGroup === 'company') {
            groupBy = savedGroup;
        }

        // Resume generation if interrupted
        try {
            const savedGenerating = localStorage.getItem('pdf-generating');
            if (savedGenerating) {
                const { timestamp, id } = JSON.parse(savedGenerating);
                if (Date.now() - timestamp < 30000) {
                    generating = true;
                    requestId = id;
                    pollForCompletion(id);
                } else {
                    localStorage.removeItem('pdf-generating');
                }
            }
        } catch {}
    });

    // Save grouping preference reactively when it changes
    let saveGroupBy = $derived.by(() => {
        if (browser) localStorage.setItem('cv-group-by', groupBy);
        return groupBy;
    });

    function saveToHistory(result: any, versions?: string[]) {
        const entry = { ...result, timestamp: new Date().toLocaleTimeString(), versions: versions || ['all'] };
        resultHistory = [entry, ...resultHistory.slice(0, 9)];
        if (browser) localStorage.setItem('pdf-generation-history', JSON.stringify(resultHistory));
    }

    async function pollForCompletion(id: string) {
        try {
            const res = await fetch(`/dev/api/pdf/status?id=${id}`);
            if (res.ok) {
                const data = await res.json();
                if (data.complete) {
                    lastResult = data.result;
                    saveToHistory(data.result);
                    generating = false;
                    generatingVersion = null;
                    requestId = null;
                    if (browser) localStorage.removeItem('pdf-generating');
                    return;
                }
            }
        } catch {}
        
        if (generating && requestId === id) {
            setTimeout(() => pollForCompletion(id), 1000);
        }
    }

    async function triggerGeneration(force = false, targetVersions?: string[]) {
        if (generating) return;

        const id = Math.random().toString(36).substring(7);
        generating = true;
        generatingVersion = targetVersions?.length === 1 ? targetVersions[0] : null;
        requestId = id;
        
        if (browser) {
            localStorage.setItem('pdf-generating', JSON.stringify({ timestamp: Date.now(), id }));
        }
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);
            
            const res = await fetch('/dev/api/pdf', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ versions: targetVersions || [], force, requestId: id }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            
            const data = await res.json();
            lastResult = { ok: data.ok, duration: data.duration, stdout: data.stdout, stderr: data.stderr, timestamp: new Date().toLocaleTimeString() };
            saveToHistory(lastResult, targetVersions);
            
        } catch (e: any) {
            lastResult = { 
                ok: false, 
                duration: '0', 
                stderr: e.name === 'AbortError' ? 'Request timed out after 60 seconds' : e.message,
                stdout: 'Check Docker logs: docker-compose logs -f svelte',
                timestamp: new Date().toLocaleTimeString()
            };
            saveToHistory(lastResult, targetVersions);
        } finally {
            generating = false;
            generatingVersion = null;
            requestId = null;
            if (browser) localStorage.removeItem('pdf-generating');
        }
    }

    async function triggerCommitPush() {
        if (committing) return;
        committing = true;
        
        try {
            const pdfRes = await fetch('https://cv.skate-in.ts.net/dev/api/pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ force: false })
            });
            
            if (!pdfRes.ok) throw new Error(`Remote PDF failed: ${pdfRes.status}`);
            const pdfData = await pdfRes.json();
            
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            const gitRes = await fetch('/dev/api/pdf-commit', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
            const gitData = await gitRes.json();
            
            lastCommitResult = { 
                ok: pdfData.ok && gitData.ok, 
                duration: pdfData.duration || '0s', 
                stdout: `PDF: ${pdfData.stdout || 'Success'}\nGit: ${gitData.message || 'Trigger created'}`,
                stderr: pdfData.stderr || gitData.error || '',
                timestamp: new Date().toLocaleTimeString()
            };
            
        } catch (e: any) {
            lastCommitResult = { 
                ok: false, 
                duration: '0s', 
                stderr: e.message,
                stdout: 'Auto-workflow failed',
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
        <!-- Status Banners -->
        {#if generating}
            <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                <svg class="h-5 w-5 animate-spin text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <div>
                    <div class="font-medium text-blue-900">
                        {generatingVersion ? `Generating ${generatingVersion}...` : 'Generating all PDFs...'}
                    </div>
                    <div class="text-sm text-blue-700">Results will persist if page refreshes</div>
                </div>
            </div>
        {/if}

        {#if committing}
            <div class="p-4 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-3">
                <svg class="h-5 w-5 animate-spin text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <div>
                    <div class="font-medium text-purple-900">Generating PDFs, committing, and pushing...</div>
                    <div class="text-sm text-purple-700">PDF generation → Git add → Git commit → Git push</div>
                </div>
            </div>
        {/if}

        <!-- Quick Actions -->
        <div class="flex gap-3 flex-wrap">
            <Button onclick={() => triggerGeneration(false)} disabled={generating || committing}>
                {generating && !generatingVersion ? 'Generating...' : 'Generate All'}
            </Button>
            <Button onclick={() => triggerGeneration(true)} disabled={generating || committing} variant="secondary">
                {generating && !generatingVersion ? 'Regenerating...' : 'Regenerate All'}
            </Button>
            <Button onclick={triggerCommitPush} disabled={generating || committing} variant="outline" 
                    class="bg-green-50 border-green-200 text-green-700 hover:bg-green-100">
                {committing ? 'Creating Trigger...' : '🤖 Auto-Generate & Deploy'}
            </Button>
            {#if generating}
                <Button onclick={() => { generating = false; generatingVersion = null; requestId = null; }} 
                        variant="outline" size="sm">Cancel</Button>
            {/if}
        </div>

        <!-- Results -->
        {#each [['PDF', lastResult], ['Commit', lastCommitResult]] as [type, result]}
            {#if result}
                <div class="p-4 rounded-lg border {result.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium">
                            {type}: {result.ok ? '✅ Success' : '❌ Failed'} in {result.duration}s
                            <span class="text-gray-500 ml-2">at {result.timestamp}</span>
                        </span>
                        {#if type === 'PDF' && resultHistory.length > 1}
                            <Button variant="ghost" size="sm" onclick={() => { resultHistory = []; lastResult = null; }}>
                                Clear History
                            </Button>
                        {/if}
                    </div>
                    
                    {#if result.stdout}
                        <details class="mt-2" open={!result.ok}>
                            <summary class="cursor-pointer text-sm text-gray-700 hover:text-gray-900">Output</summary>
                            <pre class="mt-2 text-xs bg-white/50 p-3 rounded font-mono overflow-x-auto whitespace-pre-wrap">{result.stdout.trim()}</pre>
                        </details>
                    {/if}
                    
                    {#if result.stderr}
                        <details class="mt-2" open>
                            <summary class="cursor-pointer text-sm text-red-700 hover:text-red-900">Errors</summary>
                            <pre class="mt-2 text-xs bg-red-100 p-3 rounded font-mono overflow-x-auto whitespace-pre-wrap">{result.stderr.trim()}</pre>
                        </details>
                    {/if}
                </div>
            {/if}
        {/each}

        <!-- History -->
        {#if resultHistory.length > 1}
            <details>
                <summary class="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    Recent History ({resultHistory.length - 1} more)
                </summary>
                <div class="space-y-2 mt-2">
                    {#each resultHistory.slice(1) as result}
                        <div class="p-3 rounded border bg-gray-50 text-sm">
                            <div class="flex justify-between items-center">
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

    <!-- Version List -->
    <div class="space-y-3">
        <div class="inline-flex rounded-md border border-gray-200 overflow-hidden">
            <button class="px-2 py-1 text-sm border-r transition-colors {groupBy === 'skill' ? 'bg-gray-200 text-gray-900' : 'bg-white text-gray-600 hover:bg-gray-50'}"
                    onclick={() => (groupBy = 'skill')}>Skill</button>
            <button class="px-2 py-1 text-sm transition-colors {groupBy === 'company' ? 'bg-gray-200 text-gray-900' : 'bg-white text-gray-600 hover:bg-gray-50'}"
                    onclick={() => (groupBy = 'company')}>Company</button>
        </div>

        <div class="space-y-4">
            {#each groups as group}
                <section>
                    {#if group.items.length > 1}
                        <div class="flex items-center justify-between py-1">
                            <h2 class="text-sm font-medium text-gray-700">{group.name}</h2>
                            <span class="text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5">{group.items.length}</span>
                        </div>
                    {/if}
                    <div>
                        {#each group.items as m}
                            <div class="flex items-center gap-3 py-1 hover:bg-gray-50 rounded px-2">
                                {#if isDev}
                                    <button onclick={() => triggerGeneration(true, [m.slug])} disabled={generating}
                                            class="text-gray-500 hover:text-gray-700 disabled:opacity-50" title="Regenerate PDF">
                                        {generating && generatingVersion === m.slug ? '⟳' : '↻'}
                                    </button>
                                {/if}
                                <a href="/{m.slug}" class="font-mono text-blue-600 hover:text-blue-800 text-sm font-medium">
                                    {displayName(m)}
                                </a>
                                <a href="/morgan-williams{m.slug === 'main' ? '' : `.${m.slug}`}.pdf" target="_blank"
                                   class="text-gray-600 hover:text-blue-600 text-sm" title="File: {m.path}">
                                    morgan-williams{m.slug === 'main' ? '' : `.${m.slug}`}.pdf
                                </a>
                            </div>
                        {/each}
                    </div>
                </section>
            {/each}
        </div>
    </div>
</div>
