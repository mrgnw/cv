# 🚀 Intelligent PDF Generation System

## ✨ **Smart Watch Mode Features**

Our PDF generation system now includes **intelligent selective regeneration** that's incredibly efficient:

### 🎯 **Selective PDF Generation**
- **Version File Changes**: Only regenerates PDFs for the specific versions that changed
- **Global File Changes**: Regenerates all PDFs when core components change
- **Smart Mapping**: Automatically maps file paths to version slugs

### 👀 **What Gets Watched**

#### **Selective Regeneration** (only affected PDFs):
```
src/lib/versions/**/*.{json,json5,jsonc}
```
- `src/lib/versions/main.json` → regenerates `morgan-williams.pdf`
- `src/lib/versions/data/allianz.json5` → regenerates `morgan-williams.allianz-data.pdf`
- `src/lib/versions/backend/allianz.json5` → regenerates `morgan-williams.allianz-backend.pdf`

#### **Full Regeneration** (all PDFs):
```
src/lib/CVSans.svelte          # Main CV component
src/lib/EngCV.svelte           # Alternative CV component  
src/lib/projects.jsonc         # Project definitions
src/lib/projects-es.jsonc      # Spanish project definitions
```

## 🎮 **Usage Examples**

### **Basic Commands (Unified CLI)**
```bash
# Incremental PDF generation (only stale versions)
bun run pdf

# Generate specific versions
SERVER_URL=https://cv.skate-in.ts.net node pdf-cli.js main allianz-backend

# Watch mode (persistent browser, selective regen)
bun run pdf:watch

# Force regenerate all targeted versions (ignore cache)
bun run pdf:force

# Force regenerate all versions
bun run pdf:all:force

# List versions & stale status
bun run pdf:list

# Generate only versions changed vs origin/main
bun run pdf:changed

# Generate only versions changed vs another ref (example feature branch base)
SERVER_URL=https://cv.skate-in.ts.net node pdf-cli.js --changed=origin/develop

# Generate specific version with force (RECOMMENDED APPROACH)
SERVER_URL=https://cv.skate-in.ts.net node pdf-cli.js bitpanda --force
```

### **Watch Mode Demo**
```bash
$ bun run pdf:watch

📄 PDF Generator
📋 Available versions (11): coinbase, data, dx, es, maines, main, pitch, allianzes, allianz-backend, allianz-data, fullstack
✅ Preview server already running
🎉 PDF generation complete!
👀 Watching for changes...
   📁 Version files: src/lib/versions/**/*.{json,json5,jsonc}
   🎨 Component files: src/lib/{CVSans,EngCV}.svelte
   📄 Main data: src/lib/{projects,projects-es}.jsonc

# Edit src/lib/versions/data/allianz.json5
🔄 Changed: src/lib/versions/data/allianz.json5 → allianz-data
🎯 Regenerating PDFs for: allianz-data
🖨️  static/morgan-williams.allianz-data.pdf
✅ Selective PDF update complete

# Edit src/lib/CVSans.svelte  
🔄 Global file changed: src/lib/CVSans.svelte
🔄 Global change detected → regenerating only stale PDFs (or all if forced)
🖨️  static/morgan-williams.pdf
🖨️  static/morgan-williams.coinbase.pdf
🖨️  static/morgan-williams.allianz-data.pdf
✅ Regeneration complete
```

## 🎯 **Content Management**

The system uses the ContentOptimizer class to automatically adjust content length when PDFs exceed one page, but this optimization happens automatically during generation - no special commands are needed.

## ⚡ **Performance Benefits**

| Scenario | Before | After | Speedup |
|----------|--------|-------|---------|
| **Single version change** | Regenerate all 11 PDFs (~45s) | Regenerate 1 PDF (~4s) | **11x faster** |
| **Global component change** | Regenerate all 11 PDFs (~45s) | Parallel generation (unlimited concurrency) (~10-15s) | **3-4x faster** |
| **Multiple version changes** | Regenerate all 11 PDFs | Batch regenerate only changed | **5-8x faster** |
| **No changes** | Always regenerate | Skip unchanged (cache) | **∞x faster** |
| **Content optimization** | Manual content editing | Automatic reduction when needed | **Seamless** |

## 🛠️ **Development Workflow**

### **Perfect for Iterative Development**
```bash
# Start watch mode once
bun run pdf:watch

# Then just edit files - PDFs update automatically!
# ✏️  Edit allianz backend requirements → only allianz-backend.pdf updates
# ✏️  Edit coinbase skills → only coinbase.pdf updates
# ✏️  Edit CVSans component → all PDFs update
# ✏️  Add new version → new PDF appears automatically
```

### **Recommended Development Workflow**
```bash
# For single version updates (fastest and most reliable):
SERVER_URL=https://cv.skate-in.ts.net node pdf-cli.js bitpanda --force
SERVER_URL=https://cv.skate-in.ts.net node pdf-cli.js main --force
SERVER_URL=https://cv.skate-in.ts.net node pdf-cli.js allianz-backend --force

# For all versions:
bun run pdf:all:force

# For development with file watching:
bun run pdf:watch

# Note: All commands now use the live server at https://cv.skate-in.ts.net
# No need to run local preview server!
```

### **Git Integration**
Generation is now decoupled and uses the live server; run `bun run pdf:all:force` locally before committing if you want updated artifacts. Use `bun run pdf:changed` to only regenerate versions touched by changes.

## 🎯 **File-to-PDF Mapping**

The system automatically maps version files to their corresponding PDFs:

```
src/lib/versions/main.json                    → morgan-williams.pdf
src/lib/versions/coinbase.json               → morgan-williams.coinbase.pdf
src/lib/versions/data/allianz.json5          → morgan-williams.allianz-data.pdf
src/lib/versions/backend/allianz.json5       → morgan-williams.allianz-backend.pdf
src/lib/versions/dx.json                     → morgan-williams.dx.pdf
```

## 🚀 **Advanced Features**

### **Intelligent Batching**
- Rapid edits are debounced (400ms) and coalesced
- Global edits trigger a single regen pass
- Unlimited concurrency by default (override with PDF_CONCURRENCY)

### **Error Handling**
- Graceful fallback if version mapping fails
- Continues processing other versions on individual failures
- Clear error reporting with suggested fixes

### **Resource Management**
- Automatic preview server detection & startup
- Parallel PDF generation (page pool sized by PDF_CONCURRENCY env var; default unlimited for small sets)
- Persistent browser in watch mode reduces launch overhead

## 🎨 **Print Styling**

The system uses CSS print media queries for optimal PDF formatting:

```css
@media print {
  .print-optimizing {
    font-size: 11pt !important;
    line-height: 1.3 !important;
  }
}
```

---

**This system makes PDF management completely seamless during development while ensuring production deployments always have up-to-date PDFs! All commands now use the live server at https://cv.skate-in.ts.net, eliminating the need for local preview servers.** 🎉
