<script>
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Textarea } from "$lib/components/ui/textarea";
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
		MapPin,
		Linkedin,
		Github,
		Calendar,
	} from "lucide-svelte";
	import Experience from "./Experience.svelte";

	let name = "Morgan Williams";
	let title = "Rapid full-stack development at scale";
	let email = "workwith@morganwill.com";

	let linkedin = "https://www.linkedin.com/in/mrgnw/";
	let github = "https://github.com/mrgnw";
	let experience = [
		{
			title: "Lead Data Engineering Consultant",
			company: "National Care Dental",
			start: "2021-08-01",
			// No end date means current
			description: [
				"Designed and implemented data infrastructure and pipelines, enabling faster business operations and enhanced data insights while cutting costs significantly. (AWS, Python, duckdb and sqlmesh, Alteryx, SQL Server, healthcare CMS).",
				"Transitioned legacy workflows to modern data pipelines, accelerating tasks by 100x to 1000x through automation, reducing multi-hour processes to seconds or milliseconds.",
				"Mentored data analysts in Python and SQL, expanding their skills and capabilities, resulting in a substantial increase in productivity.",
			],
		},
		{
			title: "Senior Data Engineer",
			company: "Persefoni",
			start: "2018-12-01",
			end: "2021-08-01",
			description: [
				"Created API endpoints in GoLang, learning new tech & collaborating across teams to interface multiple services.",
				"Implemented ETL processes pipelines in Databricks.",
				"Documented & created new processes to onboard, train, and increase teammate productivity.",
			],
		},
		{
			title: "Software Engineer",
			company: "Zelis Healthcare",
			start: "2015-01-01",
			end: "2018-12-01",
			description: [
				"Created ETL workflows in Airflow, improving speeds up to 1000x.",
				"Migrated multiple codebases to Python3.",
				"Created Python APIs and internal web interfaces, empowering business users across teams to meaningfully interact with company data.",
			],
		},
	];
	let skills = [
		"Python",
		"PostgreSQL",
		"DuckDB",
		"SQL",
		"Git",
		"JavaScript",
		"TypeScript",
		"Svelte",
		"AWS",
		"Linux",
		"Cloud",
		"Databricks",
		"Airflow",
	];
	// todo: invisible skills for SEO

	let education = {
		degree: "BA in Russian Language & Literature",
		university: "BYU",
		year: "2014",
	};
</script>

<div class="max-w-3xl mx-auto p-8 bg-background text-foreground">
	<header class="flex items-center justify-between mb-8">
		<div>
			<h1 class="text-4xl font-bold">{name}</h1>
			<p class="text-xl text-muted-foreground">{title}</p>
			<!-- <p class="text-muted-foreground">{summary}</p> -->
		</div>
		<Avatar class="w-24 h-24">
			<AvatarImage src="/morgan.jpg" alt={name} />
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
	<section class="mb-8">
		<div class="flex flex-wrap gap-4">
			<div class="flex items-center gap-2">
				<a
					href="https://morganwill.com/cal"
					target="_blank"
					rel="noopener noreferrer"
				>
					<Button variant="outline">
						<div class="flex items-center gap-2">
							<Phone size={18} />
							<Calendar size={18} />
						</div>
					</Button>
				</a>
			</div>
			<div class="flex items-center gap-2">
				<a
					href={`https://${linkedin}`}
					target="_blank"
					rel="noopener noreferrer"
				>
					<Linkedin size={18} />
				</a>
			</div>
			<div class="flex items-center gap-2">
				<a href={github} target="_blank" rel="noopener noreferrer"
					><Github size={18} /></a
				>
			</div>
			<div class="flex items-center gap-2">
				<a href={`mailto:${email}`}><Mail size={18} /></a>
			</div>
			<!-- <div class="flex items-center gap-2">
				<MapPin size={18} />
				<span>4 years remote</span>
			</div> -->
		</div>
	</section>

	<Separator class="my-8" />

	<Experience {experience} />

	<section>
		<h2 class="text-2xl font-semibold mb-4">Education</h2>
		<p class="font-semibold">{education.degree}</p>
		<p>{education.university}, {education.year}</p>
	</section>
</div>
