# Setup

1. Clone the repo.
2. Repo **Settings → Actions → General**: allow GitHub Actions read and write permissions (needed for the README build to commit).
3. Edit `config.ts` / `toolbox.ts` (see `AGENTS.md`), push to `master` — or run **Actions → README build → Run workflow**.
4. Local test: `npm install` then `GITHUB_TOKEN=… npm run build`.

README rebuild is **on-demand only** (`push` to `master` + `workflow_dispatch`). No schedule/cron.

Uses the automatic `GITHUB_TOKEN` — no extra secrets.

---

Fork credit: [Innei/Innei](https://github.com/Innei/Innei)
