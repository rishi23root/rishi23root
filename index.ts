import axios from 'axios'
import dayjs from 'dayjs'
import { readFile, rm, writeFile } from 'fs/promises'
import { minify } from 'html-minifier'
import { shuffle } from 'lodash'
import rax from 'retry-axios'
import { github, opensource, timeZone } from './config'
import { COMMNETS } from './constants'
const githubAPIEndPoint = 'https://api.github.com'

rax.attach()
axios.defaults.raxConfig = {
  retry: 5,
  retryDelay: 4000,
  onRetryAttempt: (err) => {
    const cfg = rax.getConfig(err)
    console.log('request: \n', err.request)
    console.log(`Retry attempt #${cfg.currentRetryAttempt}`)
  },
}

const userAgent =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36'

axios.defaults.headers.common['User-Agent'] = userAgent
const gh = axios.create({
  baseURL: githubAPIEndPoint,
  timeout: 4000,
})
type GHItem = {
  name: string
  id: number
  full_name: string
  description: string
  html_url: string
}

type PostItem = {
  title: string
  summary: string
  created: string
  modified: string
  id: string
  slug: string
  category: {
    name: string
    slug: string
  }
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

  return m`<table>
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
</table>`
}

/**
 * Repo  HTML 
 */

function generateRepoHTML<T extends GHItem>(item: T) {
  return `<li><a href="${item.html_url}">${item.full_name}</a>${
    item.description ? ` -- <span>${item.description}</span>` : ''
  }</li>`
}

async function main() {
  const template = await readFile('./readme.template.md', { encoding: 'utf-8' })
  let newContent = template
  // 获取活跃的开源项目详情
  const activeOpenSourceDetail = await Promise.all(
    opensource.active.map((name) => {
      return gh.get('/repos/' + name).then((data) => data.data)
    }),
  )

  newContent = newContent.replace(
    gc('OPENSOURCE_DASHBOARD_ACTIVE'),
    generateOpenSourceSectionHtml(activeOpenSourceDetail),
  )
  // // 获取活跃的开源项目Gs详情
  // const activeOpenSourceDetailGs = await Promise.all(
  //   opensource.gs.map((name) => {
  //     return gh.get('/repos/' + name).then((data) => data.data)
  //   }),
  // )

  // newContent = newContent.replace(
  //   gc('OPENSOURCE_DASHBOARD_GS'),
  //   generateOpenSourceSectionHtml(activeOpenSourceDetailGs),
  // )
  // 获取 Star
  const star: any[] = await gh
    .get('/users/' + github.name + '/starred')
    .then((data) => data.data)

  {
    // TOP 5
    const topStar5 = star
      .slice(0, 5)
      .reduce((str, cur) => str + generateRepoHTML(cur), '')

    newContent = newContent.replace(
      gc('RECENT_STAR'),
      m`
    <ul>
${topStar5}
    </ul>
    `,
    )

    // even order Star
    const random = shuffle(star.slice(5))
      .slice(0, 5)
      .reduce((str, cur) => str + generateRepoHTML(cur), '')

    newContent = newContent.replace(
      gc('RANDOM_GITHUB_STARS'),
      m`
      <ul>
  ${random}
      </ul>
      `,
    )
  }

  // adding FOOTER
  {
    const now = new Date()
    const next = dayjs().add(3, 'h').toDate()

    newContent = newContent.replace(
      gc('FOOTER'),
      m`
    This file <i>README</i> is automatically refreshed <b>every 3 hours</b>!<br>
    refreshed on：${now.toLocaleString(undefined, {
      timeStyle: 'short',
      dateStyle: 'short',
      timeZone,
    })}
    <br/>
    Next refresh: ${next.toLocaleString(undefined, {
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

function gc(token: keyof typeof COMMNETS) {
  return `<!-- ${COMMNETS[token]} -->`
}

function m(html: TemplateStringsArray, ...args: any[]) {
  const str = html.reduce((s, h, i) => s + h + (args[i] ?? ''), '')
  return minify(str, {
    removeAttributeQuotes: true,
    removeEmptyAttributes: true,
    removeTagWhitespace: true,
    collapseWhitespace: true,
  }).trim()
}

main()
