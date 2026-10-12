# Setup

1. Clone the repo.
2. Repo **Settings → Actions → General**: allow GitHub Actions to create and approve pull requests / read and write permissions (needed for README + metrics commits).
3. Edit `config.ts` (bio, opensource list), push to `master`.
4. Local test: `npm install` then `GITHUB_TOKEN=… npm run build`.

## Metrics (`METRICS_TOKEN`)

The languages SVG (`.github/workflows/metrics.yml` → `assets/languages.svg`) needs a **Personal Access Token** stored as repo secret `METRICS_TOKEN`.

Default `GITHUB_TOKEN` is **not** enough for lowlighter/metrics user/language queries.

1. Create a classic PAT: GitHub → Settings → Developer settings → Personal access tokens.
   - For public repos only: `public_repo` (or no scopes if you only need public profile data — add `public_repo` if commit/plugin access fails).
2. Repo → Settings → Secrets and variables → Actions → New repository secret:
   - Name: `METRICS_TOKEN`
   - Value: the PAT
3. Actions → **Metrics** → Run workflow (or wait for the daily cron / push to `master`).

README build uses the automatic `GITHUB_TOKEN` only — no extra secret.

---

Fork credit: [Innei/Innei](https://github.com/Innei/Innei)
