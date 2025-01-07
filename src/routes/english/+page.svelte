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
        { lang: "English", level: "Native (USA)", flag: "🇺🇸" },
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
            description: [
                "Taught English to students from beginner to advanced levels",
                "Achieved Russian language fluency through immersion",
                "Developed custom curriculum materials for different learning styles",
            ],
        },
        {
            title: "Software Engineering Consultant & Trainer",
            company:
                "Zelis Healthcare • National Care Dental",
            period: "2018- 2025",
            description: [
                "Regularly trained groups of 5-15 employees, teaching skills to improve their capabilities",
                "Documentated complex technical processes",
                "Automated tasks that would normally require dedicated employees, saving time and improving efficiency",
                "Learned and taught new programming languages to achieve company objectives"
            ],

        },
        {
            title: "Product catalog and customer satisfaction analyst",
            company: 'Walmart eCommerce / Jet.com',
            period: '2015 - 2017',
            description: [
                'Worked with countless customers over the phone, email, and social media to understand & resolve issues',
                'Helped manage the quality of Jet/Walmart eCommerce catalog of 50+ million products, training employees in processes that I created to identify and prevent potential issues customer satisfcation or legal issues',
            ],
        },
        
    ];
</script>

<svelte:head>
    <title>Morgan Williams - Native US English</title>
</svelte:head>

<div class="max-w-[800px] mx-auto p-8 bg-white text-black print:p-4 resume-container">
    <header class="mb-8">
        <h1 class="text-3xl font-serif mb-2">Morgan Williams</h1>
        <div class="text-sm mb-4 font-serif flex flex-col">
            <a href={`mailto:${email}`} class="text-black hover:underline">{email}</a>
            <a href={`tel:${phone}`} class="text-black hover:underline">{phone}</a>
        </div>
        <!-- Professional Summary -->
        <section class="mb-6">
            <p class="text-sm font-serif leading-relaxed">
                Native US English speaker with diverse experience in professional training, language training, and travel.
            </p>
        </section>
    </header>


    <!-- Languages Section -->
    <section class="mb-2">
        <h2 class="text-base font-serif font-bold mb-1">Language Proficiency</h2>
        <div class="flex flex-col text-sm font-serif">
            {#each languages as { lang, level, flag }}
                <div>
                    <span class="font-bold">{lang}</span> {level}
                </div>
            {/each}
        </div>
    </section>

    <!-- Education Section -->
    <section class="mb-6">
        <h2 class="text-lg font-serif font-bold mb-2 border-b border-black">Education</h2>
        {#each education as edu}
            <div class="mb-4">
                <div class="flex justify-between text-sm font-serif">
                    <div>
                        <span class="font-bold">{edu.provider}</span>
                        <span class="mx-1">-</span>
                        <span>{edu.degree}</span>
                    </div>
                    <span>{edu.year}</span>
                </div>
                {#if edu.achievements}
                    <ul class="list-disc ml-4 text-sm font-serif">
                        {#each edu.achievements as achievement}
                            <li>{achievement}</li>
                        {/each}
                    </ul>
                {/if}
            </div>
        {/each}
    </section>

    <!-- Experience Section -->
    <section class="mb-6">
        <h2 class="text-lg font-serif font-bold mb-2 border-b border-black">Professional Experience</h2>
        {#each experience as exp}
            <div class="mb-4">
                <div class="flex justify-between text-sm font-serif">
                    <div>
                        <span class="font-bold">{exp.title}</span>
                        <span class="mx-1">-</span>
                        <span>{exp.company}</span>
                    </div>
                    <span>{exp.period}</span>
                </div>
                <ul class="list-disc ml-4 text-sm font-serif">
                    {#each exp.description as item}
                        <li>{item}</li>
                    {/each}
                </ul>
            </div>
        {/each}
    </section>
</div>

<style>
    :global(body) {
        font-family: "Times New Roman", Times, serif;
        line-height: 1.4;
        color: black;
        background: white;
    }

    @media print {
        @page {
            margin: 0.5in;
        }
        :global(body) {
            font-size: 12pt;
        }
        .resume-container {
            max-width: none;
            margin: 0;
            padding: 0;
        }
        a {
            text-decoration: none;
            color: black;
        }
    }
</style>
