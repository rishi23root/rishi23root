import axios from 'axios'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { readFile, rm, writeFile } from 'fs/promises'
import { minify } from 'html-minifier'
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
  schedule,
} from './config'
import comments from './constants'

dayjs.extend(utc)
dayjs.extend(timezone)

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

  const activeOpenSourceDetail: GHItem[] = await Promise.all(
    opensource.active.map((name) => {
      return githubReq.get('/repos/' + name).then((data) => data.data)
    }),
  )

  newContent = newContent.replace(
    gitCommit('MOTTOS'),
    mottos
      .map(
        (line) =>
          `<p align="center">\n  「<strong><samp>${line}</samp></strong>」\n</p>`,
      )
      .join('\n'),
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

  {
    const topLiked = star
      .slice(0, recentLikedCount)
      .map(generateRepoMarkdown)
      .join('\n')

    newContent = newContent.replace(gitCommit('RECENT_STAR'), topLiked)
  }

  {
    const now = dayjs().tz(schedule.timeZone)
    // Next run: +1 day at the configured local clock time
    const next = now
      .add(1, 'day')
      .hour(schedule.hour)
      .minute(schedule.minute)
      .second(0)
      .millisecond(0)
    const when = (d: dayjs.Dayjs) =>
      d.toDate().toLocaleString(undefined, {
        timeStyle: 'short',
        dateStyle: 'short',
        timeZone: schedule.timeZone,
      })

    newContent = newContent.replace(
      gitCommit('FOOTER'),
      minifyMarkdown`
    <p align="center">
      <a href="${contact.socials.github}">GitHub</a> ·
      <a href="${contact.socials.x}">X</a> ·
      <a href="${contact.socials.linkedin}">LinkedIn</a> ·
      <a href="${contact.socials.pypi}">PyPI</a> ·
      <a href="mailto:${contact.email}">Email</a>
    </p>
    <p align="center"><sub>Updated daily · ${when(now)} · next ${when(next)}</sub></p>
    `,
    )
  }

  await rm('./README.md', { force: true })
  await writeFile('./README.md', newContent, { encoding: 'utf-8' })
}

function gitCommit(token: keyof typeof comments) {
  return `<!-- ${comments[token]} -->`
}

function minifyMarkdown(html: TemplateStringsArray, ...args: any[]) {
  const str = html.reduce((s, h, i) => s + h + (args[i] ?? ''), '')
  return minify(str, {
    removeAttributeQuotes: true,
    removeEmptyAttributes: true,
    removeTagWhitespace: true,
    collapseWhitespace: true,
  }).trim()
}

main()
