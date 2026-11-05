# Setup

1. Clone the repo.
2. Repo **Settings → Actions → General**: allow GitHub Actions read and write permissions (needed for the README build to commit).
3. Repo **Settings → Pages**: Source = **GitHub Actions**. Custom domain = `rishi23root.in` (CNAME ships in `web/public/CNAME`).
4. Edit `content/site.json`, `content/posts/`, or `toolbox.ts` (see `AGENTS.md`), push to `master` — or run **Actions → README build** / **Deploy site**.
5. Local README: `npm install` then `GITHUB_TOKEN=… npm run build:readme`.
6. Local site: `cd web && npm install && npm run dev` (or from root: `npm run build:web` after installing under `web/`).

README rebuild is **on-demand only** (`push` to `master` + `workflow_dispatch`). No schedule/cron. Site deploy is the same model via **Deploy site**.

Uses the automatic `GITHUB_TOKEN` — no extra secrets.

---

Fork credit: [Innei/Innei](https://github.com/Innei/Innei)
