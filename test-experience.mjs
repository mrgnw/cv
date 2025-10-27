#!/usr/bin/env node
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function loadJsonFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const cleanContent = content.replace(/^\uFEFF/, ''); // Remove BOM
    return JSON5.parse(cleanContent);
  } catch (error) {
    log(`❌ Error loading ${filePath}: ${error.message}`, 'red');
    return null;
  }
}

function testExperienceData() {
  log('\n🔍 Testing Experience Data Integration', 'bold');
  log('=====================================\n');

  // Load the files
  const mainJsonPath = join(__dirname, 'src/lib/versions/main.json');
  const experienceJsonPath = join(__dirname, 'src/lib/Experience.json5');
  const bitpandaJsonPath = join(__dirname, 'src/lib/versions/data/bitpanda.json5');

  const mainData = loadJsonFile(mainJsonPath);
  const experienceData = loadJsonFile(experienceJsonPath);
  const bitpandaData = loadJsonFile(bitpandaJsonPath);

  if (!mainData || !experienceData) {
    log('❌ Failed to load required files', 'red');
    return false;
  }

  let allTestsPassed = true;

  // Test 1: Check if main.json has the correct National Care Dental end date
  log('📋 Test 1: National Care Dental End Date in main.json', 'cyan');
  const mainNCD = mainData.experience.find(exp => exp.company === 'National Care Dental');
  if (mainNCD) {
    if (mainNCD.end === '2025-03-17') {
      log(`✅ National Care Dental end date is correct: ${mainNCD.end}`, 'green');
    } else {
      log(`❌ National Care Dental end date is incorrect: ${mainNCD.end} (expected: 2025-03-17)`, 'red');
      allTestsPassed = false;
    }
  } else {
    log('❌ National Care Dental not found in main.json', 'red');
    allTestsPassed = false;
  }

  // Test 2: Check if Experience.json5 has the correct National Care Dental end date
  log('\n📋 Test 2: National Care Dental End Date in Experience.json5', 'cyan');
  const expNCD = experienceData.experience.find(exp => exp.company === 'National Care Dental');
  if (expNCD) {
    if (expNCD.end === '2025-03-17') {
      log(`✅ National Care Dental end date is correct: ${expNCD.end}`, 'green');
    } else {
      log(`❌ National Care Dental end date is incorrect: ${expNCD.end} (expected: 2025-03-17)`, 'red');
      allTestsPassed = false;
    }
  } else {
    log('❌ National Care Dental not found in Experience.json5', 'red');
    allTestsPassed = false;
  }

  // Test 3: Compare data between main.json and Experience.json5
  log('\n📋 Test 3: Data Consistency Between Files', 'cyan');
  const mainCompanies = mainData.experience.map(exp => exp.company);
  const expCompanies = experienceData.experience.map(exp => exp.company);

  log(`Main.json companies: ${mainCompanies.join(', ')}`);
  log(`Experience.json5 companies: ${expCompanies.join(', ')}`);

  // Check if there's overlap
  const hasOverlap = mainCompanies.some(company => expCompanies.includes(company));
  if (hasOverlap) {
    log('✅ Files have overlapping companies', 'green');
  } else {
    log('⚠️  Files have no overlapping companies - Experience.json5 might not be integrated', 'yellow');
  }

  // Test 4: Check chronological order
  log('\n📋 Test 4: Chronological Order in main.json', 'cyan');
  let chronologicallyCorrect = true;
  for (let i = 1; i < mainData.experience.length; i++) {
    const current = new Date(mainData.experience[i].start);
    const previous = new Date(mainData.experience[i-1].start);

    if (current > previous) {
      log(`❌ Chronological order error: ${mainData.experience[i].company} (${mainData.experience[i].start}) should not be after ${mainData.experience[i-1].company} (${mainData.experience[i-1].start})`, 'red');
      chronologicallyCorrect = false;
      allTestsPassed = false;
    }
  }
  if (chronologicallyCorrect) {
    log('✅ Experience entries are in correct chronological order (newest first)', 'green');
  }

  // Test 5: Check if CGI is the current role
  log('\n📋 Test 5: Current Role Verification', 'cyan');
  const currentRole = mainData.experience[0]; // Should be the first (most recent) entry
  if (currentRole.company === 'CGI' && !currentRole.end) {
    log(`✅ Current role is correct: ${currentRole.title} at ${currentRole.company} (started ${currentRole.start})`, 'green');
  } else {
    log(`❌ Current role issue: ${currentRole.title} at ${currentRole.company} (end: ${currentRole.end || 'ongoing'})`, 'red');
    allTestsPassed = false;
  }

  // Test 6: Required fields validation
  log('\n📋 Test 6: Required Fields Validation', 'cyan');
  let fieldsValid = true;
  mainData.experience.forEach((exp, index) => {
    const required = ['title', 'company', 'start', 'achievements'];
    required.forEach(field => {
      if (!exp[field]) {
        log(`❌ Missing ${field} in experience[${index}] (${exp.company || 'unknown'})`, 'red');
        fieldsValid = false;
        allTestsPassed = false;
      }
    });

    if (exp.achievements && !Array.isArray(exp.achievements)) {
      log(`❌ Achievements should be an array in experience[${index}] (${exp.company})`, 'red');
      fieldsValid = false;
      allTestsPassed = false;
    }
  });
  if (fieldsValid) {
    log('✅ All required fields are present and valid', 'green');
  }

  // Test 7: Bitpanda version integration
  if (bitpandaData) {
    log('\n📋 Test 7: Bitpanda Version Integration', 'cyan');
    log(`Bitpanda version has company: ${bitpandaData.company}`);
    log(`Bitpanda version has title: ${bitpandaData.title}`);
    log(`Bitpanda version has ${bitpandaData.experience ? bitpandaData.experience.length : 0} experience entries`);

    if (bitpandaData.company === 'Bitpanda' && bitpandaData.title) {
      log('✅ Bitpanda version has correct company and title customization', 'green');
    } else {
      log('⚠️  Bitpanda version customization might be incomplete', 'yellow');
    }
  }

  // Summary
  log('\n🏁 Test Summary', 'bold');
  log('==============');
  if (allTestsPassed) {
    log('✅ All tests passed! Experience data appears to be correctly configured.', 'green');
  } else {
    log('❌ Some tests failed. There may be issues with experience data integration.', 'red');
  }

  // Recommendations
  log('\n💡 Integration Analysis', 'bold');
  log('======================');

  if (mainNCD && expNCD) {
    if (mainNCD.end === expNCD.end) {
      log('✅ National Care Dental end dates are consistent between files', 'green');
    } else {
      log('⚠️  National Care Dental end dates differ between main.json and Experience.json5', 'yellow');
      log(`   main.json: ${mainNCD.end}`, 'yellow');
      log(`   Experience.json5: ${expNCD.end}`, 'yellow');
    }
  }

  if (!hasOverlap) {
    log('\n🔧 Recommendation: Experience.json5 Integration', 'yellow');
    log('   Experience.json5 appears to be a separate data source that is not');
    log('   being used in the main CV rendering. Consider either:');
    log('   1. Updating main.json to match Experience.json5');
    log('   2. Modifying versionReader.ts to use Experience.json5 as the base');
    log('   3. Creating a script to sync data between files');
  }

  return allTestsPassed;
}

// Run the tests
const success = testExperienceData();
process.exit(success ? 0 : 1);
