import axios from 'axios'
import dayjs from 'dayjs'
import { readFile, rm, writeFile } from 'fs/promises'
import { minify } from 'html-minifier'
import { shuffle } from 'lodash'
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
  description: string
  html_url: string
}

function generateOpenSourceSectionHtml<T extends GHItem>(list: T[]) {
  const tbody = list.reduce(
    (str, cur) =>
      str +
      ` <tr>
        <td><a href="${cur.html_url}"><b>
        ${cur.full_name}</b></a></td>
        <td><img alt="Stars" src="https://img.shields.io/github/stars/${cur.full_name}?style=flat-square&labelColor=343b41"/></td>
        <td><img alt="Forks" src="https://img.shields.io/github/forks/${cur.full_name}?style=flat-square&labelColor=343b41"/></td>
        <td><a href="https://github.com/${cur.full_name}/issues" target="_blank"><img alt="Issues" src="https://img.shields.io/github/issues/${cur.full_name}?style=flat-square&labelColor=343b41"/></a></td>
        <td><a href="https://github.com/${cur.full_name}/pulls" target="_blank"><img alt="Pull Requests" src="https://img.shields.io/github/issues-pr/${cur.full_name}?style=flat-square&labelColor=343b41"/></a></td>
      </tr>`,
    ``,
  )

  return minifyMarkdown`
    <table>
      <thead align="center">
        <tr border: none;>
          <td><b>🎁 Projects</b></td>
          <td><b>⭐ Stars</b></td>
          <td><b>📚 Forks</b></td>
          <td><b>🛎 Issues</b></td>
          <td><b>📬 Pull requests</b></td>
        </tr>
      </thead>
      <tbody>
      ${tbody}
      </tbody>
    </table>
  `
}

function generateRepoHTML<T extends GHItem>(item: T) {
  return `<li><a href="${item.html_url}">${item.full_name}</a>${
    item.description ? ` -- <span>${item.description}</span>` : ''
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
    // Back-compat if an older template still uses the typo token
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

  const star: any[] = await githubReq
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

    const random = shuffle(star.slice(5))
      .slice(0, 5)
      .reduce((str, cur) => str + generateRepoHTML(cur), '')

    newContent = newContent.replace(
      gitCommit('RANDOM_GITHUB_STARS'),
      minifyMarkdown`
      <ul>
        ${random}
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
    This file <i>README</i> is automatically refreshed <b>daily</b> (and on push / manual dispatch)!<br>
    refreshed on : ${now.toLocaleString(undefined, {
      timeStyle: 'short',
      dateStyle: 'short',
      timeZone,
    })}
    <br/>
    Next refresh : ${next.toLocaleString(undefined, {
      timeStyle: 'short',
      dateStyle: 'short',
      timeZone,
    })}</p>
    `,
    )
  }
  newContent = newContent.toString()
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
