import { describe, it, expect, beforeAll, vi } from "vitest";

// Mock data that simulates the structure of actual CV data
const mockMainData = {
    name: "Morgan Williams",
    title: "Rapid full-stack development at scale",
    email: "morganfwilliams@me.com",
    github: "https://github.com/mrgnw",
    experience: [
        {
            title: "Data Engineering Consultant",
            company: "CGI",
            start: "2025-03-17",
            skills: [
                "Python",
                "AWS",
                "ETL",
                "SQL",
                "CI/CD",
                "Databricks",
                "Airflow",
            ],
            achievements: [
                "Architected and deployed custom AWS Lambda connectors with Kinesis Data Streams integration, enabling real-time event-driven data streaming for critical business workflows processing 10M+ events daily and reducing data latency from hours to sub-second response times.",
                "Designed and implemented CI/CD pipelines using GitLab Pipelines, AWS CodePipeline, and CodeBuild with automated testing frameworks (pytest, unittest), reducing deployment time by 80%, eliminating manual errors, and enabling continuous delivery across 15+ microservices.",
            ],
        },
        {
            title: "Fullstack software architect",
            company: "National Care Dental",
            start: "2022-05-01",
            end: "2025-03-17",
            skills: ["Python", "AWS", "ETL", "SQL", "APIs", "Mentoring"],
            achievements: [
                "Designed and implemented data infrastructure and pipelines, enabling faster business operations and enhanced data insights while cutting costs significantly.",
                "Transitioned legacy workflows to modern data pipelines, accelerating tasks by 100x to 1000x through automation, reducing multi-hour processes to seconds or milliseconds.",
                "Mentored data analysts in Python and SQL, expanding their skills and capabilities, resulting in a substantial increase in productivity.",
            ],
        },
        {
            title: "Senior Data Engineer",
            company: "Persefoni",
            start: "2021-08-01",
            end: "2022-05-31",
            skills: ["Python", "Databricks", "ETL", "SQL", "GoLang"],
            achievements: [
                "Implemented ETL processes pipelines in Databricks for a rapidly growing climate-change startup",
                "Created API endpoints in GoLang, learning new tech & collaborating across teams to interface multiple services.",
            ],
        },
    ],
    projects: ["Resume", "Multilingual translator", "TextMe"],
    pdfLink: "/morgan-williams.pdf",
};

const mockBitpandaData = {
    name: "Morgan Williams",
    title: "Data Engineering Specialist - Cryptocurrency & FinTech",
    experience: [
        {
            title: "Senior Data Engineer",
            company: "CGI",
            start: "2025-03-17",
            skills: [
                "Python",
                "AWS",
                "Databricks",
                "Spark",
                "Kafka",
                "Cryptocurrency",
            ],
            achievements: [
                "Built scalable data pipelines processing cryptocurrency market data in real-time",
                "Optimized query performance for high-frequency trading analytics",
            ],
        },
        {
            title: "Fullstack software architect",
            company: "National Care Dental",
            start: "2022-05-01",
            end: "2025-03-17",
            achievements: [
                "Specialized in financial data processing and compliance reporting",
                "Developed cryptocurrency trading analytics platform",
            ],
        },
    ],
    projects: ["Crypto Analytics", "Trading Dashboard"],
    pdfLink: "/morgan-williams.bitpanda.pdf",
};

const mockProjects = [
    {
        name: "Resume",
        technologies: ["Svelte", "TypeScript", "Tailwind"],
        description: "Dynamic resume with PDF generation",
    },
    {
        name: "Multilingual translator",
        technologies: ["Python", "FastAPI"],
        description: "AI-powered translation service",
    },
    {
        name: "TextMe",
        technologies: ["React", "Node.js"],
        description: "Real-time messaging application",
    },
    {
        name: "Crypto Analytics",
        technologies: ["Python", "Kafka", "Redis"],
        description: "Real-time cryptocurrency market analysis",
    },
    {
        name: "Trading Dashboard",
        technologies: ["React", "WebSocket", "D3.js"],
        description: "Real-time trading analytics dashboard",
    },
];

// Mock version reader functions
const mockVersionMap = {
    main: mockMainData,
    bitpanda: mockBitpandaData,
};

function mockGetVersion(slug) {
    return mockVersionMap[slug] || null;
}

function mockCoalesceVersion(slug) {
    const main = mockVersionMap["main"];
    const version = mockGetVersion(slug);

    if (!main || !version) {
        return null;
    }

    if (slug === "main") {
        return {
            ...main,
            resolvedProjects: resolveProjects(main.projects || []),
        };
    }

    // Merge main and version data
    const merged = {
        ...main,
        ...version,
        experience: mergeExperiences(main.experience, version.experience),
        resolvedProjects: resolveProjects(
            version.projects || main.projects || [],
        ),
    };

    return merged;
}

function mockGetAllVersions() {
    return Object.keys(mockVersionMap);
}

function resolveProjects(projectNames) {
    return projectNames.map((name) => {
        if (typeof name === "string") {
            const project = mockProjects.find((p) => p.name === name);
            return (
                project || {
                    name,
                    description: "Project not found",
                    technologies: [],
                }
            );
        }
        return name;
    });
}

function mergeExperiences(mainExperiences, versionExperiences) {
    const maxLength = Math.max(
        mainExperiences.length,
        versionExperiences.length,
    );
    const mergedExperiences = [];

    for (let i = 0; i < maxLength; i++) {
        const mainExp = mainExperiences[i];
        const versionExp = versionExperiences[i];

        if (mainExp && versionExp) {
            mergedExperiences.push({
                ...mainExp,
                ...versionExp,
                achievements: mergeAchievements(
                    mainExp.achievements,
                    versionExp.achievements,
                ),
            });
        } else if (versionExp) {
            mergedExperiences.push({
                ...versionExp,
                achievements: versionExp.achievements || [],
            });
        } else if (mainExp) {
            mergedExperiences.push({
                ...mainExp,
                achievements: mainExp.achievements || [],
            });
        }
    }

    return mergedExperiences;
}

function mergeAchievements(mainAchievements = [], versionAchievements = []) {
    const maxLength = Math.max(
        mainAchievements.length,
        versionAchievements.length,
    );
    const mergedAchievements = [];

    for (let i = 0; i < maxLength; i++) {
        const versionLine =
            typeof versionAchievements[i] === "string"
                ? versionAchievements[i].trim()
                : "";
        mergedAchievements[i] = versionLine || mainAchievements[i] || "";
    }

    return mergedAchievements;
}

describe("Experience Rendering Tests for CV Routes", () => {
    let allVersions;

    beforeAll(() => {
        allVersions = mockGetAllVersions();
    });

    describe("Main CV Route Experience Data", () => {
        it("should load main CV data successfully", () => {
            const mainCV = mockGetVersion("main");
            expect(mainCV).toBeTruthy();
            expect(mainCV.experience).toBeDefined();
            expect(Array.isArray(mainCV.experience)).toBe(true);
            expect(mainCV.experience.length).toBeGreaterThan(0);
        });

        it("should have correct experience data structure", () => {
            const mainCV = mockGetVersion("main");
            const firstExperience = mainCV.experience[0];

            expect(firstExperience).toHaveProperty("title");
            expect(firstExperience).toHaveProperty("company");
            expect(firstExperience).toHaveProperty("start");
            expect(firstExperience).toHaveProperty("skills");
            expect(firstExperience).toHaveProperty("achievements");

            expect(Array.isArray(firstExperience.skills)).toBe(true);
            expect(Array.isArray(firstExperience.achievements)).toBe(true);
        });

        it("should have CGI as the current role (no end date)", () => {
            const mainCV = mockGetVersion("main");
            const cgiExperience = mainCV.experience.find(
                (exp) => exp.company === "CGI",
            );

            expect(cgiExperience).toBeTruthy();
            expect(cgiExperience.end).toBeUndefined();
            expect(cgiExperience.start).toBe("2025-03-17");
            expect(cgiExperience.title).toBe("Data Engineering Consultant");
        });

        it("should have National Care Dental with correct end date", () => {
            const mainCV = mockGetVersion("main");
            const ncdExperience = mainCV.experience.find(
                (exp) => exp.company === "National Care Dental",
            );

            expect(ncdExperience).toBeTruthy();
            expect(ncdExperience.end).toBe("2025-03-17");
            expect(ncdExperience.start).toBe("2022-05-01");
            expect(ncdExperience.title).toBe("Fullstack software architect");
        });

        it("should maintain chronological order (most recent first)", () => {
            const mainCV = mockGetVersion("main");
            const companies = mainCV.experience.map((exp) => exp.company);

            expect(companies).toEqual([
                "CGI",
                "National Care Dental",
                "Persefoni",
            ]);
        });

        it("should have PDF link configured correctly", () => {
            const mainCV = mockGetVersion("main");
            expect(mainCV.pdfLink).toBe("/morgan-williams.pdf");
        });
    });

    describe("Version-Specific Route Experience Data", () => {
        it("should load bitpanda version successfully", () => {
            const bitpandaCV = mockGetVersion("bitpanda");
            expect(bitpandaCV).toBeTruthy();
            expect(bitpandaCV.experience).toBeDefined();
        });

        it("should have version-specific PDF link", () => {
            const bitpandaCV = mockGetVersion("bitpanda");
            expect(bitpandaCV.pdfLink).toBe("/morgan-williams.bitpanda.pdf");
        });

        it("should merge main and version data using coalesceVersion", () => {
            const coalescedCV = mockCoalesceVersion("bitpanda");

            expect(coalescedCV).toBeTruthy();
            expect(coalescedCV.experience).toBeDefined();

            // Should have merged experience data
            const cgiRole = coalescedCV.experience.find(
                (exp) => exp.company === "CGI",
            );
            expect(cgiRole).toBeTruthy();
            expect(cgiRole.title).toBe("Senior Data Engineer"); // Version-specific title
            expect(cgiRole.skills).toContain("Kafka"); // Version-specific skill
        });

        it("should merge achievements from both main and version data", () => {
            const coalescedCV = mockCoalesceVersion("bitpanda");
            const ncdRole = coalescedCV.experience.find(
                (exp) => exp.company === "National Care Dental",
            );

            expect(ncdRole).toBeTruthy();
            expect(ncdRole.achievements).toBeDefined();
            expect(ncdRole.achievements.length).toBeGreaterThan(0);

            // Should contain version-specific achievements
            const hasVersionAchievement = ncdRole.achievements.some(
                (achievement) =>
                    achievement.includes("cryptocurrency") ||
                    achievement.includes("financial data"),
            );
            expect(hasVersionAchievement).toBe(true);
        });

        it("should resolve projects correctly for version", () => {
            const coalescedCV = mockCoalesceVersion("bitpanda");

            expect(coalescedCV.resolvedProjects).toBeDefined();
            expect(Array.isArray(coalescedCV.resolvedProjects)).toBe(true);

            // Should have version-specific projects
            const hasCryptoProject = coalescedCV.resolvedProjects.some(
                (project) => project.name === "Crypto Analytics",
            );
            expect(hasCryptoProject).toBe(true);
        });
    });

    describe("Route Integration Tests", () => {
        it("should simulate main page rendering with correct data flow", () => {
            // Simulate what happens in +page.svelte for main route
            const resolvedData = mockCoalesceVersion("main");

            expect(resolvedData).toBeTruthy();
            expect(resolvedData.name).toBe("Morgan Williams");
            expect(resolvedData.experience).toBeDefined();
            expect(resolvedData.resolvedProjects).toBeDefined();

            // Verify the data structure matches what CV component expects
            expect(resolvedData).toHaveProperty("name");
            expect(resolvedData).toHaveProperty("title");
            expect(resolvedData).toHaveProperty("experience");
            expect(resolvedData).toHaveProperty("projects");
            expect(resolvedData).toHaveProperty("resolvedProjects");
        });

        it("should simulate slug page rendering for specific versions", () => {
            // Simulate what happens in [slug]/+page.server.ts
            const slug = "bitpanda";
            const data = mockCoalesceVersion(slug);

            expect(data).toBeTruthy();

            // Verify the data includes what the server load function would add
            const routeData = { ...data, slug };

            expect(routeData.slug).toBe(slug);
            expect(routeData.experience).toBeDefined();

            // Verify PDF link is correctly generated
            const expectedPdfLink = `/morgan-williams.${slug}.pdf`;
            expect(data.pdfLink).toBe(expectedPdfLink);
        });

        it("should handle invalid version gracefully", () => {
            const invalidCV = mockCoalesceVersion("non-existent-version");
            expect(invalidCV).toBeNull();
        });

        it("should simulate CV component props for main route", () => {
            const resolvedData = mockCoalesceVersion("main");

            // Test that all required CV component props are available
            expect(resolvedData.name).toBeTruthy();
            expect(resolvedData.title).toBeTruthy();
            expect(resolvedData.email).toBeTruthy();
            expect(resolvedData.github).toBeTruthy();
            expect(resolvedData.experience).toBeTruthy();
            expect(resolvedData.projects).toBeTruthy();
            expect(resolvedData.resolvedProjects).toBeTruthy();
            expect(resolvedData.pdfLink).toBeTruthy();
        });

        it("should simulate CV component props for version route", () => {
            const resolvedData = mockCoalesceVersion("bitpanda");
            const version = "bitpanda";
            const pdfLink = resolvedData.pdfLink;

            // Test that all required CV component props are available for version
            expect(resolvedData.name).toBeTruthy();
            expect(resolvedData.title).toBeTruthy();
            expect(resolvedData.experience).toBeTruthy();
            expect(pdfLink).toBe(`/morgan-williams.${version}.pdf`);
            expect(resolvedData.resolvedProjects).toBeTruthy();
        });
    });

    describe("Data Integrity for Route Rendering", () => {
        it("should validate all experience entries have required fields", () => {
            const mainCV = mockCoalesceVersion("main");

            mainCV.experience.forEach((exp, index) => {
                expect(
                    exp,
                    `Experience ${index} should have title`,
                ).toHaveProperty("title");
                expect(
                    exp,
                    `Experience ${index} should have company`,
                ).toHaveProperty("company");
                expect(
                    exp,
                    `Experience ${index} should have start date`,
                ).toHaveProperty("start");

                expect(
                    typeof exp.title,
                    `Experience ${index} title should be string`,
                ).toBe("string");
                expect(
                    typeof exp.company,
                    `Experience ${index} company should be string`,
                ).toBe("string");
                expect(
                    typeof exp.start,
                    `Experience ${index} start should be string`,
                ).toBe("string");

                expect(
                    exp.title.length,
                    `Experience ${index} title should not be empty`,
                ).toBeGreaterThan(0);
                expect(
                    exp.company.length,
                    `Experience ${index} company should not be empty`,
                ).toBeGreaterThan(0);
            });
        });

        it("should validate achievements are properly structured", () => {
            const mainCV = mockCoalesceVersion("main");

            mainCV.experience.forEach((exp, index) => {
                if (exp.achievements) {
                    expect(
                        Array.isArray(exp.achievements),
                        `Experience ${index} achievements should be array`,
                    ).toBe(true);

                    exp.achievements.forEach((achievement, achieveIndex) => {
                        expect(
                            typeof achievement,
                            `Achievement ${achieveIndex} of experience ${index} should be string`,
                        ).toBe("string");
                        expect(
                            achievement.length,
                            `Achievement ${achieveIndex} of experience ${index} should not be empty`,
                        ).toBeGreaterThan(0);
                    });
                }
            });
        });

        it("should validate date formats for rendering", () => {
            const mainCV = mockCoalesceVersion("main");

            mainCV.experience.forEach((exp, index) => {
                // Check start date format (YYYY-MM-DD)
                expect(
                    exp.start,
                    `Experience ${index} start date format`,
                ).toMatch(/^\d{4}-\d{2}-\d{2}$/);

                // Check end date format if exists
                if (exp.end) {
                    expect(
                        exp.end,
                        `Experience ${index} end date format`,
                    ).toMatch(/^\d{4}-\d{2}-\d{2}$/);
                }

                // Validate dates are parseable
                expect(
                    () => new Date(exp.start),
                    `Experience ${index} start date should be valid`,
                ).not.toThrow();

                if (exp.end) {
                    expect(
                        () => new Date(exp.end),
                        `Experience ${index} end date should be valid`,
                    ).not.toThrow();
                }
            });
        });

        it("should validate skills arrays for rendering", () => {
            const mainCV = mockCoalesceVersion("main");

            mainCV.experience.forEach((exp, index) => {
                if (exp.skills) {
                    expect(
                        Array.isArray(exp.skills),
                        `Experience ${index} skills should be array`,
                    ).toBe(true);

                    exp.skills.forEach((skill, skillIndex) => {
                        expect(
                            typeof skill,
                            `Skill ${skillIndex} of experience ${index} should be string`,
                        ).toBe("string");
                        expect(
                            skill.length,
                            `Skill ${skillIndex} of experience ${index} should not be empty`,
                        ).toBeGreaterThan(0);
                    });
                }
            });
        });

        it("should validate experience chronological ordering", () => {
            const mainCV = mockCoalesceVersion("main");

            // Verify that experiences are ordered by start date (newest first)
            for (let i = 1; i < mainCV.experience.length; i++) {
                const current = new Date(mainCV.experience[i].start);
                const previous = new Date(mainCV.experience[i - 1].start);

                expect(
                    current <= previous,
                    `Experience should be in reverse chronological order: ${mainCV.experience[i].company} (${mainCV.experience[i].start}) should not be after ${mainCV.experience[i - 1].company} (${mainCV.experience[i - 1].start})`,
                ).toBe(true);
            }
        });
    });

    describe("Cross-Version Data Consistency", () => {
        it("should maintain company names consistently across versions", () => {
            const mainCV = mockCoalesceVersion("main");
            const bitpandaCV = mockCoalesceVersion("bitpanda");

            const mainCompanies = new Set(
                mainCV.experience.map((exp) => exp.company),
            );
            const bitpandaCompanies = new Set(
                bitpandaCV.experience.map((exp) => exp.company),
            );

            // Common companies should have consistent names
            const commonCompanies = [...mainCompanies].filter((company) =>
                bitpandaCompanies.has(company),
            );

            expect(commonCompanies.length).toBeGreaterThan(0);
            expect(commonCompanies).toContain("National Care Dental");
        });

        it("should handle experience merging correctly", () => {
            const coalescedCV = mockCoalesceVersion("bitpanda");

            // Verify experience array is not empty after merging
            expect(coalescedCV.experience.length).toBeGreaterThan(0);

            // Verify no null or undefined entries
            coalescedCV.experience.forEach((exp, index) => {
                expect(
                    exp,
                    `Experience ${index} should not be null`,
                ).not.toBeNull();
                expect(
                    exp,
                    `Experience ${index} should not be undefined`,
                ).toBeDefined();
            });
        });

        it("should preserve base data when version data is sparse", () => {
            const mainCV = mockCoalesceVersion("main");
            const bitpandaCV = mockCoalesceVersion("bitpanda");

            // Should preserve essential fields from main even in specialized versions
            expect(bitpandaCV.name).toBe(mainCV.name);
            expect(bitpandaCV.email).toBe(mainCV.email);
            expect(bitpandaCV.github).toBe(mainCV.github);
        });

        it("should override specific fields in version", () => {
            const mainCV = mockCoalesceVersion("main");
            const bitpandaCV = mockCoalesceVersion("bitpanda");

            // Version should override title
            expect(bitpandaCV.title).not.toBe(mainCV.title);
            expect(bitpandaCV.title).toContain("Cryptocurrency");
        });
    });

    describe("Performance and Error Handling", () => {
        it("should handle missing version files gracefully", () => {
            const invalidVersion = mockGetVersion("definitely-does-not-exist");
            expect(invalidVersion).toBeNull();
        });

        it("should load version data efficiently", () => {
            const start = performance.now();
            const mainCV = mockCoalesceVersion("main");
            const end = performance.now();

            expect(mainCV).toBeTruthy();
            expect(end - start).toBeLessThan(50); // Should load very quickly with mock data
        });

        it("should provide consistent data for multiple calls", () => {
            const first = mockCoalesceVersion("main");
            const second = mockCoalesceVersion("main");

            expect(first).toEqual(second);
        });

        it("should handle empty or minimal experience data", () => {
            // Test with a minimal version
            const minimalVersion = {
                name: "Morgan Williams",
                experience: [],
                projects: [],
                pdfLink: "/morgan-williams.minimal.pdf",
            };

            // Mock a minimal version
            mockVersionMap.minimal = minimalVersion;

            const coalescedMinimal = mockCoalesceVersion("minimal");
            expect(coalescedMinimal).toBeTruthy();
            expect(coalescedMinimal.experience).toBeDefined();
            expect(Array.isArray(coalescedMinimal.experience)).toBe(true);

            // Clean up
            delete mockVersionMap.minimal;
        });
    });

    describe("Route-Specific PDF Generation Data", () => {
        it("should generate correct PDF links for all versions", () => {
            const versions = mockGetAllVersions();

            versions.forEach((slug) => {
                const versionData = mockGetVersion(slug);
                expect(versionData.pdfLink).toBeTruthy();

                if (slug === "main") {
                    expect(versionData.pdfLink).toBe("/morgan-williams.pdf");
                } else {
                    expect(versionData.pdfLink).toBe(
                        `/morgan-williams.${slug}.pdf`,
                    );
                }
            });
        });

        it("should provide complete data for PDF generation", () => {
            const mainCV = mockCoalesceVersion("main");

            // Verify all required fields for PDF generation are present
            expect(mainCV.name).toBeTruthy();
            expect(mainCV.experience).toBeTruthy();
            expect(mainCV.resolvedProjects).toBeTruthy();

            // Verify experience has all required fields for PDF rendering
            mainCV.experience.forEach((exp, index) => {
                expect(
                    exp.title,
                    `Experience ${index} needs title for PDF`,
                ).toBeTruthy();
                expect(
                    exp.company,
                    `Experience ${index} needs company for PDF`,
                ).toBeTruthy();
                expect(
                    exp.start,
                    `Experience ${index} needs start date for PDF`,
                ).toBeTruthy();
            });
        });

        it("should support PDF link generation for custom versions", () => {
            // Test PDF link generation pattern
            const testVersions = [
                "test-company",
                "another-version",
                "special-role",
            ];

            testVersions.forEach((version) => {
                const expectedPdfLink = `/morgan-williams.${version}.pdf`;
                expect(expectedPdfLink).toMatch(
                    /^\/morgan-williams\.[a-z-]+\.pdf$/,
                );
            });
        });
    });

    describe("Component Props Validation", () => {
        it("should provide valid props for CV.svelte component", () => {
            const resolvedData = mockCoalesceVersion("main");

            // Test all props that CV.svelte expects
            const requiredProps = [
                "name",
                "title",
                "email",
                "github",
                "experience",
                "projects",
                "resolvedProjects",
                "pdfLink",
            ];

            requiredProps.forEach((prop) => {
                expect(resolvedData).toHaveProperty(prop);
                expect(resolvedData[prop]).toBeDefined();
            });
        });

        it("should provide valid experience data for Experience.svelte component", () => {
            const resolvedData = mockCoalesceVersion("main");

            expect(Array.isArray(resolvedData.experience)).toBe(true);
            expect(resolvedData.experience.length).toBeGreaterThan(0);

            resolvedData.experience.forEach((exp, index) => {
                // Properties that Experience.svelte expects
                expect(exp, `Experience ${index}`).toHaveProperty("title");
                expect(exp, `Experience ${index}`).toHaveProperty("company");
                expect(exp, `Experience ${index}`).toHaveProperty("start");

                if (exp.achievements) {
                    expect(
                        Array.isArray(exp.achievements),
                        `Experience ${index} achievements should be array`,
                    ).toBe(true);
                }

                if (exp.skills) {
                    expect(
                        Array.isArray(exp.skills),
                        `Experience ${index} skills should be array`,
                    ).toBe(true);
                }
            });
        });

        it("should provide valid project data for Projects.svelte component", () => {
            const resolvedData = mockCoalesceVersion("main");

            expect(Array.isArray(resolvedData.resolvedProjects)).toBe(true);

            resolvedData.resolvedProjects.forEach((project, index) => {
                expect(project, `Project ${index}`).toHaveProperty("name");
                expect(
                    typeof project.name,
                    `Project ${index} name should be string`,
                ).toBe("string");
                expect(
                    project.name.length,
                    `Project ${index} name should not be empty`,
                ).toBeGreaterThan(0);
            });
        });
    });
});
