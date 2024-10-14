<script lang="ts">
	import Experience from "./Experience.svelte";
	import type { CVProps } from "../types";
	import Typewriter from "svelte-typewriter";
	import { Button } from "$lib/components/ui/button";
	import { Badge } from "$lib/components/ui/badge";
	import { Separator } from "$lib/components/ui/separator";

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
		name = "Morgan Williams",
		title = "Rapid full-stack development at scale",
		email = "workwith@morganwill.com",
		github = "https://github.com/mrgnw",
		pdfLink = "/morgan-williams-cv",
		experience = [
			{
				title: "Data Engineer & Architect",
				company: "National Care Dental",
				start: "2022-05-01",
				description: [
					"Designed and implemented data infrastructure and pipelines, enabling faster business operations and enhanced data insights while cutting costs significantly. (AWS, Python, duckdb and sqlmesh, Alteryx, SQL Server, healthcare CMS).",
					"Transitioned legacy workflows to modern data pipelines, accelerating tasks by 100x to 1000x through automation, reducing multi-hour processes to seconds or milliseconds.",
					"Mentored data analysts in Python and SQL, expanding their skills and capabilities, resulting in a substantial increase in productivity.",
				],
			},
			{
				title: "Senior Data Engineer",
				company: "Persefoni",
				start: "2021-08-01",
				end: "2022-05-31",
				description: [
					"Created API endpoints in GoLang, learning new tech & collaborating across teams to interface multiple services.",
					"Implemented ETL processes pipelines in Databricks.",
					"Documented & created new processes to onboard, train, and increase teammate productivity.",
				],
			},
			{
				title: "Software Engineer",
				company: "Zelis Healthcare",
				start: "2018-12-01",
				end: "2021-08-01",
				description: [
					"Created ETL workflows in Airflow, improving speeds up to 1000x.",
					"Migrated multiple codebases to Python3.",
					"Created Python APIs and internal web interfaces, empowering business users across teams to meaningfully interact with company data.",
				],
			},
		],
		skills = [
			"Python",
			"PostgreSQL",
			"DuckDB",
			"SQL",
			"JavaScript",
			"TypeScript",
			"Svelte",
			"AWS",
			"Linux",
			"Cloud",
			"Databricks",
			"Airflow",
		],
		education = [
			{
				degree: "Coding Bootcamp",
				provider: "vschool.io",
				summary: "Python + JavaScript",
				year: "2014",
			},
			{
				degree: "BA in Russian Language & Literature",
				provider: "BYU",
				year: "2014",
				summary: "minor in advertising communications",
			},
		],
	}: CVProps = $props();

	const iconSize = 30;
</script>

<div class="max-w-3xl mx-auto p-8 bg-background text-foreground">
	<header class="flex items-center justify-between mb-2">
		<div>
			<h1 class="text-4xl font-bold">{name}</h1>
			<div class="typewriter-wrapper h-10 flex items-center">
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
	.typewriter-wrapper {
		height: 2.5rem;
		display: flex;
		align-items: center;
		overflow: hidden;
	}
</style>
