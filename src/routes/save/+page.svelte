<script>
    let isSaving = $state(false);
    let saveResult = $state('');
    let error = $state('');

    async function testSave() {
        if (isSaving) return;
        
        isSaving = true;
        saveResult = '';
        error = '';
        
        try {
            console.log('Starting simulated save...');
            
            const response = await fetch('/api/simulate-save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    testData: 'This is a test save',
                    timestamp: new Date().toISOString()
                })
            });
            
            console.log('Response received:', response.status, response.ok);
            
            const data = await response.json();
            console.log('Response data:', data);
            
            if (response.ok) {
                saveResult = `✅ Simulated save successful! Response: ${JSON.stringify(data)}`;
            } else {
                error = `❌ Save failed with status ${response.status}: ${data.error || 'Unknown error'}`;
            }
        } catch (err) {
            console.error('Save error:', err);
            error = `❌ Network error: ${err.message}`;
        } finally {
            isSaving = false;
            console.log('Save operation completed');
        }
    }
</script>

<svelte:head>
    <title>Save Test Page</title>
</svelte:head>

<div class="container max-w-2xl mx-auto p-8">
    <header class="mb-8">
        <h1 class="text-3xl font-bold mb-2">Save Workflow Test</h1>
        <p class="text-gray-600">
            Testing fetch requests to confirm save functionality works without page reloads
        </p>
    </header>

    <div class="space-y-6">
        <!-- Test Button -->
        <div class="border rounded-lg p-6">
            <h2 class="text-xl font-semibold mb-4">Simulate Save Operation</h2>
            
            <button
                type="button"
                onclick={testSave}
                disabled={isSaving}
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSaving ? '⏳ Saving...' : '💾 Test Save'}
            </button>
        </div>

        <!-- Results -->
        {#if saveResult}
            <div class="border border-green-200 bg-green-50 rounded-lg p-4">
                <h3 class="font-medium text-green-800 mb-2">Success</h3>
                <p class="text-green-700">{saveResult}</p>
            </div>
        {/if}

        {#if error}
            <div class="border border-red-200 bg-red-50 rounded-lg p-4">
                <h3 class="font-medium text-red-800 mb-2">Error</h3>
                <p class="text-red-700">{error}</p>
            </div>
        {/if}

        <!-- Debug Info -->
        <div class="border rounded-lg p-4 bg-gray-50">
            <h3 class="font-medium mb-2">Debug Info</h3>
            <ul class="text-sm text-gray-600 space-y-1">
                <li>• Current saving state: <code>{isSaving}</code></li>
                <li>• Page should NOT reload after clicking the button</li>
                <li>• Check browser console for detailed logs</li>
                <li>• Check Network tab to see the API request</li>
            </ul>
        </div>

        <!-- Back Link -->
        <div class="pt-4">
            <a href="/new" class="text-blue-600 hover:text-blue-800 underline">
                ← Back to CV Generator
            </a>
        </div>
    </div>
</div>