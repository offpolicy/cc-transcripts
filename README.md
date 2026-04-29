# Claude Code Transcript Viewer

Drop a Claude Code `~/.claude/projects/<slug>/<sessionId>.jsonl` transcript file
onto the page to view it as a readable conversation.

The transcript-rendering UI is detached from c9hub — same `MessageBubble`
look, no backend.

## Local use

Open `index.html` in a browser. That's it. Your transcript file never leaves
the page; everything runs client-side.

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. Repo → **Settings** → **Pages** → "Build and deployment" → **Deploy from a
   branch** → `main` / `/ (root)` → Save.
3. Your viewer is live at `https://<user>.github.io/<repo>/`.

No build step. No Actions workflow. The `.nojekyll` file at repo root keeps
GitHub from running Jekyll over the site.

## Layout

```
index.html          landing page + dropzone
styles.css          design tokens + MessageBubble styles
src/
  parse.js          JSONL → Message[]
  markdown.js       marked + DOMPurify wrapper
  render.js         Message[] → DOM
  main.js           file drop + sticky header
vendor/
  marked.js         vendored ESM (marked@17)
  dompurify.js      vendored ESM (dompurify@3)
```

## Refreshing vendored deps

```sh
curl -sSL "https://esm.sh/marked@17.0.6/es2022/marked.bundle.mjs" \
  -o vendor/marked.js
curl -sSL "https://esm.sh/dompurify@3.4.1/es2022/dompurify.bundle.mjs" \
  -o vendor/dompurify.js
```
