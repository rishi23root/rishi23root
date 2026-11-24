import axios from 'axios'
import { readFile, writeFile } from 'fs/promises'
import { attach as raxAttach, getConfig as raxGetConfig } from 'retry-axios'
import {
  github,
  contact,
  mottos,
  shortBio,
  fullDescription,
  stackLine,
  opensource,
  recentLikedCount,
  siteUrl,
} from './config'
import { escapeMd, renderRecentPosts } from './posts'
import { renderToolbox } from './toolbox'

export { escapeMd }

/** HTML comment markers in readme.template.md replaced at build time. */
const inject = {
  OPENSOURCE: 'opensource_dashboard:active',
  RECENT_STAR: 'recent_star_inject',
  RECENT_POSTS: 'recent_posts_inject',
  MOTTOS: 'mottos_inject',
  GH_STATS: 'GH_STATS_NODE',
  TOOLBOX: 'toolbox_inject',
  CONTACT: 'contact_inject',
} as const

const githubHeaders: Record<string, string> = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'Mozilla/5.0 (compatible; rishi23root-readme-build)',
}
if (process.env.GITHUB_TOKEN) {
  githubHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
}

export const githubReq = axios.create({
  baseURL: 'https://api.github.com',
  timeout: 10000,
  headers: githubHeaders,
})

githubReq.defaults.raxConfig = {
  retry: 5,
  onRetryAttempt: async (err) => {
    const cfg = raxGetConfig(err)
    const url = err.config?.url ?? 'unknown'
    const status = err.response?.status ?? err.code ?? 'network error'
    console.warn(
      `GitHub API retry #${cfg?.currentRetryAttempt ?? 1} for ${url} (${status})`,
    )
  },
}
raxAttach(githubReq)

export type GHItem = {
  full_name: string
  description: string | null
  html_url: string
  stargazers_count?: number
}

function marker(token: (typeof inject)[keyof typeof inject]) {
  return `<!-- ${token} -->`
}

/** Innei-style: **[name](url)** — blurb ★stars */
export function featuredMarkdown(list: GHItem[], blurbs: Record<string, string>) {
  return list
    .map((cur) => {
      const rawBlurb = blurbs[cur.full_name] || cur.description || ''
      const blurb = rawBlurb ? escapeMd(rawBlurb) : ''
      const desc = blurb ? ` — ${blurb}` : ''
      const stars =
        typeof cur.stargazers_count === 'number' && cur.stargazers_count > 0
          ? ` ★${cur.stargazers_count}`
          : ''
      return `- **[${cur.full_name}](${cur.html_url})**${desc}${stars}`
    })
    .join('\n')
}

const LIKED_DESC_MAX = 100

function truncateDescription(text: string, max = LIKED_DESC_MAX): string {
  const clean = text.replace(/\r?\n+/g, ' ').trim()
  if (clean.length <= max) return clean
  const slice = clean.slice(0, max)
  if (/\s/.test(clean[max])) return `${slice.trimEnd()}…`
  const cut = slice.lastIndexOf(' ')
  return `${(cut > 0 ? slice.slice(0, cut) : slice).trimEnd()}…`
}

export function likedMarkdown(item: GHItem) {
  const desc = item.description
    ? ` — ${escapeMd(truncateDescription(item.description))}`
    : ''
  return `- [${item.full_name}](${item.html_url})${desc}`
}

/** 1900 → "1.9k"; small counts stay plain. */
function formatCount(n: number): string {
  if (n < 1000) return String(n)
  return `${Math.round(n / 100) / 10}k`
}

async function searchCount(
  path: string,
  headers?: Record<string, string>,
): Promise<number> {
  const res = await githubReq.get<{ total_count: number }>(path, { headers })
  return res.data.total_count
}

function renderContact(): string {
  const { email, socials } = contact
  const links = [
    `<a href="mailto:${email}">Email</a>`,
    `<a href="${socials.website}">Website</a>`,
    `<a href="${socials.x}">X</a>`,
    `<a href="${socials.linkedin}">LinkedIn</a>`,
    `<a href="${socials.github}">GitHub</a>`,
    `<a href="${socials.pypi}">PyPI</a>`,
  ]
  // Light vertical space so bottom socials stay readable against Toolbox.
  return `<br />\n\n<p align="center">\n  ${links.join(' ·\n  ')}\n</p>\n\n<br />`
}

function renderMottos(): string {
  return `<p align="center">\n  ${mottos
    .map((line) => `「<strong><samp>${line}</samp></strong>」`)
    .join(' · ')}\n</p>`
}

export async function fetchFeaturedRepos(
  names: string[],
  blurbs: Record<string, string>,
): Promise<GHItem[]> {
  const results = await Promise.allSettled(
    names.map((name) =>
      githubReq.get<GHItem>('/repos/' + name).then((r) => r.data),
    ),
  )

  return results.map((result, idx) => {
    const name = names[idx]
    if (result.status === 'fulfilled') return result.value
    const status = axios.isAxiosError(result.reason)
      ? (result.reason.response?.status ??
        result.reason.code ??
        result.reason.message)
      : String(result.reason)
    console.warn(
      `Failed to fetch featured repo ${name} (${status}); using fallback`,
    )
    return {
      full_name: name,
      html_url: `https://github.com/${name}`,
      description: blurbs[name] ?? null,
    }
  })
}

export function filterStarredRepos(
  starred: GHItem[],
  user: string,
  limit: number,
  exclude: string[] = [],
): GHItem[] {
  const selfPrefix = `${user.toLowerCase()}/`
  const excluded = new Set(exclude.map((name) => name.toLowerCase()))
  return starred
    .filter((item) => {
      const lower = item.full_name.toLowerCase()
      return !lower.startsWith(selfPrefix) && !excluded.has(lower)
    })
    .slice(0, limit)
}

async function main() {
  let out = await readFile('./readme.template.md', { encoding: 'utf-8' })

  const text: Record<string, string> = {
    USERNAME_HERE: github.name,
    shortBio,
    fullDescription,
    stackLine,
  }
  for (const [key, value] of Object.entries(text)) {
    out = out.replace(new RegExp(`\\{${key}\\}`, 'g'), () => value)
  }

  out = out.replace(marker(inject.MOTTOS), () => renderMottos())
  out = out.replace(marker(inject.TOOLBOX), () => renderToolbox())
  out = out.replace(marker(inject.CONTACT), () => renderContact())
  const recentPosts = await renderRecentPosts(siteUrl, 5)
  out = out.replace(marker(inject.RECENT_POSTS), () => recentPosts)

  const user = github.name
  const [commits, prs, issues] = await Promise.all([
    searchCount(`/search/commits?q=author:${user}`, {
      Accept: 'application/vnd.github.cloak-preview',
    }),
    searchCount(`/search/issues?q=is:pr+author:${user}`),
    searchCount(`/search/issues?q=is:issue+author:${user}`),
  ])

  out = out.replace(
    marker(inject.GH_STATS),
    () =>
      `${formatCount(commits)} commits · ${formatCount(prs)} PRs · ${formatCount(issues)} issues`,
  )

  const featured = await fetchFeaturedRepos(opensource.active, opensource.blurbs)
  out = out.replace(marker(inject.OPENSOURCE), () =>
    featuredMarkdown(featured, opensource.blurbs),
  )

  const starred: GHItem[] = await githubReq
    .get<GHItem[]>('/users/' + user + '/starred', {
      params: { per_page: Math.min(100, recentLikedCount + 10 + opensource.active.length) },
    })
    .then((r) => r.data)

  const recentStarred = filterStarredRepos(
    starred,
    user,
    recentLikedCount,
    opensource.active,
  )
  out = out.replace(marker(inject.RECENT_STAR), () =>
    recentStarred.map(likedMarkdown).join('\n'),
  )

  await writeFile('./README.md', out, { encoding: 'utf-8' })
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
}
