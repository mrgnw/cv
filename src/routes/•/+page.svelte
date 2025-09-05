<script lang="ts">
    import { getAllVersions, getAllVersionMeta } from '$lib/versionReader';
    import { Button } from "$lib/components/ui/button/index.js";
    import { Separator } from "$lib/components/ui/separator/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    
    const versions = getAllVersions();
    const meta = getAllVersionMeta();
    
    let generating = $state(false);
    let generatingVersion = $state<string | null>(null);
    let lastResult = $state<{ ok: boolean; duration: string; stdout?: string; stderr?: string } | null>(null);

    async function triggerGeneration(force = false, targetVersions?: string[]) {
        generating = true;
        generatingVersion = targetVersions?.length === 1 ? targetVersions[0] : null;
        lastResult = null;
        
        try {
            const versionsToGenerate = targetVersions || [];
            const res = await fetch('/dev/api/pdf', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ versions: versionsToGenerate, force }) 
            });
            const data = await res.json();
            lastResult = { 
                ok: data.ok, 
                duration: data.duration, 
                stdout: data.stdout,
                stderr: data.stderr
            };
        } catch (e: any) {
            lastResult = { ok: false, duration: '0', stderr: e.message };
        } finally {
            generating = false;
            generatingVersion = null;
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
    </div>

    <!-- Result Display -->
    {#if lastResult}
        <div class="p-4 rounded-lg border {lastResult.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}">
            <div class="flex items-center gap-2 mb-2">
                <span class="text-sm font-medium">
                    {lastResult.ok ? '✅ Success' : '❌ Failed'} in {lastResult.duration}s
                </span>
            </div>
            
            {#if lastResult.stdout}
                <details class="mt-2">
                    <summary class="cursor-pointer text-sm text-gray-700 hover:text-gray-900">
                        Output
                    </summary>
                    <pre class="mt-2 text-xs bg-white/50 p-3 rounded font-mono overflow-x-auto">{lastResult.stdout.trim()}</pre>
                </details>
            {/if}
            
            {#if lastResult.stderr}
                <details class="mt-2">
                    <summary class="cursor-pointer text-sm text-red-700 hover:text-red-900">
                        Errors
                    </summary>
                    <pre class="mt-2 text-xs bg-red-100 p-3 rounded font-mono overflow-x-auto">{lastResult.stderr.trim()}</pre>
                </details>
            {/if}
        </div>
    {/if}

    <Separator />

    <!-- Version List -->
    <div class="space-y-3">
        {#each meta as m}
            <div class="flex items-center justify-between py-2 px-1 hover:bg-gray-50 rounded">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                    <a href="/{m.slug}" class="font-mono text-blue-600 hover:text-blue-800 text-sm font-medium">
                        {m.slug}
                    </a>
                    <span class="text-gray-600 text-sm truncate">
                        {m.path.replace('/src/lib/versions/', '')}
                    </span>
                    {#if m.job || m.company}
                        <div class="flex gap-1">
                            {#if m.job}
                                <Badge variant="secondary" class="text-xs">{m.job}</Badge>
                            {/if}
                            {#if m.company}
                                <Badge variant="outline" class="text-xs">{m.company}</Badge>
                            {/if}
                        </div>
                    {/if}
                </div>
                
                <Button 
                    onclick={() => triggerGeneration(true, [m.slug])}
                    disabled={generating}
                    variant="ghost"
                    size="sm"
                    class="ml-4 h-8 w-8 p-0"
                >
                    {#if generating && generatingVersion === m.slug}
                        <svg class="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
                    {:else}
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                    {/if}
                </Button>
            </div>
        {/each}
    </div>
</div>
