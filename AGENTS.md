# Agent guide — profile README + static site

Generate `README.md` from `readme.template.md` + `content/site.json` (via `config.ts`) + `toolbox.ts` via `index.ts`. Static landing/blog lives in `web/` and reads the same `content/`. Prefer small, on-demand edits; rebuild; push. Do not reinvent the layout.

## Architecture (skim)

| Piece | Role |
| --- | --- |
| `content/site.json` | Bio, mottos, stack line, Featured Work, socials, liked count, site URL |
| `content/posts/*.mdx` | Blog posts (`title`, `date`, `slug`, `summary`, `draft?`) |
| `config.ts` | Thin re-exports from `content/site.json` for the README build |
| `posts.ts` | Lists posts + renders README “Writing” markdown |
| `toolbox.ts` | Flat shields.io badge list + `renderToolbox()` |
| `readme.template.md` | Static layout + `<!-- … -->` inject markers / `{placeholders}` |
| `index.ts` | Fetches GitHub data, fills template → writes `README.md` |
| `web/` | Astro static site (landing, `/blog`, SEO) → `web/dist` |
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
| Blog post | `content/posts/<slug>.mdx` | Frontmatter required; skip `draft: true` in public lists |
| Add/remove Toolbox badge | `toolbox.ts` → `toolbox` array | `{ label, color, logo?, logoColor? }` |
| Landing / blog UI | `web/src/` | Placeholder UI for now; keep sparse |
| Regenerate README locally | `GITHUB_TOKEN=… npm run build:readme` | Needs network + token for stats/featured/liked |
| Preview site locally | `npm run dev:web` (from repo root) | Serves Astro at localhost |
| Build site locally | `npm run build:web` | Output: `web/dist` |
| Regenerate README on GitHub | Actions → **README build** → **Run workflow** | Or push to `master` |
| Deploy site on GitHub | Actions → **Deploy site** → **Run workflow** | Or push `web/` / `content/` to `master` |

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
