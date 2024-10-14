<script lang="ts">
	import Experience from "./Experience.svelte";
	import type { CVProps } from "../types";
	import Typewriter from "svelte-typewriter";
	import { Button } from "$lib/components/ui/button";
	import { Badge } from "$lib/components/ui/badge";
	import { Separator } from "$lib/components/ui/separator";
	
		import mainData from '$lib/versions/main.json';

	import {
		Avatar,
		AvatarImage,
		AvatarFallback,
	} from "$lib/components/ui/avatar";
	import {
		Mail,
		Phone,
		Linkedin,
		Github,
		CalendarClock,
		FileText,
	} from "lucide-svelte";

	// Destructure props
	let {
		name = mainData.name,
		title = mainData.title,
		email = mainData.email,
		github = mainData.github,
		pdfLink = "/morgan-williams-cv",
		experience = mainData.experience,
		skills = mainData.skills,
		education = mainData.education,
	}: CVProps = $props();

	const iconSize = 30;
</script>

<div class="max-w-3xl mx-auto p-8 bg-background text-foreground">
	<header class="flex items-center justify-between mb-2">
		<div>
			<h1 class="text-4xl font-bold">{name}</h1>
			<div class="typewriter-wrapper">
				<Typewriter>
					<p class="text-xl text-muted-foreground">{title}</p>
				</Typewriter>
			</div>
		</div>
		<Avatar class="w-24 h-24">
			<AvatarImage src="/morgan.jpg" alt={name} rel="preload" />
			<AvatarFallback>{name[0]}</AvatarFallback>
		</Avatar>
	</header>

	<section class="mb-8">
		<h2 class="text-2xl font-semibold mb-4">Skills</h2>
		<div class="flex flex-wrap gap-2">
			{#each skills as skill}
				<Badge>{skill}</Badge>
			{/each}
		</div>
	</section>
	<section class="mb-6" id="links">
		<h2 class="sr-only">Contact and Social Links</h2>
		<div class="flex flex-wrap gap-4">
			<div class="flex items-center gap-2 -ml-2">
				<a
					href="https://morganwill.com/cal"
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Schedule an intro call with Morgan"
				>
					<Button variant="outline">
						<div class="flex items-center gap-2">
							<Phone size={iconSize} />
							<CalendarClock size={iconSize} />
						</div>
					</Button>
				</a>
			</div>
			<div class="flex items-center gap-2 -ml-2">
				<a
					href="https://www.linkedin.com/in/mrgnw/"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center"
					aria-label="Morgan's LinkedIn profile"
				>
					<Linkedin size={iconSize} />
				</a>
			</div>
			<div class="flex items-center gap-2">
				<a
					href={github}
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Morgan's GitHub profile"
				>
					<Github size={iconSize} />
				</a>
			</div>
			<div class="flex items-center gap-2">
				<a href={`mailto:${email}`} aria-label="Email Morgan">
					<Mail size={iconSize} />
				</a>
			</div>
		</div>
	</section>

	<Separator class="my-8" />

	<Experience {experience} />

	<section class="education">
		<h2 class="text-2xl font-semibold mb-4">Education</h2>
		{#each education as edu}
			<p class="font-semibold flex justify-between">
				{edu.degree} @ {edu.provider}
				<span class="text-muted-foreground"> {edu.year}</span>
			</p>
			{#if edu.summary}
				<p class="text-muted-foreground">{edu.summary}</p>
			{/if}
		{/each}
	</section>
</div>

<!-- PDF Download -->
<a
	href={pdfLink}
	target="_blank"
	rel="noopener noreferrer"
	aria-label="Download Morgan's CV"
	class="no-print fixed bottom-4 right-4 bg-background p-2 rounded-full shadow-lg"
	data-sveltekit-preload-data="hover"
>
	<FileText size={iconSize} />
</a>

<style>
	:root {
		--line-height: 1.5;
		--font-size: 1.25rem;
	}

	.typewriter-wrapper {
		min-height: calc(var(--line-height) * var(--font-size) * 2);
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		overflow: hidden;
	}

	.typewriter-wrapper :global(p) {
		font-size: var(--font-size);
		line-height: var(--line-height);
		margin: 0;
	}

	@media (min-width: 640px) {
		.typewriter-wrapper {
			min-height: calc(var(--line-height) * var(--font-size));
		}
	}
</style>
