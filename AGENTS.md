# Agent guide — profile README + static site

Generate `README.md` from `readme.template.md` + `content/site.json` (via `config.ts`) + `toolbox.ts` via `index.ts`. Static landing/writing site lives in `web/` and reads the same `content/`. Prefer small, on-demand edits; rebuild; push. Do not reinvent the layout.

## Architecture (skim)

| Piece | Role |
| --- | --- |
| `content/site.json` | Bio, mottos, stack line, Featured Work, socials, liked count, site URL |
| `content/posts/*.mdx` | Writing posts (`title`, `date`, `slug`, `summary`, `draft?`) |
| `config.ts` | Thin re-exports from `content/site.json` for the README build |
| `posts.ts` | Lists posts + renders README “Writing” markdown |
| `toolbox.ts` | Flat shields.io badge list + `renderToolbox()` |
| `readme.template.md` | Static layout + `<!-- … -->` inject markers / `{placeholders}` |
| `index.ts` | Fetches GitHub data, fills template → writes `README.md` |
| `web/` | Astro static site (landing, `/writing`, SEO) → `web/dist` |
| `web/src/pages/rss.xml.ts` | RSS feed from published posts |
| `web/src/pages/llms.txt.ts` | Generated `llms.txt` from `site.json` + posts (do not hand-edit a public copy) |
| `web/public/og-default.png` | Default Open Graph / Twitter card image |
| `web/public/favicon.svg` | Site favicon |
| `web/src/components/ExcalidrawBoard.astro` | Read-only Excalidraw diagram for Writing posts. SVG is baked at dev/build; the component inlines it (see **Excalidraw boards**) |
| `web/diagrams/*.json` | Excalidraw scene files the boards load |
| `web/public/fonts/excalidraw/` | Self-hosted Excalifont + Virgil for board text |
| `web/src/components/github/` + `web/src/lib/github.ts` | `<RepoCard>` / `<PrCard>` and GitHub link hover previews in Writing posts, from build-time API data (see **GitHub cards and link previews**) |
| `.github/workflows/build.yml` | README: on-demand `push` to `master` + `workflow_dispatch` |
| `.github/workflows/pages.yml` | Site: build `web/` → GitHub Pages (`rishi23root.in`) |

Flow: edit `content/` / toolbox / template → `GITHUB_TOKEN=… npm run build:readme` → commit `README.md` (or let Actions rebuild on `master`). Site: edit `content/` or `web/` → `npm run build:web` (or Pages workflow on `master`).

## Common edits (cheat sheet)

| Change | Where | Notes |
| --- | --- | --- |
| Bio / description / `$STACK` line | `content/site.json` → `shortBio`, `fullDescription`, `stackLine` | Keep whoami inside the ```bash fence |
| Mottos | `content/site.json` → `mottos` | Rendered as 「samp」 |
| Socials / email / site URL | `content/site.json` → `contact`, `siteUrl` | README: bottom text links (incl. Website). Site: chrome `@` `SocialsMenu` **after** theme toggle; hover opens / click pins; no website self-link (`web/src/lib/site.ts` `socialLinks`) |
| Phone header menu (≤ 40rem) | `web/src/scripts/chrome-menu.ts` + "Phone chrome" block in `global.css` | `.menu-toggle` opens `.chrome-end` as an overlay; gated on `html.js` (set in `BaseLayout.astro`), no-JS wraps instead; keep the 40rem query in sync in CSS and TS |
| Home section order | `web/src/pages/index.astro` | Voice bio → Capabilities → Writing (5, `→` to `/writing/`) → Work (3, `→` to `/projects/`). No under-bio contact strip |
| Featured Work / Projects | `content/site.json` → `projects` | Single source for `/`, `/projects/`, README Featured Work, and `llms.txt` (`title`, `blurb`, `url`, `order`, optional `repo` `owner/repo`, optional `featured` flag, optional `tags[]` for `/projects/` filtering) |
| Recently liked count | `content/site.json` → `recentLikedCount` | Filled from starred API |
| Writing post | `content/posts/<slug>.mdx` | Frontmatter required. Home and the Writing pages use `getRenderablePosts()`, so `draft: true` posts appear there (badged `Draft`) in `astro dev` only; RSS, `llms.txt`, redirects and the palette use `getPublishedPosts()` and never include drafts |
| Excalidraw board in a post | `web/diagrams/<name>.json` + `<ExcalidrawBoard src="/diagrams/<name>.json" />` in the MDX | No import needed; see **Excalidraw boards** below |
| GitHub card in a post | `<RepoCard owner="…" repo="…" />` or `<PrCard owner="…" repo="…" number={21} />` in the MDX | No import; plain github.com repo/PR links get hover previews automatically; see **GitHub cards and link previews** |
| Add/remove Toolbox badge | `toolbox.ts` → `toolbox` array | `{ label, color, logo?, logoColor? }` |
| Landing / writing / projects UI | `web/src/` | Lee soft-dark folio; nav Home · Projects · Writing; chrome actions: theme then `@` socials; mood-left / text-right; `HeroMoodShell` island; no on-site avatar |
| Command palette (kbar) | `web/src/components/CommandPalette.astro` | Hidden UI; Cmd/Ctrl+K or `?`; chords `gh`/`gp`/`gw`/`gm` navigate, `tt` toggles theme; boot is tiny, palette chunk lazy-loaded |
| Site-only content | `content/site.json` → `voiceBio`, `moods`, `capabilities` | README loaders ignore these; README shape unchanged |
| OG / Twitter / JSON-LD | `web/src/layouts/BaseLayout.astro` (+ page props) | Default OG image in `web/public`; posts use `og:type=article` |
| RSS / llms.txt | `web/src/pages/rss.xml.ts`, `llms.txt.ts` | Built from content — no stale hand copy in `public/` |
| Regenerate README locally | `GITHUB_TOKEN=… npm run build:readme` | Needs network + token for stats/featured/liked |
| Preview site locally | `npm run dev:web` (from repo root) | Astro binds to `0.0.0.0`; open it at localhost or another reachable interface |
| Build site locally | `npm run build:web` | Output: `web/dist` |
| Regenerate README on GitHub | Actions → **README build** → **Run workflow** | Or push to `master` |
| Deploy site on GitHub | Actions → **Deploy site** → **Run workflow** | Or push `web/` / `content/` to `master` |

## Writing rules

Before writing or editing a post, read `web/BLOG_WRITING_GUIDE.md` (voice, answer-first structure, frontmatter rules, FAQ, callouts, guardrails, pre-publish checklist). There's a short Cursor rule for it in `.cursor/rules/blog-writing.mdc`. Start new posts from `content/posts/draft-template.mdx` (a draft that never ships).

Writing posts follow this section order (frontmatter `title` is the H1; the rest are `##` headings):

1. Title
2. TL;DR
3. What problem I had
4. What I tried
5. What worked
6. What failed
7. Architecture
8. Code
9. Results
10. What I recommend

Keep the order. A short qualifier after a colon is fine (`## What failed: exporting PNGs`); drop a section that has nothing real rather than pad it. Details per section are in `web/BLOG_WRITING_GUIDE.md` §2. `content/posts/how-this-site-works.mdx` is the reference published post in this structure. It replaced the old `on-shared-content` post; `/writing/on-shared-content` redirects to it (`web/astro.config.mjs`).

## Excalidraw boards

Writing posts can embed Excalidraw diagrams. `astro dev` and `astro build` render each scene to SVG with `exportToSvg` before pages render, and the board inlines that SVG. There's no editor canvas, and the browser does not download `@excalidraw/excalidraw`. A control pill (zoom out, %, zoom in, reset, expand) appears on hover or keyboard focus and stays pinned after any control is used, until the pointer has been off the board for ~1.2 s (or the modal closes). Drag pans. Expand shows the same SVG in a modal at ~70% of the viewport that closes on backdrop click, Escape or Close. Dark mode is a CSS `invert(93%) hue-rotate(180deg)` filter on the SVG, so theme switches are instant.

How it fits together:

- **Scenes:** `web/diagrams/<name>.json`. A scene is a full Excalidraw document (`type`, `version`, `elements`, `appState`, `files`). A `.excalidraw` download is already this format; just rename it. The JSON is the source; it is not fetched by the browser or copied to `web/dist/`.
- **Bake:** `web/scripts/bake-diagrams.mjs` calls `registerHooks({ resolve, load })` with hooks from `./excalidraw-loader.mjs` and only then imports `@excalidraw/excalidraw`. The loader uses the synchronous `node:module` `registerHooks()` API (Node 26 in `.nvmrc` / GitHub Pages / CI, `engines.node >=22.23.4`). It turns `.json` imports into modules and `.css` imports into empty modules. The script installs a jsdom `window` / `document` (plus `DOMParser`, `XMLSerializer`, `SVGElement`, `HTMLElement`, `navigator`) and calls `exportToSvg` with `exportBackground: false`, `exportWithDarkMode: false`, `viewBackgroundColor: 'transparent'`, `exportPadding: 16`, and `skipInliningFonts: true`. Output is `web/.generated/diagrams/<name>.svg`, gitignored. `web/scripts/excalidraw-integration.mjs` runs that bake from `astro:config:setup` on both `dev` and `build`. A scene that fails to export fails the build. No native `canvas` module. `@excalidraw/excalidraw` stays a dependency only for this Node bake.
- **Component:** `web/src/components/ExcalidrawBoard.astro` reads the baked SVG and inlines it for `<ExcalidrawBoard src="/diagrams/<name>.json" />`. A small inline script (MDX does not hoist a processed `<script>`) does pan, zoom, the pill, and the modal. One copy of that script per page.
- **MDX wiring:** `web/src/pages/writing/[slug].astro` passes `components={{ Callout, ExcalidrawBoard, RepoCard, PrCard }}` to `<Content />`, so posts use the tag with no import.
- **Styles:** `.excal-board*`, `.excal-viewport`, `.excal-pill`, `.excal-modal*` in `web/src/styles/global.css`. Full article width, 500px tall (360px on mobile), transparent background, no card frame.
- **Fonts:** the SVG is exported with `skipInliningFonts: true`; text uses the `@font-face` rules for Excalifont and Virgil in `global.css` (files in `web/public/fonts/excalidraw/`). Other Excalidraw fonts fall back to system fonts.

Adding a board:

1. Draw at excalidraw.com in the **light** theme with **dark** strokes and the hand-drawn font (Excalifont, the default). Dark mode inverts colours, so light strokes go faint on the dark site.
2. Main menu → "Save to…" to download the `.excalidraw` file.
3. Save it as `web/diagrams/<name>.json` (kebab-case name).
4. Embed it in the post: `<ExcalidrawBoard src="/diagrams/<name>.json" />`. Optional `height={360}` (number = px).
5. `npm run dev:web` → check both themes, the hover pill and Expand → `npm run build:web`.

Examples: `content/posts/how-this-site-works.mdx` (`board-pipeline.json`, `site-architecture.json`); `draft-template.mdx` uses `example-stack.json`.

Don't:

- Add object storage, remote scene URLs, `ref:` indirection or diff/patch formats. Scenes are static files in the repo.
- Add in-browser editing, saving or a CMS for diagrams. Edits happen in Excalidraw and land by commit.
- Use boards on home, mood or projects pages, or outside Writing posts.
- Put the only copy of essential information in a board. The SVG is in the page, so no-JS readers see the drawing. RSS does not include the board, so the text must still stand on its own.
- Paste large screenshots into scenes; they're stored inline in the JSON as data URLs.
- Import `@excalidraw/excalidraw` (or its CSS) from the Astro component or any client script. The package is only for the Node bake.
- Drop `skipInliningFonts: true`. Inlining pulls a ~1.8 MB font-subsetting chunk and fetches fonts from esm.sh; the self-hosted `@font-face` rules cover it.

## GitHub cards and link previews

Writing posts can show a repository or pull request as a card, and plain github.com links get a small preview on hover. Both are filled in at build time; the browser never calls the GitHub API.

```mdx
<RepoCard owner="rishi23root" repo="rishi23root" />
<PrCard owner="rishi23root" repo="rishi23root" number={21} />
```

- **Data:** `web/src/lib/github.ts` fetches `GET /repos/{owner}/{repo}` and `GET /repos/{owner}/{repo}/pulls/{n}` once per build each (promise cache shared by cards and previews), with `GITHUB_TOKEN` when it's set. The Pages workflow passes the built-in `secrets.GITHUB_TOKEN`; locally it works unauthenticated (60 requests/hour). Any failure (offline, rate limit, 404) logs one warning and the card falls back to a plain labelled link, so the build never fails on GitHub.
- **Cards:** `web/src/components/github/RepoCard.astro` / `PrCard.astro`, sharing `GithubCardBody.astro`: mono eyebrow (Repository · owner / Pull request · owner/repo), stars (hidden at 0) or PR state, title, description or the first paragraph of the PR body, then language or `+adds −dels · files · commits · author · date`. The whole card is a link. No avatars (the site has no on-site avatar).
- **Previews:** `[slug].astro` scans the post's MDX source (`findGithubRefs` in `web/src/lib/githubRefs.ts`, fenced code ignored) and renders `GithubLinkPreviews.astro` only when it finds repo or PR links. That component pre-renders one `<template>` per link with the same card body, plus a ~2.7 KB inline script: hover with a mouse (280 ms delay) or keyboard focus opens it under the link; leaving, blur or Escape closes it; it stays open while the pointer is on it. Touch devices just follow the link. Cards themselves never get previews.
- **Styles:** `.gh-card*` and `.gh-pop` in `web/src/styles/global.css`.

Don't:

- Call the GitHub API from the browser, or ship a token to the client.
- Make a build fail because GitHub is unreachable; keep the null fallback.
- Add avatars, OG images or other remote images to cards.

## SEO / frontmatter cheat (canonical site)

`https://rishi23root.in` is the **canonical source** for branding and writing. Syndicated copies elsewhere should point back here (canonical / OG / RSS / `llms.txt`).

Post frontmatter (`content/posts/*.mdx`):

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | Page `<title>` + OG/Twitter title stem |
| `summary` | yes | Meta description + OG/Twitter description + RSS/llms one-liner (keep cite-able, one sentence) |
| `date` | yes | `article:published_time` + BlogPosting `datePublished` |
| `slug` | yes | URL path `/writing/<slug>` |
| `draft` | no | Default `false`; `true` hides from site, RSS, llms, README inject |
| `image` | no | Path or absolute URL for OG/Twitter; falls back to `cover`, then `/og-default.png` |
| `author`, `updated`, `tags`, `primaryKeyword`, `secondaryKeywords`, `seoTitle`, `cover`, `faq` | no | See `web/BLOG_WRITING_GUIDE.md`; `slug` must equal the file name (build fails otherwise) |

Site-wide SEO lives in `web/src/layouts/BaseLayout.astro` (`og:site_name`, absolute `og:image` / Twitter `summary_large_image`, RSS `rel=alternate`). Feeds: `/rss.xml`, generated `/llms.txt`, `robots.txt` (+ AI crawler Allows), sitemap via `@astrojs/sitemap`.

## Placeholders & inject markers

**Text (braces):** `{USERNAME_HERE}`, `{shortBio}`, `{fullDescription}`, `{stackLine}`

**Inject comments:** `mottos_inject`, `GH_STATS_NODE`, `opensource_dashboard:active`, `recent_posts_inject`, `recent_star_inject`, `toolbox_inject`, `contact_inject`

## Do not

- Add cron / schedule, footer clocks, metrics/lowlighter, languages graphs, or PAT-only workflows
- Break the fenced ```bash whoami / `$ echo $STACK` / `$ stats` block (no markdown bold / inline `$` titles there)
- Scatter shield HTML back into the template — keep badges in `toolbox.ts`
- Change visual layout unless the user asks
- Add admin / CRM / auth / DB in this repo phase

## Setup pointer

Human setup steps: `SETUP.md`.
