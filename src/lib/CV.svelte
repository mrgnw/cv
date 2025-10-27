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
		lang = 'en',
		variant = 'modern',
		contentLimits = null
	} = $props();




	const iconSize = 30;
	let highlightedSkill = "";
	// Use optimized projects from derived value above

	function highlightStack(skill: string) {
		highlightedSkill = skill;
	}

	function formatDate(date: string): string {
		return format(new Date(date), "MMM yyyy");
	}

	function formatUrl(url: string): string {
		try {
			return url.replace(/^https?:\/\/(www\.)?/, '');
		} catch {
			return url;
		}
	}

	const searchParams = browser ? new URLSearchParams(window.location.search) : null;
	const isPrinting = contentLimits?.print || (browser && searchParams?.has("print"));

	// Use server-provided contentLimits if available, otherwise fall back to browser search params
	const effectiveContentLimits = $derived(() => {
		if (contentLimits) {
			return contentLimits;
		}

		if (!searchParams) return getDefaultLimits();

		// Only apply limits if they are explicitly set in searchParams
		// This ensures web pages show full content, and only PDF optimization applies limits
		return {
			exp1: searchParams.has('limitExp1') ? parseInt(searchParams.get('limitExp1')) : null,
			exp2: searchParams.has('limitExp2') ? parseInt(searchParams.get('limitExp2')) : null,
			exp3: searchParams.has('limitExp3') ? parseInt(searchParams.get('limitExp3')) : null,
			exp4: searchParams.has('limitExp4') ? parseInt(searchParams.get('limitExp4')) : null,
			projects: searchParams.has('maxProjects') ? parseInt(searchParams.get('maxProjects')) : null,
			removeProjects: searchParams.has('removeProjects') ? parseInt(searchParams.get('removeProjects')) : 0,
			print: searchParams.has('print')
		};
	});

	function getDefaultLimits() {
		// Default is to show ALL content (no limits)
		return { exp1: null, exp2: null, exp3: null, exp4: null, projects: null, removeProjects: 0, print: false };
	}

	// Apply content limits only when explicitly set
	const optimizedExperience = $derived(
		experience.map((exp, i) => {
			const limit = getExpLimit(i);
			return {
				...exp,
				achievements: limit !== null ? exp.achievements.slice(0, limit) : exp.achievements
			};
		})
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
		const effectiveMax = maxProjects !== null
			? Math.max(0, maxProjects - removeCount)
			: Math.max(0, resolvedProjects.length - removeCount);

		return resolvedProjects.slice(0, effectiveMax);
	});

	function getExpLimit(index) {
		const limits = effectiveContentLimits();
		const limitValues = [limits.exp1, limits.exp2, limits.exp3, limits.exp4];
		return limitValues[index]; // Returns null if not set, which means no limit
	}



	// Internationalization
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

	// Style classes based on variant
	const containerClass = $derived(variant === 'modern'
		? "max-w-3xl mx-auto p-8 bg-background text-foreground print:p-0 print:max-w-none print:m-0"
		: "max-w-[800px] mx-auto p-8 bg-white text-black print:p-4 font-serif");

	const headerClass = $derived(variant === 'modern'
		? "flex items-start justify-between mb-8 print:mb-2 print:mt-0"
		: "text-center mb-4");

	const titleClass = $derived(variant === 'modern'
		? "text-4xl font-bold mb-1"
		: "text-4xl font-bold");

	const sectionHeaderClass = $derived(variant === 'modern'
		? "text-2xl font-semibold shrink-0"
		: "text-lg font-bold border-b border-black pb-0.5 mb-2");
</script>



<div class={containerClass} class:print-optimizing={isPrinting}>
	{#if variant === 'modern'}
		<!-- Modern variant header -->
		<header class={headerClass}>
			<div>
				<h1 class="inline {titleClass}">{name}</h1>
				<span class="text-muted-foreground ml-4">
					{#each skills as skill, index}
						<span
							role="button"
							tabindex="0"
							class="cursor-pointer hover:text-foreground transition-colors inline-block"
							onmouseenter={() => highlightStack(skill)}
							onmouseleave={() => highlightStack("")}
							ontouchstart={() => highlightStack(skill)}
							ontouchend={() => highlightStack("")}
						>
							{skill}{#if index < skills.length - 1}<span class="mx-1">•</span>{/if}
						</span>
					{/each}
				</span>
			</div>
			<div class="text-right text-sm text-muted-foreground space-y-1 mt-2">
				<a
					href={`mailto:${email}`}
					class="text-muted-foreground hover:text-foreground transition-colors block"
				>
					{email}
				</a>
				<a
					href={github}
					target="_blank"
					rel="noopener noreferrer"
					class="hover:text-foreground transition-colors block"
				>
					<span class="font-semibold">github</span>.com/mrgnw
				</a>
				<a
					href="https://www.linkedin.com/in/mrgnw/"
					target="_blank"
					rel="noopener noreferrer"
					class="hover:text-foreground transition-colors block"
				>
					<span class="font-semibold">linkedin</span>.com/in/mrgnw
				</a>
			</div>
		</header>

		<!-- Modern variant sections with separators -->
		<div class="flex items-center gap-4 mb-2 w-[81%] print:mb-1">
			<h2 class={sectionHeaderClass}>{labels.experience}</h2>
			<Separator class="flex-grow" />
		</div>
		<Experience experience={optimizedExperience} {highlightedSkill} />

		{#if optimizedProjects?.length > 0}
			<div class="flex items-center gap-4 mb-2 w-[85%] print:mb-1">
				<h2 class={sectionHeaderClass}>{labels.projects}</h2>
				<Separator class="flex-grow" />
			</div>
			<Projects projects={optimizedProjects} />
		{/if}

		<div class="flex items-center gap-4 mb-2 w-[85%] print:mb-1">
			<h2 class={sectionHeaderClass}>{labels.education}</h2>
			<Separator class="flex-grow" />
		</div>
		<section class="education grid grid-cols-2 gap-x-8 gap-y-2 print:gap-y-1 print:gap-x-4">
			{#each education as edu}
				<div class="education-entry">
					<div class="flex justify-between items-baseline">
						<div class="flex gap-2 items-baseline">
							<h3 class="font-semibold text-base">{edu.provider}</h3>
							<p class="text-base text-muted-foreground">{edu.degree}</p>
						</div>
						<span class="text-muted-foreground text-sm whitespace-nowrap ml-2">{edu.year}</span>
					</div>
					{#if edu.summary}
						<p class="text-sm text-muted-foreground">{edu.summary}</p>
					{/if}
					{#if edu.achievements?.length}
						<div class="text-sm text-muted-foreground inline-flex gap-2">
							{#each edu.achievements as achievement, i}
								<span>{achievement}{#if i < edu.achievements.length - 1} •{/if}</span>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</section>
	{:else}
		<!-- Traditional variant -->
		<header class={headerClass}>
			<h1 class={titleClass}>{name}</h1>

			<!-- Contact Info -->
			<div class="mt-2 text-sm space-x-2">
				<a href={`mailto:${email}`} class="hover:underline">{email}</a>
				<span>|</span>
				<a href={github} class="hover:underline">github.com/mrgnw</a>
				<span>|</span>
				<a href="https://linkedin.com/in/mrgnw" class="hover:underline">linkedin.com/in/mrgnw</a>
			</div>
		</header>

		<!-- Skills -->
		<section class="mb-6">
			<div class="border-b border-black pb-0.5 mb-2">
				<div class="flex items-baseline gap-4">
					<h2 class="text-lg font-bold">{labels.skills}</h2>
					<div class="flex flex-wrap gap-x-8">
						{skills.join(', ')}
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
							<span class="font-bold">{job.title},</span>
							<span>{job.company}</span>
						</div>
						<span class="text-sm">
							{formatDate(job.start)} – {job.end ? formatDate(job.end) : labels.present}
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
		<!-- Projects -->
		{#if optimizedProjects?.length > 0}
			<section class="mb-6">
				<h2 class={sectionHeaderClass}>{labels.projects}</h2>
				{#each optimizedProjects as project}
					<div class="mb-3">
						<div class="flex justify-between items-baseline">
							<a href={project.url} target="_blank" rel="noopener noreferrer" class="font-bold hover:underline">
								{project.localized_name || project.name}
							</a>
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
			<h2 class={sectionHeaderClass}>{labels.education}</h2>
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
	{/if}
</div>

<!-- PDF Download -->
<a
	href={pdfLink}
	target="_blank"
	rel="noopener noreferrer"
	aria-label="Download Morgan's CV"
	class="no-print fixed bottom-4 right-4 {variant === 'modern' ? 'bg-background' : 'bg-white'} p-2 rounded-full shadow-lg hover:bg-gray-50 flex items-center justify-center"
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
		.print-optimizing :global(.experience-item:nth-child(4) .achievement:nth-child(n+4)) {
			display: none;
		}

		.print-optimizing :global(.project-item:nth-child(n+5)) {
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
	}

	/* Container queries for dynamic optimization */
	@container (max-height: 800px) {
		:global(.experience-item:nth-child(4)) {
			opacity: 0.8;
		}

		:global(.project-item:nth-child(n+4)) {
			opacity: 0.7;
		}
	}

	/* Modern variant styles */
	:root {
		--line-height: 1.5;
		--font-size: 1.25rem;
	}

	@media (min-width: 640px) {
		:root {
			--line-height: 1.5;
			--font-size: 1rem;
		}
	}

	@media print {
		@page {
			size: A4;
			margin: 10mm 12mm 12mm 10mm;
		}

		:global(body) {
			margin: 0 !important;
			padding: 0 !important;
			font-size: 11pt !important;
			line-height: 1.4 !important;
		}

		/* Traditional variant print styles */
		.font-serif :global(body) {
			font-family: "Times New Roman", Times, serif;
			color: black;
			background: white;
		}

		/* Modern variant print styles */
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

		.no-print {
			display: none !important;
		}
	}

	/* Traditional variant body styles */
	:global(.font-serif body) {
		font-family: "Bitstream Charter", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
	}

	:global(.font-serif h1, .font-serif h2, .font-serif h3, .font-serif h4, .font-serif h5, .font-serif h6) {
		font-weight: 600;
	}
</style>
