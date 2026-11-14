/**
 * Build-time GitHub data for <RepoCard>, <PrCard> and link hover previews.
 * One request per repo/PR per build (promise cache); GITHUB_TOKEN is used when set.
 * Failures resolve to null so a rate limit or offline build never breaks the site.
 */

import { githubUrl, refKey, type GithubRef } from './githubRefs'

export type RepoData = {
  kind: 'repo'
  owner: string
  repo: string
  url: string
  description: string | null
  stars: number
  language: string | null
  languageColor: string | null
}

type PrState = 'open' | 'draft' | 'merged' | 'closed'

export type PrData = {
  kind: 'pr'
  owner: string
  repo: string
  number: number
  url: string
  title: string
  state: PrState
  author: string
  date: string
  excerpt: string | null
  additions: number
  deletions: number
  files: number
  commits: number
}

const API = 'https://api.github.com'
const cache = new Map<string, Promise<unknown>>()
let warned = false

// GitHub's linguist colours for the languages likely to show up here.
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Go: '#00ADD8',
  Rust: '#dea584',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#663399',
  SCSS: '#c6538c',
  Astro: '#ff5a03',
  MDX: '#fcb32c',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Dart: '#00B4AB',
  Ruby: '#701516',
  PHP: '#4F5D95',
  'Jupyter Notebook': '#DA5B0B',
  Dockerfile: '#384d54',
}

export function getRepo(owner: string, repo: string): Promise<RepoData | null> {
  const ref: GithubRef = { kind: 'repo', owner, repo }
  return cached(ref, async () => {
    const r = await api<any>(`/repos/${owner}/${repo}`)
    if (!r) return null
    return {
      kind: 'repo',
      owner: r.owner?.login ?? owner,
      repo: r.name ?? repo,
      url: r.html_url ?? githubUrl(ref),
      description: r.description ?? null,
      stars: r.stargazers_count ?? 0,
      language: r.language ?? null,
      languageColor: r.language ? LANGUAGE_COLORS[r.language] ?? null : null,
    }
  })
}

export function getPr(owner: string, repo: string, number: number): Promise<PrData | null> {
  const ref: GithubRef = { kind: 'pr', owner, repo, number }
  return cached(ref, async () => {
    const p = await api<any>(`/repos/${owner}/${repo}/pulls/${number}`)
    if (!p) return null
    const state: PrState = p.merged_at ? 'merged' : p.state === 'closed' ? 'closed' : p.draft ? 'draft' : 'open'
    return {
      kind: 'pr',
      owner,
      repo,
      number,
      url: p.html_url ?? githubUrl(ref),
      title: p.title ?? `Pull request #${number}`,
      state,
      author: p.user?.login ?? '',
      date: p.merged_at ?? p.created_at ?? '',
      excerpt: excerpt(p.body),
      additions: p.additions ?? 0,
      deletions: p.deletions ?? 0,
      files: p.changed_files ?? 0,
      commits: p.commits ?? 0,
    }
  })
}

/** Preview data for a post's repo/PR links, keyed by `refKey`; refs that fail to load are left out. */
export async function getLinkPreviews(refs: GithubRef[]): Promise<Record<string, RepoData | PrData>> {
  const load = (ref: GithubRef) => (ref.kind === 'pr' ? getPr(ref.owner, ref.repo, ref.number) : getRepo(ref.owner, ref.repo))
  const entries = await Promise.all(refs.map(async (ref) => [refKey(ref), await load(ref)] as const))
  return Object.fromEntries(entries.filter((e): e is readonly [string, RepoData | PrData] => e[1] != null))
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n).toLowerCase()
}

export function formatShortDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function cached<T>(ref: GithubRef, load: () => Promise<T>): Promise<T> {
  const key = refKey(ref)
  if (!cache.has(key)) cache.set(key, load())
  return cache.get(key) as Promise<T>
}

async function api<T>(path: string): Promise<T | null> {
  const token = process.env.GITHUB_TOKEN
  try {
    const res = await fetch(API + path, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'rishi23root-site',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return (await res.json()) as T
  } catch (err) {
    if (!warned) {
      warned = true
      console.warn(`[github] ${path}: ${(err as Error).message}; cards fall back to plain links`)
    }
    return null
  }
}

/** First prose paragraph of a PR body as plain text, about two lines long. */
function excerpt(body: unknown, max = 180): string | null {
  if (typeof body !== 'string') return null
  const text = body
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]+>/g, '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p && !/^(#|[-*] |\||!\[)/.test(p))
  if (!text) return null
  const plain = text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (plain.length <= max) return plain
  return plain.slice(0, plain.lastIndexOf(' ', max)).replace(/[,.;:]$/, '') + '…'
}
