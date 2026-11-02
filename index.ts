import axios from 'axios'
import { readFile, rm, writeFile } from 'fs/promises'
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
} from './config'
import { renderToolbox } from './toolbox'

/** HTML comment markers in readme.template.md replaced at build time. */
const inject = {
  OPENSOURCE: 'opensource_dashboard:active',
  RECENT_STAR: 'recent_star_inject',
  MOTTOS: 'mottos_inject',
  GH_STATS: 'GH_STATS_NODE',
  TOOLBOX: 'toolbox_inject',
  CONTACT: 'contact_inject',
} as const

raxAttach()
axios.defaults.raxConfig = {
  retry: 5,
  retryDelay: 4000,
  onRetryAttempt: (err) => {
    const cfg = raxGetConfig(err)
    console.log('request: \n', err.request)
    console.log(`Retry attempt #${cfg?.currentRetryAttempt}`)
  },
}

axios.defaults.headers.common['User-Agent'] =
  'Mozilla/5.0 (compatible; rishi23root-readme-build)'

const githubHeaders: Record<string, string> = {
  Accept: 'application/vnd.github+json',
}
if (process.env.GITHUB_TOKEN) {
  githubHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
}

const githubReq = axios.create({
  baseURL: 'https://api.github.com',
  timeout: 10000,
  headers: githubHeaders,
})

type GHItem = {
  name: string
  id: number
  full_name: string
  description: string | null
  html_url: string
  stargazers_count?: number
}

function marker(token: (typeof inject)[keyof typeof inject]) {
  return `<!-- ${token} -->`
}

function escapeMd(text: string) {
  return text.replace(/\r?\n/g, ' ').trim()
}

/** Innei-style: **[name](url)** — blurb ★stars */
function featuredMarkdown(list: GHItem[], blurbs: Record<string, string>) {
  return list
    .map((cur) => {
      const blurb =
        blurbs[cur.full_name] ||
        (cur.description ? escapeMd(cur.description) : '')
      const desc = blurb ? ` — ${blurb}` : ''
      const stars =
        typeof cur.stargazers_count === 'number'
          ? ` ★${cur.stargazers_count}`
          : ''
      return `- **[${cur.full_name}](${cur.html_url})**${desc}${stars}`
    })
    .join('\n')
}

function likedMarkdown(item: GHItem) {
  const desc = item.description ? ` — ${escapeMd(item.description)}` : ''
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
    `<a href="${socials.x}">X</a>`,
    `<a href="${socials.linkedin}">LinkedIn</a>`,
    `<a href="${socials.github}">GitHub</a>`,
    `<a href="${socials.pypi}">PyPI</a>`,
  ]
  return `<p align="center">\n  ${links.join(' ·\n  ')}\n</p>`
}

function renderMottos(): string {
  return `<p align="center">\n  ${mottos
    .map((line) => `「<strong><samp>${line}</samp></strong>」`)
    .join(' · ')}\n</p>`
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
    out = out.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }

  out = out.replace(marker(inject.MOTTOS), renderMottos())
  out = out.replace(marker(inject.TOOLBOX), renderToolbox())
  out = out.replace(marker(inject.CONTACT), renderContact())

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
    `${formatCount(commits)} commits · ${formatCount(prs)} PRs · ${formatCount(issues)} issues`,
  )

  const featured = await Promise.all(
    opensource.active.map((name) =>
      githubReq.get<GHItem>('/repos/' + name).then((r) => r.data),
    ),
  )
  out = out.replace(
    marker(inject.OPENSOURCE),
    featuredMarkdown(featured, opensource.blurbs),
  )

  const starred: GHItem[] = await githubReq
    .get('/users/' + user + '/starred', {
      params: { per_page: recentLikedCount },
    })
    .then((r) => r.data)

  out = out.replace(
    marker(inject.RECENT_STAR),
    starred.slice(0, recentLikedCount).map(likedMarkdown).join('\n'),
  )

  await rm('./README.md', { force: true })
  await writeFile('./README.md', out, { encoding: 'utf-8' })
}

main()
