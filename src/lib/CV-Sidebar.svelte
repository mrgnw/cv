<script>
	import { Avatar, AvatarImage, AvatarFallback } from "$lib/components/ui/avatar";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "$lib/components/ui/card";
	import { Calendar, Linkedin, Github, Mail } from "lucide-svelte";;

	let skills = $state(["Python", "PostgreSQL", "SQL", "JavaScript", "Svelte", "AWS", "Linux", "ETL"]);

	let education = $state([
		{ course: "Coding Bootcamp", institution: "VSchool.io", year: 2014 },
		{ course: "BA in Russian Language & Literature", institution: "BYU", year: 2014 },
	]);

	let experiences = $state([
		{
			title: "Senior Software Engineer",
			company: "Tech Solutions Inc.",
			duration: "2 years and 5 months",
			description: ["Led the development of a high-performance data processing pipeline using Python and AWS, resulting in a 40% increase in data processing speed.", "Implemented and optimized complex SQL queries for large-scale data analysis, improving query performance by 30%.", "Mentored junior developers and conducted code reviews, fostering best practices and improving overall team productivity."],
		},
	]);

	let projects = $state([
		{
			title: "ETL Pipeline Automation",
			description: "Developed an automated ETL pipeline using Python and Airflow, processing over 1 million records daily with 99.9% accuracy.",
		},
	]);
</script>

<div class="flex flex-col md:flex-row min-h-screen bg-background text-foreground">
	<aside class="w-full md:w-1/4 p-6 bg-muted">
		<div class="flex flex-col items-center mb-6">
			<Avatar class="w-32 h-32 mb-4">
				<AvatarImage src="/images/user.png" alt="Profile Picture" />
				<AvatarFallback>JD</AvatarFallback>
			</Avatar>
			<h1 class="text-2xl font-bold">John Doe</h1>
			<p class="text-muted-foreground">Software Engineer</p>
		</div>

		<div class="mb-6">
			<h2 class="text-lg font-semibold mb-2">Skills</h2>
			<div class="flex flex-wrap gap-2">
				{#each skills as skill}
					<Badge>{skill}</Badge>
				{/each}
			</div>
		</div>

		<div class="mb-6">
			<h2 class="text-lg font-semibold mb-2">Education</h2>
			{#each education as { course, institution, year }}
				<div class="mb-2">
					<p class="font-medium">{course}</p>
					<p class="text-sm text-muted-foreground">{institution}, {year}</p>
				</div>
			{/each}
		</div>

		<div class="flex justify-center space-x-4">
			<Button variant="ghost" size="icon">
				<Calendar class="h-5 w-5" />
			</Button>
			<Button variant="ghost" size="icon">
				<Linkedin class="h-5 w-5" />
			</Button>
			<Button variant="ghost" size="icon">
				<Github class="h-5 w-5" />
			</Button>
			<Button variant="ghost" size="icon">
				<Mail class="h-5 w-5" />
			</Button>
		</div>
	</aside>

	<main class="w-full md:w-3/4 p-6">
		<section class="mb-8">
			<h2 class="text-2xl font-bold mb-4">Experience</h2>
			{#each experiences as { title, company, duration, description }}
				<Card class="mb-4">
					<CardHeader>
						<CardTitle>{title}</CardTitle>
						<CardDescription>{company} | {duration}</CardDescription>
					</CardHeader>
					<CardContent>
						<ul class="list-disc pl-5">
							{#each description as paragraph}
								<li class="mb-2">{paragraph}</li>
							{/each}
						</ul>
					</CardContent>
				</Card>
			{/each}
		</section>

		<section>
			<h2 class="text-2xl font-bold mb-4">Projects</h2>
			{#each projects as { title, description }}
				<Card class="mb-4">
					<CardHeader>
						<CardTitle>{title}</CardTitle>
					</CardHeader>
					<CardContent>
						<p>{description}</p>
					</CardContent>
				</Card>
			{/each}
		</section>
	</main>
</div>
