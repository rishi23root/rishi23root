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
