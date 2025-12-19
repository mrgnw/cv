# Template Architecture

## Overview

The CV PDF generation system now uses a **shared Handlebars template** that works across both JavaScript and Python, eliminating HTML generation logic duplication.

## File Structure

```
cv/
├── templates/
│   └── cv.hbs              # Shared Handlebars template
├── styles/
│   └── cv.css              # Shared CSS (external, loaded into template)
├── cv2pdf.js               # JavaScript CLI (uses template)
├── cv2pdf.py               # Python CLI (uses template)
├── defaults.json5          # Shared defaults
└── cvs/
    └── *.json5             # Resume files
```

## How It Works

### Data Flow

1. **Load Resume**: Parse JSON5 resume file
2. **Load Defaults**: Merge with `defaults.json5`
3. **Prepare Template Data**: Structure data with labels, formatting, filtering
4. **Render Template**: Compile template with data
5. **Generate PDF**: Use Playwright to render HTML and create PDF

### Shared Template (`cv.hbs`)

The template contains:
- HTML structure with Handlebars syntax (`{{variable}}`)
- Conditional blocks (`{{#if condition}}`)
- Loop blocks (`{{#each array}}`)
- Custom helpers for formatting dates and URLs
- CSS embedding via `{{{css}}}`

### JavaScript Implementation (`cv2pdf.js`)

**Dependencies:**
- `handlebars` - Template compilation

**Key functions:**
- `loadTemplate()` - Read template file
- `registerHandlebarsHelpers()` - Register custom helpers
- `generateHtml()` - Compile template with data

**Helpers:**
- `formatDate()` - Format dates to "MMM yyyy"
- `formatUrl()` - Remove protocol/www from URLs
- `lt`, `lte`, `gt`, `gte`, `ne` - Comparison operators for templates

### Python Implementation (`cv2pdf.py`)

**Dependencies:**
- `pybars3` - Template compilation (Handlebars for Python)

**Key functions:**
- `load_template()` - Read template file
- `generate_html()` - Compile template with data

**Helpers:**
- Same custom helpers as JavaScript version
- Passed as dict to template compiler

## Benefits

✅ **Single Source of Truth**: HTML structure lives in one place  
✅ **Language Agnostic**: Works with JavaScript and Python  
✅ **Maintainability**: Changes to layout update both tools automatically  
✅ **Separation of Concerns**: Logic vs presentation clearly separated  
✅ **Reduced Code**: No HTML string concatenation in either script  

## Template Variables

```javascript
{
  name: string,
  email: string,
  github: string,
  linkedin: string,
  summary: string,
  skills: string[],
  experience: object[],
  projects: object[],
  education: object[],
  lang: "en" | "es",
  labels: {
    skills: string,
    experience: string,
    projects: string,
    education: string,
    present: string
  },
  validProjects: object[],  // Filtered and normalized
  css: string               // Loaded from styles/cv.css
}
```

## Dependencies

### JavaScript (`cv2pdf.js`)
```bash
npm install handlebars
```

### Python (`cv2pdf.py`)
```bash
pip install pybars3
```

## Usage

Both tools have identical CLI interfaces:

```bash
# JavaScript
node cv2pdf.js input.json5 output.pdf
node cv2pdf.js cvs/*.json5 output/ --parallel 3

# Python
python cv2pdf.py input.json5 output.pdf
python cv2pdf.py cvs/*.json5 output/ --parallel 3
```

## Template Syntax Reference

### Conditionals
```handlebars
{{#if skills}}
  <section class="skills-section">
    ...
  </section>
{{/if}}
```

### Loops
```handlebars
{{#each experience}}
  <div class="job-item">
    {{this.title}}
  </div>
{{/each}}
```

### Comparisons (via helpers)
```handlebars
{{#if (gt skills.length 2)}}
  <div class="skills-secondary">...</div>
{{/if}}
```

### Custom Helpers
```handlebars
{{formatDate this.start}}
{{formatUrl this.url}}
```

### Accessing Parent Context
```handlebars
{{#each experience}}
  {{../labels.experience}}
{{/each}}
```

## Modifying the Template

1. Edit `templates/cv.hbs`
2. Both `cv2pdf.js` and `cv2pdf.py` automatically use the updated template
3. No changes needed to either script

## Modifying Styles

1. Edit `styles/cv.css`
2. Both scripts load and embed the CSS automatically
3. No changes needed to either script

## Language Support

The template supports multiple languages via the `lang` field:
- `"en"` - English labels (default)
- `"es"` - Spanish labels (Habilidades, Experiencia, etc.)

Set in `defaults.json5` or individual resume files.