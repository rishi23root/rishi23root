# Agent guide — profile README

Generate `README.md` from `readme.template.md` + `config.ts` + `toolbox.ts` via `index.ts`. Prefer small, on-demand edits; rebuild; push. Do not reinvent the layout.

## Architecture (skim)

| Piece | Role |
| --- | --- |
| `config.ts` | Bio, mottos, stack line, Featured Work, socials, liked count |
| `toolbox.ts` | Flat shields.io badge list + `renderToolbox()` |
| `readme.template.md` | Static layout + `<!-- … -->` inject markers / `{placeholders}` |
| `index.ts` | Fetches GitHub data, fills template → writes `README.md` |
| `.github/workflows/build.yml` | On-demand only: `push` to `master` + `workflow_dispatch` |

Flow: edit config/toolbox/template → `GITHUB_TOKEN=… npm run build` → commit `README.md` (or let Actions rebuild on `master`).

## Common edits (cheat sheet)

| Change | Where | Notes |
| --- | --- | --- |
| Bio / description / `$STACK` line | `config.ts` → `shortBio`, `fullDescription`, `stackLine` | Keep whoami inside the ```bash fence |
| Mottos | `config.ts` → `mottos` | Rendered as 「samp」 |
| Socials / email | `config.ts` → `contact` | Bottom text links (not icons) |
| Featured Work | `config.ts` → `opensource.active` + `blurbs` | `owner/repo` strings |
| Recently liked count | `config.ts` → `recentLikedCount` | Filled from starred API |
| Add/remove Toolbox badge | `toolbox.ts` → `toolbox` array | `{ label, color, logo?, logoColor? }` |
| Regenerate README locally | `GITHUB_TOKEN=… npm run build` | Needs network + token for stats/featured/liked |
| Regenerate on GitHub | Actions → **README build** → **Run workflow** | Or push to `master` |

## Placeholders & inject markers

**Text (braces):** `{USERNAME_HERE}`, `{shortBio}`, `{fullDescription}`, `{stackLine}`

**Inject comments:** `mottos_inject`, `GH_STATS_NODE`, `opensource_dashboard:active`, `recent_star_inject`, `toolbox_inject`, `contact_inject`

## Do not

- Add cron / schedule, footer clocks, metrics/lowlighter, languages graphs, or PAT-only workflows
- Break the fenced ```bash whoami / `$ echo $STACK` / `$ stats` block (no markdown bold / inline `$` titles there)
- Scatter shield HTML back into the template — keep badges in `toolbox.ts`
- Change visual layout unless the user asks

## Setup pointer

Human setup steps: `SETUP.md`.
