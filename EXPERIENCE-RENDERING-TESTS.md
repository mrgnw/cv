# Experience Rendering Tests for CV Routes

This document describes the comprehensive test suite for experience rendering in the Morgan Williams CV application. The test suite ensures that experience data flows correctly through all routes and renders properly in the CV components.

## Overview

The test suite consists of **52 tests** across two main test files:

1. **`tests/experience-rendering.test.js`** (35 tests) - Unit tests with mock data
2. **`tests/route-integration.test.js`** (17 tests) - Integration tests with real data

All tests are currently **passing** ✅

## Test Categories

### 1. Main CV Route Experience Data (6 tests)

Tests the primary `/` route that loads the main CV data:

- ✅ Loads main CV data successfully
- ✅ Has correct experience data structure (title, company, start, skills, achievements)
- ✅ CGI is current role (no end date, starts 2025-03-17)
- ✅ National Care Dental has correct end date (2025-03-17)
- ✅ Maintains chronological order (most recent first)
- ✅ PDF link configured correctly (`/morgan-williams.pdf`)

### 2. Version-Specific Route Experience Data (5 tests)

Tests the `/[slug]` routes that load specialized versions:

- ✅ Loads version-specific data (e.g., bitpanda version)
- ✅ Generates version-specific PDF links (`/morgan-williams.{slug}.pdf`)
- ✅ Merges main and version data using `coalesceVersion()`
- ✅ Merges achievements from both main and version sources
- ✅ Resolves projects correctly for each version

### 3. Route Integration Tests (5 tests)

Tests the actual route loading behavior:

- ✅ Simulates main page rendering with correct data flow
- ✅ Simulates slug page rendering for specific versions
- ✅ Handles invalid versions gracefully (returns null)
- ✅ Provides all required props for CV.svelte component
- ✅ Provides correct props for version-specific routes

### 4. Data Integrity for Route Rendering (5 tests)

Validates data structure and format for rendering:

- ✅ All experience entries have required fields
- ✅ Achievements are properly structured arrays
- ✅ Date formats are valid (YYYY-MM-DD) and parseable
- ✅ Skills arrays are properly formatted
- ✅ Experience entries are in chronological order (newest first)

### 5. Cross-Version Data Consistency (4 tests)

Ensures data consistency across different CV versions:

- ✅ Company names consistent across versions
- ✅ Experience merging works correctly (no null entries)
- ✅ Base data preserved when version data is sparse
- ✅ Version-specific fields override base data appropriately

### 6. Performance and Error Handling (4 tests)

Tests system robustness and performance:

- ✅ Handles missing version files gracefully
- ✅ Loads version data efficiently (< 50ms for mock, < 1000ms for real)
- ✅ Provides consistent data across multiple calls
- ✅ Handles empty or minimal experience data

### 7. Route-Specific PDF Generation Data (3 tests)

Validates PDF generation support:

- ✅ Generates correct PDF links for all versions
- ✅ Provides complete data for PDF generation
- ✅ Supports PDF link patterns for custom versions

### 8. Component Props Validation (3 tests)

Ensures compatibility with Svelte components:

- ✅ Provides valid props for CV.svelte component
- ✅ Provides valid experience data for Experience.svelte component
- ✅ Provides valid project data for Projects.svelte component

## Integration Tests (Real Data)

The integration test suite validates actual file loading and route behavior:

### Main Route Integration (4 tests)
- ✅ Loads real main CV data without errors
- ✅ Validates experience structure matches CV component expectations
- ✅ Verifies National Care Dental end date (2025-03-17)
- ✅ Verifies CGI is current role without end date

### Slug Route Integration (3 tests)
- ✅ Loads version-specific data correctly
- ✅ Handles invalid version slugs gracefully
- ✅ Merges experience data correctly for specialized versions

### Real Data Validation (3 tests)
- ✅ Validates actual experience data structure
- ✅ Validates chronological ordering of experience
- ✅ Validates project resolution works correctly

### Error Handling & Performance (4 tests)
- ✅ Handles missing files gracefully
- ✅ Handles parsing errors gracefully
- ✅ Loads version data efficiently (< 1 second)
- ✅ Provides consistent data across multiple calls

### Route Rendering Integration (2 tests)
- ✅ Provides all required data for CV component rendering
- ✅ Supports variant routing for different CV styles

## Running the Tests

### Run All Tests
```bash
npm run test:run                    # All 52 tests
```

### Run Specific Test Suites
```bash
npm run test:experience-rendering   # Unit tests (35 tests)
npm run test:route-integration      # Integration tests (17 tests)
npm run test:unit                   # Both test files (52 tests)
```

### Run Individual Test Categories
```bash
npm test                            # Watch mode
npm run test:run tests/experience-rendering.test.js
npm run test:run tests/route-integration.test.js
```

## Test Architecture

### Mock Data Structure
Unit tests use carefully crafted mock data that mirrors the real CV data structure:

```javascript
const mockMainData = {
    name: "Morgan Williams",
    title: "Rapid full-stack development at scale",
    email: "morganfwilliams@me.com",
    experience: [/* experience entries */],
    projects: [/* project names */],
    pdfLink: "/morgan-williams.pdf"
};
```

### Version Merging Logic
Tests validate the core `coalesceVersion()` function that:
1. Loads main CV data as base
2. Merges with version-specific overrides
3. Resolves project references
4. Generates appropriate PDF links

### Error Handling
Tests ensure graceful handling of:
- Missing version files
- Invalid JSON parsing
- Empty or malformed data
- Network/file system errors

## Key Validations

### Experience Data Structure
Each experience entry must have:
- `title` (string): Job title
- `company` (string): Company name  
- `start` (string): Start date in YYYY-MM-DD format
- `skills` (array, optional): List of relevant skills
- `achievements` (array, optional): List of accomplishments

### Date Validation
- All dates in YYYY-MM-DD format
- Start dates are parseable as valid Date objects
- End dates (when present) are after start dates
- Current role (CGI) has no end date

### Route Data Flow
1. **Main Route (`/`)**: `coalesceVersion("main")` → CV component
2. **Version Routes (`/[slug]`)**: `coalesceVersion(slug)` → CV component  
3. **Layout**: `getAllVersions()` → Navigation/version list

## Critical Business Logic Tests

### National Care Dental End Date
- ✅ Consistently shows end date as "2025-03-17"
- ✅ Reflects transition from NCD to CGI role
- ✅ Maintained across all versions and data sources

### CGI Current Role
- ✅ No end date (indicating current employment)
- ✅ Start date of "2025-03-17" 
- ✅ Title: "Data Engineering Consultant"

### Chronological Ordering
- ✅ Most recent experience first (CGI)
- ✅ Followed by National Care Dental  
- ✅ Then Persefoni (oldest)

## Test Coverage Summary

| Category | Unit Tests | Integration Tests | Total |
|----------|------------|-------------------|-------|
| Route Data Loading | 11 | 4 | 15 |
| Data Structure | 9 | 3 | 12 |
| Version Merging | 9 | 3 | 12 |
| Error Handling | 4 | 2 | 6 |
| Performance | 2 | 2 | 4 |
| Component Integration | 0 | 2 | 2 |
| **TOTAL** | **35** | **17** | **52** |

## Continuous Integration

These tests should be run:
- ✅ Before every deployment
- ✅ On every pull request  
- ✅ After any data file changes
- ✅ When modifying route logic
- ✅ When updating CV components

## Maintenance Notes

### When to Update Tests
- Adding new experience entries
- Changing data file structure
- Modifying route logic
- Adding new CV versions
- Changing component props

### Test Data Sync
- Mock data should mirror real data structure
- Update tests when changing date formats
- Validate new company/role additions
- Test new version file patterns

## Conclusion

This comprehensive test suite provides confidence that:

1. **Experience data flows correctly** through all routes
2. **Date accuracy is maintained** (especially NCD end date)  
3. **Version merging works properly** for specialized CVs
4. **Error conditions are handled gracefully**
5. **Component integration is validated**
6. **Performance requirements are met**

The tests serve as both validation and documentation of the expected behavior for the CV's experience rendering system.