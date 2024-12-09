## Morgan's CV

My CV/resume. src/versions allows me to tailor my resume

`bun install`

### Generate pdf

```sh
bunx playwright install chromium
bun run pdfs
```



Unfortunately, pdf export is only supported on Chromium[*](https://playwright.dev/docs/api/class-page#page-pdf)

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
