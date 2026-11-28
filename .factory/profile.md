# Factory profile

> Repo-specific factory config. Lives in `.factory/` so an agent-skills update never touches it.
> `docs/agents/factory.md` (where the skills look) is a relative symlink to this file.

## Project

- **Name:** rishi23root
- **One line:** GitHub profile README generator plus the Astro site at rishi23root.in
- **Default branch:** master

## Where things are

- **Spec:** `AGENTS.md`; per-task specs as `SPEC.md` on the task branch
- **Glossary:** none
- **Decision records:** none
- **Notes outside the repo:** none
- **Docs paths:** `README.md` (generated, do not hand-edit), `AGENTS.md`, `web/BLOG_WRITING_GUIDE.md`
- **Checks folder:** none

## Tracker

- **Kind:** GitHub issues
- **Labels:** defaults (not created yet)

## Commands

| Purpose | Command |
|---|---|
| Install | `npm ci && npm --prefix web ci` (Node 26 per `.nvmrc`; npm 10 rejects `web/package-lock.json`) |
| Type check | `npm run check` |
| Lint | none |
| Unit tests | `npm test` |
| Full suite | `npm run check && npm test && npm run build:web` (what CI runs) |
| Run the app | `npm run dev:web` |
| Run the app on another port | `npm run dev:web -- --port <n>` |
| Build | `npm run build:web` (site), `GITHUB_TOKEN=… npm run build:readme` (README) |

## Rules for this repository

- **Never touch:** `README.md` by hand (generated); the `Do not` list in `AGENTS.md`
- **High risk here:** `.github/workflows/*`, `web/astro.config.mjs` redirects
- **Merge method:** merge commit
- **Release note:** merge to `master` deploys the site (Pages) and rebuilds the README

## Fleet

- **Mode:** pilot. Only the owner changes this line
- **Families:** manager Anthropic, builders Anthropic, reviewers OpenAI (Codex)
- **Machines that may run workers:** backroom
- **Ports and local databases:** dev server 4321; a second builder uses `--port 4322`. No database
- **Council models:** none
