# CLAUDE.md

## What this is

A single static page that takes a Claude Code transcript JSONL file (drag/drop
or file picker) and renders it as a readable conversation. Pure client-side —
no backend, no upload, no telemetry. Deployed to GitHub Pages at
<https://offpolicy.github.io/cc-transcripts/>.

## Architecture

Vanilla HTML + ES modules, no build step, no framework, no `package.json`.
ESM dependencies are vendored under `vendor/` so the page works offline and
has no runtime CDN dependency. Relative paths everywhere so the same file
tree works for `file://`, `localhost`, and `/<repo>/` on Pages.

```
index.html        landing page + dropzone + sticky header shell
styles.css        design tokens + MessageBubble styles
.nojekyll         disables GitHub's Jekyll preprocessor
src/
  parse.js        JSONL → Message[]   (port of c9hub Rust extract_messages)
  markdown.js     marked + DOMPurify wrapper with custom code-block renderer
  render.js       Message[] → DOM     (port of c9hub MessageBubble.svelte)
  main.js         file drop wiring, sticky header, empty/loaded state machine
vendor/
  marked.js       marked@17           (esm.sh es2022 bundle)
  dompurify.js    dompurify@3         (esm.sh es2022 bundle)
```

## Provenance — what was ported from c9hub

This project is a detached, framework-free port of c9hub's transcript viewer.
If something looks wrong, check the source first:

| This repo | c9hub source of truth |
|---|---|
| `src/parse.js` extractMessages | `server/src/session/parser.rs::extract_messages` |
| `src/parse.js` readUserContent | `server/src/session/parser.rs::UserMessage::deserialize` |
| `src/render.js` | `src/lib/components/MessageBubble.svelte` |
| `src/markdown.js` | `src/lib/utils/formatting.ts::renderMarkdown` |
| `styles.css` `:root` tokens | `src/app.css` `:root` |
| `styles.css` `.message-bubble*` | `<style>` block in `MessageBubble.svelte` |

When updating, port both the parser and the renderer together — formatting
strings like `[Grep] toolu_xxx - {input}` come from the Rust parser, and
fixing them in only one place will diverge the look.

## Design decisions worth knowing

- **Five message types** match c9hub's `MessageType`: `User`, `Assistant`,
  `Thinking`, `ToolUse`, `ToolResult`. Keep this enum aligned with c9hub.
- **JSONL line types we skip silently**: `system`, `progress`,
  `file-history-snapshot`, `custom-title`, `agent-name`, `last-prompt`,
  `summary`, anything unknown. Real sessions are mostly `progress` lines
  (~58% in the fixture).
- **Sidechain entries** (`isSidechain === true`) are skipped to match c9hub's
  default. If you want to expose them, add a toggle rather than always-on.
- **Empty Thinking blocks render as header-only bubbles** — the Rust
  `extract_messages` emits Thinking entries unconditionally, and the Svelte
  template wraps the body in `{#if message.content}`. We match exactly. Many
  real Thinking entries have an empty `thinking` field with only a
  `signature` (encrypted extended thinking).
- **`[hidden] { display: none !important }`** in `styles.css` exists because
  `.viewer-header` and `.dropzone` use `display: flex`, which has equal
  specificity to UA `[hidden] { display: none }` and would otherwise win by
  cascade order. Without this rule the closed viewer/dropzone stay visible.
- **Vendored, not CDN.** The two bundles in `vendor/` are committed
  intentionally. Don't replace with `<script src="https://esm.sh/...">` —
  it reintroduces a runtime third-party dependency on every page load.
- **Live transcripts have a trailing partial line** while Claude Code is
  still writing. `parseTranscript` swallows per-line `JSON.parse` errors
  for this reason. Don't tighten this into a hard error.
- **Tool-use input is pretty-printed JSON** inside the bubble body (matches
  c9hub). If you want collapsible blocks per tool, that's a v2 — keep the
  flat string output for parity.

## Local dev

```sh
python3 -m http.server 8765
# then open http://127.0.0.1:8765/
```

ES modules require an HTTP origin. Opening `index.html` directly via
`file://` will fail to load `./src/*.js` in some browsers.

## Deploy

GitHub Pages is configured to deploy from `main` / `/`. Every push to `main`
triggers a rebuild — no Actions workflow involved. Build typically takes
~20 seconds.

```sh
gh api repos/offpolicy/cc-transcripts/pages/builds/latest --jq .status
# queued | building | built | errored
```

## Refreshing vendored deps

```sh
curl -sSL "https://esm.sh/marked@17.0.6/es2022/marked.bundle.mjs" \
  -o vendor/marked.js
curl -sSL "https://esm.sh/dompurify@3.4.1/es2022/dompurify.bundle.mjs" \
  -o vendor/dompurify.js
```

Pin the version in the URL — the `?bundle` shorthand returns a re-export
shim that points back to esm.sh and defeats the purpose of vendoring.

## Smoke testing changes

Before pushing UI changes, drive the page in a real browser. There's a
working playwright install at `/Users/ohjoonhee/Projects/c9hub/node_modules/playwright`
(c9hub uses it as a dev dep) that can be imported from a one-off `/tmp`
script. Pattern that's been verified to work:

```js
import { chromium } from '/Users/ohjoonhee/Projects/c9hub/node_modules/playwright/index.mjs';
// goto local server, setInputFiles on #file-input,
// waitForFunction(() => document.querySelectorAll('.message-bubble').length > 0)
```

A 2123-line fixture lives at
`~/.claude/projects/-Users-ohjoonhee-Projects-c9hub/0ed9663e-a289-484e-85b4-048d8dc1873f.jsonl`
and renders to 808 bubbles (35 User / 133 Assistant / 68 Thinking / 286
ToolUse / 286 ToolResult).
