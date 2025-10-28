<script lang="ts">
    import Experience from "./Experience.svelte";
    import Projects from "./Projects.svelte";
    import type { CV } from "../types";
    import { Separator } from "$lib/components/ui/separator";
    import { FileText } from "lucide-svelte";
    import { browser } from "$app/environment";
    import { format } from "date-fns";

    // Props
    let {
        name,
        title,
        email,
        github,
        pdfLink = "/morgan-williams-cv",
        resolvedProjects = [],
        experience,
        skills,
        education,
        version = undefined,
        lang = "en",

        contentLimits = null,
    } = $props();

    const iconSize = 30;
    let highlightedSkill = $state("");
    // Use optimized projects from derived value above

    function highlightStack(skill: string) {
        highlightedSkill = skill;
    }

    function formatDate(date: string): string {
        if (!date) return "";
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) return "";
        return format(parsedDate, "MMM yyyy");
    }

    function formatUrl(url: string): string {
        try {
            return url.replace(/^https?:\/\/(www\.)?/, "");
        } catch {
            return url;
        }
    }

    const searchParams = browser
        ? new URLSearchParams(window.location.search)
        : null;
    const isPrinting =
        contentLimits?.print || (browser && searchParams?.has("print"));

    // Use server-provided contentLimits if available, otherwise fall back to browser search params
    const effectiveContentLimits = $derived(() => {
        if (contentLimits) {
            return contentLimits;
        }

        if (!searchParams) return getDefaultLimits();

        // Only apply limits if they are explicitly set in searchParams
        // This ensures web pages show full content, and only PDF optimization applies limits
        return {
            exp1: searchParams.has("limitExp1")
                ? parseInt(searchParams.get("limitExp1")!)
                : null,
            exp2: searchParams.has("limitExp2")
                ? parseInt(searchParams.get("limitExp2")!)
                : null,
            exp3: searchParams.has("limitExp3")
                ? parseInt(searchParams.get("limitExp3")!)
                : null,
            exp4: searchParams.has("limitExp4")
                ? parseInt(searchParams.get("limitExp4")!)
                : null,
            projects: searchParams.has("maxProjects")
                ? parseInt(searchParams.get("maxProjects")!)
                : null,
            removeProjects: searchParams.has("removeProjects")
                ? parseInt(searchParams.get("removeProjects")!)
                : 0,
            print: searchParams.has("print"),
        };
    });

    function getDefaultLimits() {
        // Default is to show ALL content (no limits)
        return {
            exp1: null,
            exp2: null,
            exp3: null,
            exp4: null,
            projects: null,
            removeProjects: 0,
            print: false,
        };
    }

    // Apply content limits only when explicitly set
    const optimizedExperience = $derived(
        experience
            .filter((exp: any) => exp !== null && exp !== undefined)
            .map((exp: any, i: number) => {
                const limit = getExpLimit(i);
                return {
                    ...exp,
                    achievements:
                        limit !== null && exp.achievements
                            ? exp.achievements.slice(0, limit)
                            : exp.achievements || [],
                };
            }),
    );

    const optimizedProjects = $derived.by(() => {
        if (!resolvedProjects) return [];

        const limits = effectiveContentLimits();
        const maxProjects = limits.projects;
        const removeCount = limits.removeProjects;

        // If no limits specified, show all projects
        if (maxProjects === null && removeCount === 0) {
            return resolvedProjects;
        }

        // Apply limits
        const effectiveMax =
            maxProjects !== null
                ? Math.max(0, maxProjects - removeCount)
                : Math.max(0, resolvedProjects.length - removeCount);

        return resolvedProjects.slice(0, effectiveMax);
    });

    function getExpLimit(index: number) {
        const limits = effectiveContentLimits();
        const limitValues = [
            limits.exp1,
            limits.exp2,
            limits.exp3,
            limits.exp4,
        ];
        return limitValues[index]; // Returns null if not set, which means no limit
    }

    // Internationalization
    const es_labels = {
        skills: "Habilidades",
        experience: "Experiencia",
        projects: "Proyectos",
        education: "Educación",
        present: "Presente",
    };

    const en_labels = {
        skills: "Skills",
        experience: "Experience",
        projects: "Projects",
        education: "Education",
        present: "Present",
    };

    const labels = $derived(lang === "es" ? es_labels : en_labels);

    // Simple single layout approach
    const containerClass = "max-w-[800px] mx-auto px-8 pt-4 pb-8 bg-white text-black print:pt-2 print:pb-0 print:px-4 font-serif";
    const headerClass = "text-center mb-4 mt-1 print:mb-2 print:mt-0";
    const titleClass = "text-4xl font-bold";
    const sectionHeaderClass = "text-lg font-bold border-b border-black pb-0.5 mb-2";
</script>

<div class={containerClass} class:print-optimizing={isPrinting}>
    <header class={headerClass}>
        <h1 class={titleClass}>{name}</h1>

        <!-- Contact Info -->
        <div class="mt-2 text-sm space-x-2">
            <a href={`mailto:${email}`} class="hover:underline">{email}</a>
            <span>|</span>
            <a href={github} class="hover:underline">github.com/mrgnw</a>
            <span>|</span>
            <a href="https://linkedin.com/in/mrgnw" class="hover:underline"
                >linkedin.com/in/mrgnw</a
            >
        </div>
    </header>

    <!-- Skills -->
    <section class="mb-6">
        <div class="border-b border-black pb-0.5 mb-2">
            <div class="flex items-baseline gap-4">
                <h2 class="text-lg font-bold">{labels.skills}</h2>
                <div class="flex flex-wrap gap-x-8">
                    {skills.join(", ")}
                </div>
            </div>
        </div>
    </section>

    <!-- Experience -->
    <section class="mb-6">
        <h2 class={sectionHeaderClass}>{labels.experience}</h2>
        {#each optimizedExperience as job}
            <div class="mb-4">
                <div class="flex justify-between items-baseline">
                    <div>
                        <span class="font-bold">{job.title}</span>
                        <span>at {job.company}</span>
                    </div>
                    <span class="text-sm">
                        {#if job.start}
                            {formatDate(job.start)}{#if job.end} - {formatDate(job.end)}{:else} - Present{/if}
                        {:else}
                            {job.timeframe}
                        {/if}
                    </span>
                </div>
                <ul class="list-disc ml-4 mt-1">
                    {#each job.achievements as bullet}
                        <li class="text-sm leading-tight mb-1">{bullet}</li>
                    {/each}
                </ul>
            </div>
        {/each}
    </section>

    <!-- Projects -->
    {#if optimizedProjects?.length > 0}
        <section class="mb-6">
            <h2 class={sectionHeaderClass}>{labels.projects}</h2>
            {#each optimizedProjects as project}
                <div class="mb-3">
                    <div class="flex justify-between items-baseline">
                        <a
                            href={project.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="font-bold hover:underline"
                            >{project.name}</a
                        >
                        <a
                            href={project.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-sm hover:underline"
                            >{formatUrl(project.url)}</a
                        >
                    </div>
                    <p class="text-sm mt-0.5">{project.description}</p>
                </div>
            {/each}
        </section>
    {/if}

    <!-- Education -->
    <section>
        <h2 class={sectionHeaderClass}>{labels.education}</h2>
        {#each education as edu}
            <div class="flex justify-between items-baseline mb-1">
                <div>
                    <span class="font-bold">{edu.degree}</span>
                    <span>from {edu.provider}</span>
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
    /* Enhanced print optimizations */
    @media print {
        .print-optimizing {
            /* Priority-based content limiting for print */
            --exp-1-max: 5;
            --exp-2-max: 4;
            --exp-3-max: 4;
            --exp-4-max: 3;
            --projects-max: 4;
        }

        /* Hide lower priority content if page overflow */
        .print-optimizing
            :global(
                .experience-item:nth-child(4) .achievement:nth-child(n + 4)
            ) {
            display: none;
        }

        .print-optimizing :global(.project-item:nth-child(n + 5)) {
            display: none;
        }

        /* Compact spacing for print */
        .print-optimizing {
            font-size: 11pt !important;
            line-height: 1.3 !important;
        }

        .print-optimizing :global(.mb-4) {
            margin-bottom: 0.75rem !important;
        }

        .print-optimizing :global(.mb-2) {
            margin-bottom: 0.5rem !important;
        }

        /* Font size overrides */
        :global(.text-4xl) {
            font-size: 26pt;
        }

        :global(.text-2xl) {
            font-size: 15pt;
        }

        :global(.text-xl) {
            font-size: 13pt;
        }

        :global(.text-base) {
            font-size: 11pt;
        }

        :global(.text-sm) {
            font-size: 10pt;
        }

        :global(.text-xs) {
            font-size: 9pt;
        }
    }

    /* Traditional variant body styles */
    :global(.font-serif body) {
        font-family:
            "Bitstream Charter", "Palatino Linotype", Palatino, "Book Antiqua",
            Georgia, serif;
    }

    :global(
        .font-serif h1,
        .font-serif h2,
        .font-serif h3,
        .font-serif h4,
        .font-serif h5,
        .font-serif h6
    ) {
        font-weight: 600;
    }
</style>
