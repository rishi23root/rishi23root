import axios from 'axios'
import dayjs from 'dayjs'
import { readFile, rm, writeFile } from 'fs/promises'
import { minify } from 'html-minifier'
import { attach as raxAttach, getConfig as raxGetConfig } from 'retry-axios'
import { github, shortBio, fullDescription, opensource, timeZone } from './config'
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
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function generateOpenSourceSectionHtml<T extends GHItem>(list: T[]) {
  const rows = list.reduce((str, cur) => {
    const description = cur.description
      ? `<br/><sub>${escapeHtml(cur.description)}</sub>`
      : ''
    return (
      str +
      `<tr>
        <td>
          <a href="${cur.html_url}"><b>${escapeHtml(cur.full_name)}</b></a>${description}
        </td>
        <td align="center">
          <img alt="Stars" src="https://img.shields.io/github/stars/${cur.full_name}?style=flat-square&labelColor=343b41"/>
        </td>
      </tr>`
    )
  }, '')

  return minifyMarkdown`
    <table>
      <thead>
        <tr>
          <th align="left">Project</th>
          <th align="center">Stars</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `
}

function generateRepoHTML<T extends GHItem>(item: T) {
  return `<li><a href="${item.html_url}">${escapeHtml(item.full_name)}</a>${
    item.description ? ` — <span>${escapeHtml(item.description)}</span>` : ''
  }</li>`
}

function capitalizeFirstLetter(stringText: string) {
  return stringText.charAt(0).toUpperCase() + stringText.slice(1)
}

async function main() {
  const template = await readFile('./readme.template.md', { encoding: 'utf-8' })
  let newContent = template

  newContent = newContent
    .replace(/{USERNAME_HERE}/gm, capitalizeFirstLetter(github.name))
    .replace(/{shortBio}/gm, shortBio)
    .replace(/{fullDescription}/gm, fullDescription)
    .replace(/{fullDiscription}/gm, fullDescription)

  const activeOpenSourceDetail = await Promise.all(
    opensource.active.map((name) => {
      return githubReq.get('/repos/' + name).then((data) => data.data)
    }),
  )

  newContent = newContent.replace(
    gitCommit('OPENSOURCE_DASHBOARD_ACTIVE'),
    generateOpenSourceSectionHtml(activeOpenSourceDetail),
  )

  const star: GHItem[] = await githubReq
    .get('/users/' + github.name + '/starred')
    .then((data) => data.data)

  {
    const topStar5 = star
      .slice(0, 5)
      .reduce((str, cur) => str + generateRepoHTML(cur), '')

    newContent = newContent.replace(
      gitCommit('RECENT_STAR'),
      minifyMarkdown`
    <ul>
      ${topStar5}
    </ul>
    `,
    )
  }

  {
    const now = new Date()
    const next = dayjs().add(1, 'day').toDate()

    newContent = newContent.replace(
      gitCommit('FOOTER'),
      minifyMarkdown`
    <p align="center">
    Updated <b>daily</b> (and on push / manual dispatch).<br>
    Last refresh: ${now.toLocaleString(undefined, {
      timeStyle: 'short',
      dateStyle: 'short',
      timeZone,
    })}
    · Next: ${next.toLocaleString(undefined, {
      timeStyle: 'short',
      dateStyle: 'short',
      timeZone,
    })}
    </p>
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
