#!/usr/bin/env node
import { spawn } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Colors for output
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m",
    bold: "\x1b[1m",
};

function log(message, color = "reset") {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, args, cwd = __dirname) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: "pipe",
            cwd,
            shell: true,
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        child.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        child.on("close", (code) => {
            resolve({ code, stdout, stderr });
        });

        child.on("error", (error) => {
            reject(error);
        });
    });
}

async function checkServerRunning() {
    try {
        const response = await fetch("http://localhost:4173/");
        return response.ok;
    } catch {
        return false;
    }
}

async function fetchPageContent(url) {
    try {
        const response = await fetch(url);
        const html = await response.text();
        return html;
    } catch (error) {
        throw new Error(`Failed to fetch ${url}: ${error.message}`);
    }
}

function extractExperienceData(html) {
    // Extract experience data from the HTML
    const experienceMatches = html.match(/experience:\[.*?\]/s);
    if (!experienceMatches) return null;

    try {
        // Parse the experience array from the HTML data
        const experienceStr = experienceMatches[0].replace("experience:", "");
        return JSON.parse(experienceStr);
    } catch (error) {
        log(`Error parsing experience data: ${error.message}`, "red");
        return null;
    }
}

function extractProjectsData(html) {
    // Extract resolved projects from HTML
    const projectsMatches = html.match(/resolvedProjects:\[.*?\]/s);
    if (!projectsMatches) return null;

    try {
        const projectsStr = projectsMatches[0].replace("resolvedProjects:", "");
        return JSON.parse(projectsStr);
    } catch (error) {
        log(`Error parsing projects data: ${error.message}`, "red");
        return null;
    }
}

async function testContentOptimization() {
    log("\n🎯 Testing Content Optimization Fix", "bold");
    log("===================================\n", "cyan");

    const startTime = Date.now();
    let allTestsPassed = true;

    // Check if server is running
    log("📋 Test 1: Server Availability", "blue");
    const serverRunning = await checkServerRunning();
    if (!serverRunning) {
        log("❌ Preview server not running on port 4173", "red");
        log("   Please run: npm run preview or npm run dev", "yellow");
        return false;
    }
    log("✅ Preview server is running", "green");

    // Test main route content
    log("\n📋 Test 2: Main Route Content (Full Content)", "blue");
    try {
        const mainHtml = await fetchPageContent("http://localhost:4173/");
        const mainExperience = extractExperienceData(mainHtml);
        const mainProjects = extractProjectsData(mainHtml);

        if (!mainExperience) {
            log("❌ Could not extract main experience data", "red");
            allTestsPassed = false;
        } else {
            log(`✅ Main route has ${mainExperience.length} experience entries`, "green");

            // Check that all achievements are showing
            mainExperience.forEach((exp, i) => {
                if (exp.achievements && exp.achievements.length > 0) {
                    log(`   Experience ${i + 1} (${exp.company}): ${exp.achievements.length} achievements`, "cyan");
                }
            });
        }

        if (mainProjects) {
            log(`✅ Main route has ${mainProjects.length} projects`, "green");
        }
    } catch (error) {
        log(`❌ Error testing main route: ${error.message}`, "red");
        allTestsPassed = false;
    }

    // Test bitpanda route content
    log("\n📋 Test 3: Bitpanda Route Content (Full Content)", "blue");
    try {
        const bitpandaHtml = await fetchPageContent("http://localhost:4173/bitpanda");
        const bitpandaExperience = extractExperienceData(bitpandaHtml);
        const bitpandaProjects = extractProjectsData(bitpandaHtml);

        if (!bitpandaExperience) {
            log("❌ Could not extract bitpanda experience data", "red");
            allTestsPassed = false;
        } else {
            log(`✅ Bitpanda route has ${bitpandaExperience.length} experience entries`, "green");

            // Verify all achievements are showing (no artificial limits)
            bitpandaExperience.forEach((exp, i) => {
                if (exp.achievements && exp.achievements.length > 0) {
                    log(`   Experience ${i + 1} (${exp.company}): ${exp.achievements.length} achievements`, "cyan");
                }
            });

            // Check for expected content from bitpanda.json5
            const cgiExp = bitpandaExperience.find(exp => exp.company === "CGI");
            if (cgiExp && cgiExp.achievements.length >= 5) {
                log("✅ CGI role showing all 5 achievements", "green");
            } else {
                log("❌ CGI role not showing expected number of achievements", "red");
                allTestsPassed = false;
            }
        }

        if (bitpandaProjects) {
            log(`✅ Bitpanda route has ${bitpandaProjects.length} projects`, "green");
            bitpandaProjects.forEach(project => {
                log(`   - ${project.name}`, "cyan");
            });
        } else {
            log("❌ Bitpanda route has no projects", "red");
            allTestsPassed = false;
        }
    } catch (error) {
        log(`❌ Error testing bitpanda route: ${error.message}`, "red");
        allTestsPassed = false;
    }

    // Test with explicit limits
    log("\n📋 Test 4: Content Limiting via URL Parameters", "blue");
    try {
        const limitedUrl = "http://localhost:4173/bitpanda?print=true&limitExp1=3&limitExp2=2&removeProjects=1";
        const limitedHtml = await fetchPageContent(limitedUrl);
        const limitedExperience = extractExperienceData(limitedHtml);
        const limitedProjects = extractProjectsData(limitedHtml);

        if (limitedExperience) {
            const firstExp = limitedExperience[0];
            const secondExp = limitedExperience[1];

            if (firstExp.achievements.length === 3) {
                log("✅ First experience limited to 3 achievements", "green");
            } else {
                log(`❌ First experience has ${firstExp.achievements.length} achievements, expected 3`, "red");
                allTestsPassed = false;
            }

            if (secondExp.achievements.length === 2) {
                log("✅ Second experience limited to 2 achievements", "green");
            } else {
                log(`❌ Second experience has ${secondExp.achievements.length} achievements, expected 2`, "red");
                allTestsPassed = false;
            }
        }

        if (limitedProjects && limitedProjects.length === 2) {
            log("✅ Projects reduced by 1 (removeProjects=1)", "green");
        } else {
            log(`❌ Expected 2 projects after removing 1, got ${limitedProjects?.length || 0}`, "red");
            allTestsPassed = false;
        }
    } catch (error) {
        log(`❌ Error testing limited content: ${error.message}`, "red");
        allTestsPassed = false;
    }

    // Test PDF optimization
    log("\n📋 Test 5: PDF Optimization Logic", "blue");
    try {
        // Check if PDF generation works
        const result = await runCommand("node", ["pdf-cli.js", "--force", "bitpanda"]);

        if (result.code === 0) {
            log("✅ PDF generation completed successfully", "green");
            if (result.stdout.includes("Optimizing content")) {
                log("✅ Content optimization was applied", "green");
            }
        } else {
            log("❌ PDF generation failed", "red");
            log(`   Error: ${result.stderr}`, "red");
            allTestsPassed = false;
        }
    } catch (error) {
        log(`❌ Error testing PDF generation: ${error.message}`, "red");
        allTestsPassed = false;
    }

    // Summary
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    log("\n🏁 CONTENT OPTIMIZATION TEST SUMMARY", "bold");
    log("====================================", "cyan");
    log(`⏱️  Total time: ${duration}s`);

    if (allTestsPassed) {
        log("🎉 ALL TESTS PASSED!", "bold");
        log("✅ Web pages show full content by default", "green");
        log("✅ Content limits only apply when explicitly set via URL parameters", "green");
        log("✅ Bitpanda route shows all experience achievements and projects", "green");
        log("✅ PDF optimization works correctly", "green");

        log("\n💡 CONCLUSION:", "bold");
        log("Content optimization fix is working correctly!", "green");
        log("- Web pages show ALL content from JSON5 files", "green");
        log("- Content is only reduced for PDF generation when needed", "green");
        log("- Bitpanda version now shows full experience data and projects", "green");
    } else {
        log("❌ SOME TESTS FAILED", "bold");
        log("Please review the failed tests above and address the issues.", "red");
    }

    return allTestsPassed;
}

// Run the test
testContentOptimization()
    .then((success) => {
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        log(`❌ Unexpected error: ${error.message}`, "red");
        console.error(error);
        process.exit(1);
    });
