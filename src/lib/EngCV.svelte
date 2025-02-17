<script lang="ts">
    import type { CVProps } from "../types";
    import { browser } from "$app/environment";
    import mainData from "$lib/versions/main.json";
    import { format } from "date-fns";
    import { FileText } from "lucide-svelte";
    import JSON5 from 'json5';
    import { Button } from "$lib/components/ui/button";
    import { getAllVersions } from "$lib/versionReader";
    import { page } from "$app/stores";

    // Destructure props
    let {
      name = mainData.name,
      title = mainData.title,
      email = mainData.email,
      github = mainData.github,
      pdfLink = "/morgan-williams-cv",
      projects = mainData.projects,
      experience = mainData.experience,
      skills = mainData.skills,
      education = mainData.education,
      version = $page.params.slug || 'main',
      lang = 'en'
    }: CVProps = $props();

    const iconSize = 30;
    function formatDate(date: string): string {
      return format(new Date(date), "MMM yyyy");
    }

    const isPrinting = browser && new URLSearchParams(window.location.search).has("print");
    const searchParams = browser ? new URLSearchParams(window.location.search) : null;
    const removeProjects = searchParams?.get('removeProjects') 
      ? parseInt(searchParams.get('removeProjects')) 
      : 0;

    if (removeProjects > 0 && projects?.length) {
      projects = projects.slice(0, Math.max(0, projects.length - removeProjects));
    }

    function formatUrl(url: string): string {
        try {
            return url.replace(/^https?:\/\/(www\.)?/, '');
        } catch {
            return url;
        }
    }

    const es_labels = {
      skills: 'Habilidades',
      experience: 'Experiencia',
      projects: 'Proyectos',
      education: 'Educación',
      present: 'Presente'
    };

    const en_labels = {
      skills: 'Skills',
      experience: 'Experience',
      projects: 'Projects',
      education: 'Education',
      present: 'Present'
    };

    const labels = $derived(lang === 'es' ? es_labels : en_labels);

    const projectFiles = {
      ...import.meta.glob<string>('/src/lib/projects/*.jsonc', { query: '?raw', import: 'default', eager: true }),
      ...import.meta.glob<string>('/src/lib/versions/es/projects/*.jsonc', { query: '?raw', import: 'default', eager: true })
    };

    const projectList = $derived(() => {
      const paths = Object.keys(projectFiles);
      const projects = paths.map(path => {
        const content = projectFiles[path];
        return content ? JSON5.parse(content) : [];
      });
      return projects.flat();
    });

    const allVersions = getAllVersions();
    const isSpanishVersion = $derived(version?.endsWith('.es'));
    const otherVersionSlug = $derived(
      isSpanishVersion ? version.replace('.es', '') : `${version}.es`
    );
    const hasOtherLanguage = $derived(allVersions.includes(otherVersionSlug));
    const otherLangUrl = $derived(`/${otherVersionSlug}`);
  </script>

  <div class="max-w-[800px] mx-auto p-8 bg-white text-black print:p-4 font-serif">
    <!-- Name -->
    <header class="text-center mb-4">
      <h1 class="text-4xl font-bold">{name}</h1>
      
      <!-- Contact Info -->
      <div class="mt-2 text-sm space-x-2">
        <a href={`mailto:${email}`} class="hover:underline">{email}</a>
        <span>|</span>
        <a href={github} class="hover:underline">github.com/mrgnw</a>
        <span>|</span>
        <a href="https://linkedin.com/in/mrgnw" class="hover:underline">linkedin.com/in/mrgnw</a>
      </div>
    </header>

    <!-- Language Switcher -->
    {#if hasOtherLanguage && !isPrinting}
      <div class="no-print fixed bottom-4 right-16 flex items-center">
        <a
          href={otherLangUrl}
          class="bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 flex items-center justify-center"
          style="width: {iconSize}px; height: {iconSize}px;"
          aria-label={isSpanishVersion ? "Switch to English" : "Cambiar a Español"}
        >
          {#if isSpanishVersion}
            <span class="text-xl">🇺🇸</span>
          {:else}
            <span class="text-xl">🇪🇸</span>
          {/if}
        </a>
      </div>
    {/if}

    <!-- Skills -->
    <section class="mb-6">
      <h2 class="text-lg font-bold border-b border-black pb-0.5 mb-2">{labels.skills}</h2>
      <div class="flex flex-wrap gap-x-8">
        {skills.join(', ')}
      </div>
    </section>

    <!-- Experience -->
    <section class="mb-6">
      <h2 class="text-lg font-bold border-b border-black pb-0.5 mb-2">{labels.experience}</h2>
      {#each experience as job}
        <div class="mb-4">
          <div class="flex justify-between items-baseline">
            <div>
              <span class="font-bold">{job.title},</span>
              <span>{job.company}</span>
            </div>
            <span class="text-sm">
              {formatDate(job.start)} – {job.end ? formatDate(job.end) : labels.present}
            </span>
          </div>
          <ul class="list-disc ml-4 mt-1">
            {#each job.description as bullet}
              <li class="text-sm leading-tight mb-1">{bullet}</li>
            {/each}
          </ul>
        </div>
      {/each}
    </section>

    <!-- Projects -->
    {#if projects?.length}
      <section class="mb-6">
        <h2 class="text-lg font-bold border-b border-black pb-0.5 mb-2">{labels.projects}</h2>
        {#each projects as project}
          <div class="mb-3">
            <div class="flex justify-between items-baseline">
              <a href={project.url} target="_blank" rel="noopener noreferrer" class="font-bold hover:underline">{project.localized_name || project.name}</a>
              <a href={project.url} target="_blank" rel="noopener noreferrer" class="text-sm hover:underline">
                {formatUrl(project.url)}
              </a>
            </div>
            <p class="text-sm mt-0.5">{project.description}</p>
          </div>
        {/each}
      </section>
    {/if}

    <!-- Education -->
    <section>
      <h2 class="text-lg font-bold border-b border-black pb-0.5 mb-2">{labels.education}</h2>
      {#each education as edu}
        <div class="flex justify-between items-baseline mb-1">
          <div>
            <span class="font-bold">{edu.provider}</span>
            <span> — {edu.degree}</span>
          </div>
          <span>{edu.year}</span>
        </div>
      {/each}
    </section>
  </div>

  <!-- PDF Download -->
  <a
      href={pdfLink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Download Morgan's CV"
      class="no-print fixed bottom-4 right-4 bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 flex items-center justify-center"
      style="width: {iconSize}px; height: {iconSize}px;"
      data-sveltekit-preload-data="hover"
  >
      <FileText size={iconSize} />
  </a>

  <style>
    @media print {
      @page {
        margin: 0.5in;
      }
      :global(body) {
        font-family: "Times New Roman", Times, serif;
        line-height: 1.4;
        color: black;
        background: white;
      }
    }

    :global(body) {
      font-family: "Bitstream Charter", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
    }

    :global(h1, h2, h3, h4, h5, h6) {
      font-weight: 600;
    }
  </style>