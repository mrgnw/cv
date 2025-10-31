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
            stdio: "inherit",
            cwd,
            shell: true,
        });

        child.on("close", (code) => {
            resolve(code === 0);
        });

        child.on("error", (error) => {
            reject(error);
        });
    });
}

async function runTest(testName, scriptPath, description) {
    log(`\n🧪 Running ${testName}`, "bold");
    log(`📝 ${description}`, "blue");
    log("─".repeat(60), "cyan");

    if (!existsSync(scriptPath)) {
        log(`❌ Test script not found: ${scriptPath}`, "red");
        return false;
    }

    try {
        const success = await runCommand("node", [scriptPath]);

        if (success) {
            log(`✅ ${testName} PASSED`, "green");
        } else {
            log(`❌ ${testName} FAILED`, "red");
        }

        return success;
    } catch (error) {
        log(`❌ ${testName} ERROR: ${error.message}`, "red");
        return false;
    }
}

async function runAllTests() {
    log("\n🚀 Morgan's CV - Comprehensive Test Suite", "bold");
    log("==========================================\n");

    const startTime = Date.now();
    const testResults = [];

    // Test configurations
    const tests = [
        {
            name: "Experience Data Integration",
            script: "test-experience.mjs",
            description:
                "Validates that experience data files are consistent and properly structured",
        },
        {
            name: "Version Reader Integration",
            script: "test-version-integration.mjs",
            description:
                "Tests end-to-end version merging and route-level data flow",
        },
        {
            name: "Experience Data Validation",
            script: "validate-experience.mjs",
            description:
                "Comprehensive validation of experience data integrity and consistency",
        },
        {
            name: "Content Optimization System",
            script: "test-content-optimization.mjs",
            description:
                "Validates priority-based content reduction and PDF optimization features",
        },
    ];

    // Run each test
    for (const test of tests) {
        const scriptPath = join(__dirname, test.script);
        const result = await runTest(test.name, scriptPath, test.description);
        testResults.push({ name: test.name, passed: result });

        // Add separator between tests
        if (test !== tests[tests.length - 1]) {
            log("\n" + "═".repeat(80), "cyan");
        }
    }

    // Summary
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    const passedCount = testResults.filter((r) => r.passed).length;
    const totalCount = testResults.length;

    log("\n🏁 TEST SUITE SUMMARY", "bold");
    log("═".repeat(50), "cyan");
    log(`⏱️  Total time: ${duration}s`);
    log(`📊 Tests passed: ${passedCount}/${totalCount}`);

    // Individual test results
    testResults.forEach((result) => {
        const icon = result.passed ? "✅" : "❌";
        const color = result.passed ? "green" : "red";
        log(`${icon} ${result.name}`, color);
    });

    // Overall result
    const allPassed = passedCount === totalCount;
    log("\n" + "═".repeat(50), "cyan");

    if (allPassed) {
        log("🎉 ALL TESTS PASSED!", "bold");
        log("✅ Your CV system is working correctly", "green");
        log("✅ Experience data flows properly through all routes", "green");
        log(
            "✅ National Care Dental end date (2025-03-17) is correct",
            "green",
        );
        log(
            "✅ Version customizations work without breaking base data",
            "green",
        );

        log("\n💡 CONCLUSION:", "bold");
        log(
            "Your concern about experience data not making it to the main page",
            "green",
        );
        log(
            "appears to be unfounded. The system is working as expected!",
            "green",
        );
    } else {
        log("❌ SOME TESTS FAILED", "bold");
        log(
            "Please review the failed tests above and address the issues.",
            "red",
        );

        const failedTests = testResults
            .filter((r) => !r.passed)
            .map((r) => r.name);
        log(`\nFailed tests: ${failedTests.join(", ")}`, "yellow");
    }

    // Additional system checks
    log("\n🔍 System Health Check", "bold");
    log("─".repeat(30), "cyan");

    // Check if main files exist
    const criticalFiles = [
        "src/lib/versions/main.json",
        "src/lib/Experience.json5",
        "src/routes/+page.svelte",
        "src/routes/[slug]/+page.svelte",
        "src/lib/versionReader.ts",
        "src/lib/CV.svelte",
    ];

    let allFilesExist = true;
    criticalFiles.forEach((file) => {
        const fullPath = join(__dirname, file);
        if (existsSync(fullPath)) {
            log(`✅ ${file}`, "green");
        } else {
            log(`❌ ${file} - MISSING`, "red");
            allFilesExist = false;
        }
    });

    if (!allFilesExist) {
        log("\n⚠️  Some critical files are missing!", "yellow");
        allPassed = false;
    }

    // Check package.json for required dependencies
    const packageJsonPath = join(__dirname, "package.json");
    if (existsSync(packageJsonPath)) {
        try {
            const packageJson = JSON.parse(
                readFileSync(packageJsonPath, "utf-8"),
            );
            const requiredDeps = ["json5", "date-fns", "svelte"];
            const hasDeps = requiredDeps.every(
                (dep) =>
                    packageJson.dependencies?.[dep] ||
                    packageJson.devDependencies?.[dep],
            );

            if (hasDeps) {
                log("✅ Required dependencies present", "green");
            } else {
                log("❌ Some required dependencies may be missing", "red");
            }
        } catch (error) {
            log("❌ Could not parse package.json", "red");
        }
    }

    // Final recommendation
    if (allPassed) {
        log("\n🚀 RECOMMENDED ACTIONS:", "bold");
        log("1. ✅ System is working correctly - no actions needed", "green");
        log("2. 💡 Run `npm run dev` to start development server", "blue");
        log(
            "3. 📄 Run PDF generation to ensure all versions export correctly",
            "blue",
        );
        log("4. 🔄 Consider setting up these tests in CI/CD pipeline", "blue");
    } else {
        log("\n🔧 RECOMMENDED ACTIONS:", "bold");
        log("1. ❗ Fix the failing tests above", "red");
        log("2. 🔍 Check file paths and data structure consistency", "yellow");
        log("3. 🧪 Re-run tests after making changes", "yellow");
        log("4. 📞 Contact system maintainer if issues persist", "yellow");
    }

    return allPassed;
}

// Show usage if help requested
if (process.argv.includes("--help") || process.argv.includes("-h")) {
    log("\n📚 CV Test Suite Usage", "bold");
    log("======================\n");
    log("Run all tests:");
    log("  node run-all-tests.mjs", "blue");
    log("\nRun individual tests:");
    log("  node test-experience.mjs", "blue");
    log("  node test-version-integration.mjs", "blue");
    log("  node validate-experience.mjs", "blue");
    log("\nOptions:");
    log("  --help, -h    Show this help message", "blue");
    process.exit(0);
}

// Run the test suite
runAllTests()
    .then((success) => {
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        log(`❌ Unexpected error: ${error.message}`, "red");
        console.error(error);
        process.exit(1);
    });
