<script>
  import CV from "$lib/CV.svelte";

  // Props - ONLY for display, no save functionality
  let {
    generatedCV,
    generationMetadata,
    showPreview = true,
    onTogglePreview,
  } = $props();
</script>

<div class="flex flex-col h-full min-h-0">
  <div class="flex justify-between items-center mb-4">
    <h2 class="text-xl font-semibold">Generated CV</h2>
    <div class="flex gap-2 items-center">
      {#if generatedCV?.matchScore}
        <div
          class="flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium"
          class:bg-red-100={generatedCV.matchScore <= 3}
          class:text-red-700={generatedCV.matchScore <= 3}
          class:bg-yellow-100={generatedCV.matchScore > 3 &&
            generatedCV.matchScore <= 6}
          class:text-yellow-700={generatedCV.matchScore > 3 &&
            generatedCV.matchScore <= 6}
          class:bg-green-100={generatedCV.matchScore > 6}
          class:text-green-700={generatedCV.matchScore > 6}
        >
          <span>Match Score:</span>
          <span class="font-bold">{generatedCV.matchScore}/10</span>
        </div>
      {/if}
      {#if generatedCV?.payScale}
        {@const formattedPay = generatedCV.payScale
          .replace(/[\$,]/g, "")
          .replace(/\s*—\s*/, "-")
          .replace(/(\d{3})\d{3}/g, "$1k")
          .replace(/\/year.*/, "")
          .trim()}
        <div
          class="px-3 py-1 rounded-lg text-sm font-medium bg-blue-100 text-blue-700"
        >
          ${formattedPay}
        </div>
      {/if}

      <button
        type="button"
        onclick={onTogglePreview}
        class="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
      >
        {showPreview ? "Show JSON" : "Show Preview"}
      </button>
    </div>
  </div>

  <div class="flex-1 min-h-0 border border-gray-300 rounded-lg overflow-hidden">
    {#if generatedCV}
      {#if showPreview}
        <div class="flex-1 min-h-0 overflow-auto">
          <div class="p-4 bg-white">
            <CV
              name="Morgan Williams"
              title={generatedCV.title || "Software Engineer"}
              email="morganfwilliams@me.com"
              github="https://github.com/mrgnw"
              pdfLink="/morgan-williams-cv"
              resolvedProjects={generatedCV.projects || []}
              experience={generatedCV.experience || []}
              skills={generatedCV.skills || []}
              education={generatedCV.education || []}
              variant="modern"
            />
          </div>
        </div>
      {:else}
        <div class="flex-1 min-h-0 overflow-auto">
          <pre class="overflow-auto p-4 bg-gray-50 text-sm">
{JSON.stringify(generatedCV, null, 2)}
          </pre>
        </div>
      {/if}
    {:else}
      <div
        class="flex-1 min-h-0 flex items-center justify-center text-gray-500"
      >
        <div class="text-center">
          <p class="mb-2">Your generated CV will appear here</p>
          <p class="text-sm">Paste a job description to get started</p>
        </div>
      </div>
    {/if}
  </div>
</div>
