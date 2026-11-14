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
| `.github/workflows/build.yml` | README: on-demand `push` to `master` + `workflow_dispatch` |
| `.github/workflows/pages.yml` | Site: build `web/` → GitHub Pages (`rishi23root.in`) |

Flow: edit `content/` / toolbox / template → `GITHUB_TOKEN=… npm run build:readme` → commit `README.md` (or let Actions rebuild on `master`). Site: edit `content/` or `web/` → `npm run build:web` (or Pages workflow on `master`).

## Common edits (cheat sheet)

| Change | Where | Notes |
| --- | --- | --- |
| Bio / description / `$STACK` line | `content/site.json` → `shortBio`, `fullDescription`, `stackLine` | Keep whoami inside the ```bash fence |
| Mottos | `content/site.json` → `mottos` | Rendered as 「samp」 |
| Socials / email / site URL | `content/site.json` → `contact`, `siteUrl` | Bottom text links (not icons) |
| Featured Work | `content/site.json` → `opensource.active` + `blurbs` | `owner/repo` strings |
| Recently liked count | `content/site.json` → `recentLikedCount` | Filled from starred API |
| Writing post | `content/posts/<slug>.mdx` | Frontmatter required; skip `draft: true` in public lists (see SEO cheat below) |
| Add/remove Toolbox badge | `toolbox.ts` → `toolbox` array | `{ label, color, logo?, logoColor? }` |
| Landing / writing UI | `web/src/` | Lee soft-dark folio; left wordmark; mood-left / text-right; `HeroMoodShell` island; no on-site avatar |
| Site-only content | `content/site.json` → `voiceBio`, `moods`, `projects`, `capabilities` | README loaders ignore these; README shape unchanged |
| OG / Twitter / JSON-LD | `web/src/layouts/BaseLayout.astro` (+ page props) | Default OG image in `web/public`; posts use `og:type=article` |
| RSS / llms.txt | `web/src/pages/rss.xml.ts`, `llms.txt.ts` | Built from content — no stale hand copy in `public/` |
| Regenerate README locally | `GITHUB_TOKEN=… npm run build:readme` | Needs network + token for stats/featured/liked |
| Preview site locally | `npm run dev:web` (from repo root) | Serves Astro at localhost |
| Build site locally | `npm run build:web` | Output: `web/dist` |
| Regenerate README on GitHub | Actions → **README build** → **Run workflow** | Or push to `master` |
| Deploy site on GitHub | Actions → **Deploy site** → **Run workflow** | Or push `web/` / `content/` to `master` |

## Writing rules

Before writing or editing a post, read `web/BLOG_WRITING_GUIDE.md` (voice, answer-first structure, frontmatter rules, FAQ, callouts, guardrails, pre-publish checklist). There's a short Cursor rule for it in `.cursor/rules/blog-writing.mdc`. Start new posts from `content/posts/post-template.mdx` (a draft that never ships).

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
