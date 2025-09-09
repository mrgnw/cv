<script lang="ts">
    import { Separator } from "$lib/components/ui/separator";
    import { ChevronDown, FileText, Calendar } from "lucide-svelte";
    import { browser } from "$app/environment";

    const iconSize = 30;
    const isPrinting =
        browser && new URLSearchParams(window.location.search).has("print");

    let email = "morganfwilliams@me.com";
    let phone = '+34 623 944 553'
    const languages = [
        { lang: "English", level: "Native", flag: "🇺🇸" },
        { lang: "Russian", level: "Fluent", flag: "🇷🇺" },
        { lang: "Spanish", level: "B2", flag: "🇪🇸" },
    ];

    const education = [
        {
            degree: "BA in Russian Language & Literature",
            provider: "Brigham Young University",
            year: "2014",
            achievements: [
                "Studied and taught in Russia and Belarus for 2 years",
                "Minor in Communications and Advertising",
                "Completed courses in English language and literature"
            ],
        },
    ];

    const experience = [
        {
            title: "Volunteer ESL Teacher",
            company: "Brigham Young University",
            period: "2007 - 2009",
            accomplishments: [
                "Taught English to students from beginner to advanced levels",
                "Achieved Russian language fluency through immersion",
                "Developed custom curriculum materials for different learning styles",
            ],
        },
        {
            title: "Software Engineering Consultant & Trainer",
            company:
                "Zelis Healthcare • National Care Dental",
            period: "2017 - 2025",
            accomplishments: [
                "Regularly trained groups of 5-15 employees, teaching skills to improve their capabilities",
                "Documentated complex technical processes",
                "Automated tasks that would normally require dedicated employees, saving time and improving efficiency",
            ],

        },
        {
            title: "Product catalog and customer satisfaction analyst",
            company: 'Walmart eCommerce / Jet.com',
            period: '2015 - 2017',
            accomplishments: [
                'Spoke with countless customers over the phone, email, and social media to understand and resolve their issues',
                'Helped manage the quality of Jet/Walmart eCommerce catalog of 50+ million products, training employees in processes that I created to identify and prevent potential issues customer satisfcation or legal issues',
            ],
        },
        
    ];
</script>

<svelte:head>
    <title>Morgan Williams - Native US English</title>
</svelte:head>

<div class="max-w-[800px] mx-auto p-8 bg-background text-foreground print:p-4 resume-container">
    <header class="mb-12">
        <h1 class="text-4xl font-serif mb-3 tracking-wide">Morgan Williams</h1>
        <div class="w-32 h-0.5 bg-primary mx-auto mb-4"></div>
        <p class="text-xl text-muted-foreground mb-6 font-light tracking-wide">English Language Instructor & Communication Specialist</p>
        <div class="text-sm text-muted-foreground flex justify-center gap-8">
            <a
                href={`mailto:${email}`}
                class="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                {email}
            </a>
            <a
                href={`tel:${phone}`}
                class="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                {phone}
            </a>
        </div>
    </header>

    <!-- Professional Summary -->
    <section class="mb-12 max-w-2xl mx-auto">
        <p class="text-muted-foreground leading-relaxed text-center italic">
            Experienced English language instructor with expertise in curriculum development and cross-cultural communication. 
            Proven track record in designing engaging learning materials and delivering effective instruction to diverse student groups. 
            Skilled in both classroom and corporate training environments.
        </p>
    </section>

    <!-- Languages Section -->
    <section class="mb-12 bg-muted/30 py-8 px-4 rounded-lg">
        <h2 class="text-2xl font-serif text-center mb-6 tracking-wide">Language Proficiency</h2>
        <div class="flex justify-center gap-12">
            {#each languages as { lang, level, flag }}
                <div class="text-center">
                    <span class="text-4xl block mb-3">{flag}</span>
                    <span class="font-medium block mb-1">{lang}</span>
                    <span class="text-sm text-muted-foreground">{level}</span>
                </div>
            {/each}
        </div>
    </section>

    <!-- Education Section -->
    <section class="mb-12">
        <h2 class="text-2xl font-serif text-center mb-8 tracking-wide relative">
            <span class="bg-background px-4 relative z-10">Education</span>
            <div class="absolute w-full h-px bg-border top-1/2 left-0 -z-0"></div>
        </h2>
        {#each education as edu}
            <div class="mb-8 max-w-2xl mx-auto">
                <div class="text-center mb-4">
                    <h3 class="text-xl font-medium mb-2">{edu.provider}</h3>
                    <p class="text-muted-foreground font-light">{edu.degree} • {edu.year}</p>
                </div>
                {#if edu.achievements}
                    <ul class="grid grid-cols-1 gap-3">
                        {#each edu.achievements as achievement}
                            <li class="text-muted-foreground flex items-start gap-3">
                                <span class="text-primary">•</span>
                                <span class="leading-relaxed">{achievement}</span>
                            </li>
                        {/each}
                    </ul>
                {/if}
            </div>
        {/each}
    </section>

    <!-- Experience Section -->
    <section class="mb-12">
        <h2 class="text-2xl font-serif text-center mb-8 tracking-wide relative">
            <span class="bg-background px-4 relative z-10">Professional Experience</span>
            <div class="absolute w-full h-px bg-border top-1/2 left-0 -z-0"></div>
        </h2>
        {#each experience as exp}
            <div class="mb-10 max-w-2xl mx-auto">
                <div class="text-center mb-4">
                    <h3 class="text-xl font-medium mb-2">{exp.title}</h3>
                    <p class="text-muted-foreground font-light">{exp.company} • {exp.period}</p>
                </div>
                <ul class="grid grid-cols-1 gap-3">
                    {#each exp.accomplishments as item}
                        <li class="flex items-start gap-3">
                            <span class="text-primary mt-1.5">•</span>
                            <span class="leading-relaxed">{item}</span>
                        </li>
                    {/each}
                </ul>
            </div>
        {/each}
    </section>

    <!-- Certifications Section -->
    <section class="mb-12">
        <h2 class="text-2xl font-serif text-center mb-8 tracking-wide relative">
            <span class="bg-background px-4 relative z-10">Certifications</span>
            <div class="absolute w-full h-px bg-border top-1/2 left-0 -z-0"></div>
        </h2>
        
    </section>
</div>

<!-- PDF Download -->
<a
    href="/morgan-williams.english.pdf"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Download English CV"
    class="no-print fixed bottom-4 right-4 bg-background p-2 rounded-full shadow-lg"
    data-sveltekit-preload-data="hover"
>
    <FileText size={iconSize} />
</a>

<style>
    @media print {
        @page {
            size: A4;
            margin: 20mm 25mm;
        }
        :global(body) {
            font-size: 11pt;
            line-height: 1.6;
        }
        :global(.resume-container) {
            max-width: none;
            margin: 0;
            padding: 0;
        }
        .no-print {
            display: none !important;
        }
        .bg-muted\/30 {
            background-color: #f8f9fa !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
    }
</style>
