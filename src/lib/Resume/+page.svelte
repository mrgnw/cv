<script>
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Textarea } from "$lib/components/ui/textarea";
	import { Badge } from "$lib/components/ui/badge";
	import { Separator } from "$lib/components/ui/separator";
	import { Avatar, AvatarImage, AvatarFallback } from "$lib/components/ui/avatar";
	import { Mail, Phone, MapPin, Linkedin, Github } from "lucide-svelte";;

	let name = "John Doe";
	let title = "Software Developer";
	let email = "johndoe@example.com";
	let phone = "+1 234 567 890";
	let location = "New York, NY";
	let linkedin = "linkedin.com/in/johndoe";
	let github = "github.com/johndoe";
	let summary = "Experienced software developer with a passion for creating efficient and scalable applications.";
	let experience = [
		{
			title: "Senior Developer",
			company: "Tech Corp",
			period: "2018 - Present",
			description: "Led development of multiple high-impact projects.",
		},
		{
			title: "Junior Developer",
			company: "StartUp Inc",
			period: "2015 - 2018",
			description: "Contributed to the development of innovative web applications.",
		},
	];
	let skills = ["JavaScript", "React", "Node.js", "Python", "SQL", "Git"];
	let education = {
		degree: "Bachelor of Science in Computer Science",
		university: "Tech University",
		year: "2015",
	};
</script>

<div class="max-w-3xl mx-auto p-8 bg-background text-foreground">
	<header class="flex items-center justify-between mb-8">
		<div>
			<h1 class="text-4xl font-bold">{name}</h1>
			<p class="text-xl text-muted-foreground">{title}</p>
		</div>
		<Avatar class="w-24 h-24">
			<AvatarImage src="/morgan.jpg" alt={name} />
			<AvatarFallback>{name[0]}</AvatarFallback>
		</Avatar>
	</header>

	<section class="mb-8">
		<div class="flex flex-wrap gap-4">
			<div class="flex items-center gap-2">
				<Mail size={18} />
				<span>{email}</span>
			</div>
			<div class="flex items-center gap-2">
				<Phone size={18} />
				<span>{phone}</span>
			</div>
			<div class="flex items-center gap-2">
				<MapPin size={18} />
				<span>{location}</span>
			</div>
			<div class="flex items-center gap-2">
				<Linkedin size={18} />
				<a href={`https://${linkedin}`} target="_blank" rel="noopener noreferrer">{linkedin}</a>
			</div>
			<div class="flex items-center gap-2">
				<Github size={18} />
				<a href={`https://${github}`} target="_blank" rel="noopener noreferrer">{github}</a>
			</div>
		</div>
	</section>

	<Separator class="my-8" />

	<section class="mb-8">
		<h2 class="text-2xl font-semibold mb-4">Summary</h2>
		<p>{summary}</p>
	</section>

	<section class="mb-8">
		<h2 class="text-2xl font-semibold mb-4">Experience</h2>
		{#each experience as job}
			<div class="mb-4">
				<h3 class="text-xl font-semibold">{job.title}</h3>
				<p class="text-muted-foreground">{job.company} | {job.period}</p>
				<p>{job.description}</p>
			</div>
		{/each}
	</section>

	<section class="mb-8">
		<h2 class="text-2xl font-semibold mb-4">Skills</h2>
		<div class="flex flex-wrap gap-2">
			{#each skills as skill}
				<Badge>{skill}</Badge>
			{/each}
		</div>
	</section>

	<section>
		<h2 class="text-2xl font-semibold mb-4">Education</h2>
		<p class="font-semibold">{education.degree}</p>
		<p>{education.university}, {education.year}</p>
	</section>
</div>
