# Setup

1. Clone the repo.
2. Repo **Settings → Actions → General**: allow GitHub Actions read and write permissions (needed for the README build to commit).
3. Edit `config.ts` (bio, opensource list), push to `master`.
4. Local test: `npm install` then `GITHUB_TOKEN=… npm run build`.

README build uses the automatic `GITHUB_TOKEN` — no extra secrets.

---

Fork credit: [Innei/Innei](https://github.com/Innei/Innei)
