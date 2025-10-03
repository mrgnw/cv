<script>
    let isSaving = $state(false);
    let saveResult = $state('');
    let error = $state('');

    // Sample CV data for testing actual save functionality
    const sampleCVData = {
        title: "Full Stack Software Engineer",
        company: "TestCorp",
        matchScore: 9,
        payScale: "$130,000 - $160,000",
        normalizedTitle: "software-engineer-full-stack-test",
        projects: [
            {
                name: "Test Analytics Dashboard",
                description: "Built a test dashboard processing 1M+ events/day using React, Node.js, and WebSocket connections",
                url: "https://github.com/example/test-analytics-dashboard",
                localized_name: "Test Analytics Dashboard"
            },
            {
                name: "Test Microservices Architecture",
                description: "Designed and implemented test microservices using Docker, Kubernetes, and gRPC",
                url: "https://github.com/example/test-microservices",
                localized_name: "Test Microservices Platform"
            }
        ],
        experience: [
            {
                title: "Senior Software Engineer",
                company: "Test Previous Corp",
                start: "2022-01-01",
                end: null,
                achievements: [
                    "Led development of core platform features serving 100k+ users",
                    "Reduced API response times by 40% through optimization",
                    "Mentored 3 junior developers"
                ]
            }
        ],
        skills: ["JavaScript", "TypeScript", "React", "Node.js", "PostgreSQL", "AWS", "Docker", "Testing"],
        education: [
            {
                provider: "University of Technology",
                degree: "Computer Science",
                year: "2020",
                summary: "B.S. in Computer Science with focus on software engineering"
            }
        ]
    };

    async function testSave() {
        if (isSaving) return;
        
        isSaving = true;
        saveResult = '';
        error = '';
        
        try {
            console.log('Starting actual CV save...');
            
            const response = await fetch('/api/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cvData: {
                        ...sampleCVData,
                        metadata: {
                            savedAt: new Date().toISOString(),
                            version: '1.0.0'
                        }
                    },
                    company: sampleCVData.company,
                    title: sampleCVData.title,
                    createNewVersion: false
                })
            });
            
            console.log('Response received:', response.status, response.ok);
            
            const data = await response.json();
            console.log('Response data:', data);
            
            if (response.ok) {
                const scoreText = sampleCVData?.matchScore ? ` (Match: ${sampleCVData.matchScore}/10)` : '';
                const payText = sampleCVData?.payScale ? ` (${sampleCVData.payScale})` : '';
                const versionText = data.isNewVersion ? ` v${data.versionNumber}` : '';
                saveResult = `✅ Version${versionText} saved as versions/${data.filename}${scoreText}${payText}`;
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
    <title>CV Save Test</title>
</svelte:head>

<div class="container max-w-2xl mx-auto p-8">
    <header class="mb-8">
        <h1 class="text-3xl font-bold mb-2">CV Save Test</h1>
        <p class="text-gray-600">
            Testing actual CV save functionality with sample data - no page reloads
        </p>
    </header>

    <div class="space-y-6">
        <!-- Test Button -->
        <div class="border rounded-lg p-6">
            <h2 class="text-xl font-semibold mb-4">Save Sample CV</h2>
            <p class="text-sm text-gray-600 mb-4">
                This will save a sample CV with TestCorp company data to test the save functionality.
            </p>
            
            <button
                type="button"
                onclick={testSave}
                disabled={isSaving}
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSaving ? '⏳ Saving...' : '💾 Save Test CV'}
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
                <li>• Uses real <code>/api/save</code> endpoint</li>
                <li>• Saves sample CV data for TestCorp</li>
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