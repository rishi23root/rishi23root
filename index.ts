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
import comments from './constants'

const githubAPIEndPoint = 'https://api.github.com'

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

const userAgent =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36'

axios.defaults.headers.common['User-Agent'] = userAgent

const githubHeaders: Record<string, string> = {
  Accept: 'application/vnd.github+json',
}
if (process.env.GITHUB_TOKEN) {
  githubHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
}

const githubReq = axios.create({
  baseURL: githubAPIEndPoint,
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

function escapeMd(text: string) {
  return text.replace(/\r?\n/g, ' ').trim()
}

/** Innei-style: **[name](url)** — blurb ★stars */
function generateFeaturedWorkMarkdown(
  list: GHItem[],
  blurbs: Record<string, string>,
) {
  return list
    .map((cur) => {
      const blurb =
        blurbs[cur.full_name] ||
        (cur.description ? escapeMd(cur.description) : '')
      const desc = blurb ? ` — ${blurb}` : ''
      const stars =
        typeof cur.stargazers_count === 'number' ? ` ★${cur.stargazers_count}` : ''
      return `- **[${cur.full_name}](${cur.html_url})**${desc}${stars}`
    })
    .join('\n')
}

function generateRepoMarkdown(item: GHItem) {
  const desc = item.description ? ` — ${escapeMd(item.description)}` : ''
  return `- [${item.full_name}](${item.html_url})${desc}`
}

async function getTotalStars(username: string): Promise<number> {
  let stars = 0
  let page = 1
  while (true) {
    const res = await githubReq.get<GHItem[]>(`/users/${username}/repos`, {
      params: { per_page: 100, page, type: 'owner' },
    })
    if (res.data.length === 0) break
    stars += res.data.reduce((acc, repo) => acc + (repo.stargazers_count || 0), 0)
    page++
  }
  return stars
}

async function getTotalCommits(username: string): Promise<number> {
  const year = new Date().getFullYear()
  const res = await githubReq.get<{ total_count: number }>(
    `/search/commits?q=author:${username}+author-date:${year}-01-01..${year}-12-31`,
    {
      headers: {
        Accept: 'application/vnd.github.cloak-preview',
      },
    },
  )
  return res.data.total_count
}

async function getTotalPRs(username: string): Promise<number> {
  const res = await githubReq.get<{ total_count: number }>(
    `/search/issues?q=is:pr+author:${username}`,
  )
  return res.data.total_count
}

async function getTotalIssues(username: string): Promise<number> {
  const res = await githubReq.get<{ total_count: number }>(
    `/search/issues?q=is:issue+author:${username}`,
  )
  return res.data.total_count
}

async function getFollowers(username: string): Promise<number> {
  const res = await githubReq.get<{ followers: number }>(`/users/${username}`)
  return res.data.followers
}

async function getTotalReviews(username: string): Promise<number> {
  const res = await githubReq.get<{ total_count: number }>(
    `/search/issues?q=is:pr+reviewed-by:${username}`,
  )
  return res.data.total_count
}

async function getTotalRepos(username: string): Promise<number> {
  const res = await githubReq.get<{ public_repos: number }>(`/users/${username}`)
  return res.data.public_repos
}

function erf(x: number): number {
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  let sign = 1
  if (x < 0) sign = -1
  x = Math.abs(x)

  const t = 1.0 / (1.0 + p * x)
  const y =
    1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

  return sign * y
}

function exponential_cdf(x: number): number {
  if (x < 0) return 0
  return 1 - 2 ** -x
}

function log_normal_cdf(x: number): number {
  if (x < 0) return 0
  return erf(Math.log(x) / Math.sqrt(2))
}

/** Innei / github-readme-stats style rank from activity stats. */
function calculateRank({
  all_commits,
  commits,
  prs,
  issues,
  reviews,
  repos: _repos,
  stars,
  followers,
}: {
  all_commits: boolean
  commits: number
  prs: number
  issues: number
  reviews: number
  repos: number
  stars: number
  followers: number
}): { level: string; percentile: number } {
  const COMMITS_MEDIAN = all_commits ? 1000 : 250
  const COMMITS_WEIGHT = 2
  const PRS_MEDIAN = 50
  const PRS_WEIGHT = 3
  const ISSUES_MEDIAN = 25
  const ISSUES_WEIGHT = 1
  const REVIEWS_MEDIAN = 2
  const REVIEWS_WEIGHT = 1
  const STARS_MEDIAN = 50
  const STARS_WEIGHT = 4
  const FOLLOWERS_MEDIAN = 10
  const FOLLOWERS_WEIGHT = 1

  const TOTAL_WEIGHT =
    COMMITS_WEIGHT +
    PRS_WEIGHT +
    ISSUES_WEIGHT +
    REVIEWS_WEIGHT +
    STARS_WEIGHT +
    FOLLOWERS_WEIGHT

  const THRESHOLDS = [1, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100]
  const LEVELS = ['S', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C']

  const rank =
    1 -
    (COMMITS_WEIGHT * exponential_cdf(commits / COMMITS_MEDIAN) +
      PRS_WEIGHT * exponential_cdf(prs / PRS_MEDIAN) +
      ISSUES_WEIGHT * exponential_cdf(issues / ISSUES_MEDIAN) +
      REVIEWS_WEIGHT * exponential_cdf(reviews / REVIEWS_MEDIAN) +
      STARS_WEIGHT * log_normal_cdf(stars / STARS_MEDIAN) +
      FOLLOWERS_WEIGHT * log_normal_cdf(followers / FOLLOWERS_MEDIAN)) /
      TOTAL_WEIGHT

  const level = LEVELS[THRESHOLDS.findIndex((t) => rank * 100 <= t)]

  return { level, percentile: rank * 100 }
}

async function main() {
  const template = await readFile('./readme.template.md', { encoding: 'utf-8' })
  let newContent = template

  newContent = newContent
    .replace(/{USERNAME_HERE}/gm, github.name)
    .replace(/{shortBio}/gm, shortBio)
    .replace(/{fullDescription}/gm, fullDescription)
    .replace(/{stackLine}/gm, stackLine)
    .replace(/{EMAIL}/gm, contact.email)
    .replace(/{X_URL}/gm, contact.socials.x)
    .replace(/{LINKEDIN_URL}/gm, contact.socials.linkedin)
    .replace(/{GITHUB_URL}/gm, contact.socials.github)
    .replace(/{PYPI_URL}/gm, contact.socials.pypi)

  newContent = newContent.replace(
    gitCommit('MOTTOS'),
    `<p align="center">\n  ${mottos
      .map((line) => `「<strong><samp>${line}</samp></strong>」`)
      .join(' · ')}\n</p>`,
  )

  const username = github.name
  const [stars, commits, prs, issues, followers, reviews, repos] =
    await Promise.all([
      getTotalStars(username),
      getTotalCommits(username),
      getTotalPRs(username),
      getTotalIssues(username),
      getFollowers(username),
      getTotalReviews(username),
      getTotalRepos(username),
    ])

  const rank = calculateRank({
    stars,
    commits,
    prs,
    issues,
    reviews,
    repos,
    all_commits: false,
    followers,
  })

  newContent = newContent.replace(
    gitCommit('GH_RANK_NODE'),
    `${'█'.repeat(Math.round((100 - rank.percentile) / 10))} ${rank.level}`,
  )

  const activeOpenSourceDetail: GHItem[] = await Promise.all(
    opensource.active.map((name) => {
      return githubReq.get('/repos/' + name).then((data) => data.data)
    }),
  )

  newContent = newContent.replace(
    gitCommit('OPENSOURCE_DASHBOARD_ACTIVE'),
    generateFeaturedWorkMarkdown(activeOpenSourceDetail, opensource.blurbs),
  )

  const star: GHItem[] = await githubReq
    .get('/users/' + github.name + '/starred', {
      params: { per_page: recentLikedCount },
    })
    .then((data) => data.data)

  const topLiked = star
    .slice(0, recentLikedCount)
    .map(generateRepoMarkdown)
    .join('\n')

  newContent = newContent.replace(gitCommit('RECENT_STAR'), topLiked)

  await rm('./README.md', { force: true })
  await writeFile('./README.md', newContent, { encoding: 'utf-8' })
}

function gitCommit(token: keyof typeof comments) {
  return `<!-- ${comments[token]} -->`
}

main()
