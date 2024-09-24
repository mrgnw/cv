## Morgan's CV

### Generate pdf

```sh
bunx playwright install chromium
bun run build && bun run preview
```

```sh
node generate-pdf.js
```



Unfortunately, pdf export is only supported on Chromium[*](https://playwright.dev/docs/api/class-page#page-pdf)

### Generated using Svelte 5 template with [shadcn-svelte](http://shadcn-svelte.com) and [mdsvex](http://mdsvex.pngwn.io)

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

### pdf generation
