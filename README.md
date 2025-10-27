## Morgan's CV

My CV/resume. src/versions allows me to tailor my resume

`bun install`

### Generate pdf

```sh
bunx playwright install chromium
bun run pdfs
```

Unfortunately, pdf export is only supported on Chromium[*](https://playwright.dev/docs/api/class-page#page-pdf)

## Testing

### Comprehensive Test Suite (52 tests total)

```sh
# Run all tests (MJS + Vitest)
npm run test:all             # Legacy MJS tests (4 test suites)
npm run test:run             # Modern Vitest tests (52 tests)

# Vitest-based tests (recommended)
npm run test:unit            # All unit & integration tests (52 tests)
npm run test:experience-rendering  # Experience rendering tests (35 tests)
npm run test:route-integration     # Route integration tests (17 tests)

# Legacy MJS-based tests
npm run test:experience      # Basic data validation
npm run test:integration     # End-to-end route testing
npm run test:validate        # Comprehensive validation
npm run test:optimization    # Content optimization tests
```

### Test Coverage
- ✅ **52 Vitest tests** covering experience rendering, route integration, and data validation
- ✅ **4 MJS test suites** for legacy validation and system health checks
- ✅ **Real data validation** ensures National Care Dental end date (2025-03-17) is correct
- ✅ **Route testing** validates main page (`/`) and version pages (`/[slug]`) work correctly
- ✅ **Component integration** tests ensure CV.svelte receives proper data

See [EXPERIENCE-RENDERING-TESTS.md](./EXPERIENCE-RENDERING-TESTS.md) for detailed test documentation.

## Generated using Svelte 5 template with [shadcn-svelte](http://shadcn-svelte.com) and [mdsvex](http://mdsvex.pngwn.io)

### Use this template

```sh
appname="svwhatever"
```

```sh
gh repo create $appname \
  --template https://github.com/mrgnw/shadcn-svelte-template \
  --private --clone
cd $appname
```

## Setting up Git Hooks

We have two git hooks to generate the pdfs any time there are changes.

To generate the pdfs on the computer you are coding on:

```sh
bun install
```

```sh
chmod +x pre-push.local.sh
mkdir -p .git/hooks
cp pre-push.local.sh .git/hooks/pre-push
```

To send a command to the primary computer to have it generate the pdfs:

```sh
mkdir -p .git/hooks
chmod +x pre-push.remote.sh
cp pre-push.remote.sh .git/hooks/pre-push
```
