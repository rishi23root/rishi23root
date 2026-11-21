import assert from 'assert'
import { opensource } from './config'
import {
  escapeMd,
  featuredMarkdown,
  fetchFeaturedRepos,
  filterStarredRepos,
  githubReq,
  likedMarkdown,
  type GHItem,
} from './index'
import { listPosts, parseFrontmatter, renderRecentPosts } from './posts'
import { renderToolbox } from './toolbox'

async function main() {
  // 1. config.ts derives opensource from unified projects[]
  assert.deepStrictEqual(opensource.active, [
    'saeeddhqan/Maryam',
    'EpicGames/PixelStreamingInfrastructure',
    'rishi23root/opencv_wrap',
    'rishi23root/pyblink',
    'rishi23root/resume-editor',
    'rishi23root/selenium-automations',
  ])
  assert.strictEqual(
    opensource.blurbs['EpicGames/PixelStreamingInfrastructure'],
    'Unreal Pixel Streaming servers and frontend',
  )

  // 2. index.ts escaping, zero-star omission, and liked formatting
  assert.strictEqual(
    escapeMd('a\\b[c]d*e_f<g>h\ni'),
    'a\\\\b\\[c\\]d\\*e\\_f\\<g\\>h i',
  )
  const zeroStars: GHItem = {
    full_name: 'a/b',
    html_url: 'https://github.com/a/b',
    description: 'desc $& $$',
    stargazers_count: 0,
  }
  assert.strictEqual(
    featuredMarkdown([zeroStars], {}),
    '- **[a/b](https://github.com/a/b)** — desc $& $$',
  )
  assert.strictEqual(
    featuredMarkdown([{ ...zeroStars, stargazers_count: 5 }], {}),
    '- **[a/b](https://github.com/a/b)** — desc $& $$ ★5',
  )
  assert.strictEqual(
    likedMarkdown({
      full_name: 'x/y',
      html_url: 'https://github.com/x/y',
      description: 'Fast [CLI] <tool>',
    }),
    '- [x/y](https://github.com/x/y) — Fast \\[CLI\\] \\<tool\\>',
  )

  // 3. index.ts retry-axios on githubReq + 404 fallback via Promise.allSettled
  const origAdapter = githubReq.defaults.adapter
  const origRaxConfig = { ...githubReq.defaults.raxConfig }
  let retryCalls = 0
  try {
    assert.strictEqual(githubReq.defaults.raxConfig?.instance, githubReq)
    githubReq.defaults.raxConfig = {
      ...origRaxConfig,
      retry: 2,
      retryDelay: 1,
      backoffType: 'static',
      onRetryAttempt: () => {},
    }
    githubReq.defaults.adapter = async (cfg) => {
      if (cfg.url === '/retry-test') {
        retryCalls++
        if (retryCalls === 1) {
          const err = Object.assign(new Error('Server Error'), {
            isAxiosError: true,
            config: cfg,
            response: { status: 500, statusText: 'ERR', headers: {}, config: cfg, data: {} },
          })
          throw err
        }
        return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config: cfg }
      }
      if (cfg.url === '/repos/missing/repo') {
        const err = Object.assign(new Error('Not Found'), {
          isAxiosError: true,
          config: cfg,
          response: { status: 404, statusText: 'Not Found', headers: {}, config: cfg, data: {} },
        })
        throw err
      }
      return {
        data: {
          full_name: 'ok/repo',
          html_url: 'https://github.com/ok/repo',
          description: 'works',
          stargazers_count: 10,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: cfg,
      }
    }

    await githubReq.get('/retry-test')
    assert.strictEqual(retryCalls, 2)

    const origWarn = console.warn
    console.warn = () => {}
    const fetched = await fetchFeaturedRepos(['ok/repo', 'missing/repo'], {
      'missing/repo': 'Fallback blurb',
    })
    console.warn = origWarn
    assert.strictEqual(fetched.length, 2)
    assert.strictEqual(fetched[0].stargazers_count, 10)
    assert.deepStrictEqual(fetched[1], {
      full_name: 'missing/repo',
      html_url: 'https://github.com/missing/repo',
      description: 'Fallback blurb',
    })
  } finally {
    githubReq.defaults.adapter = origAdapter
    githubReq.defaults.raxConfig = origRaxConfig
  }

  // 4. index.ts excludes self-owned repos case-insensitively
  const filtered = filterStarredRepos(
    [
      { full_name: 'rishi23root/opencv_wrap', html_url: 'u1', description: null },
      { full_name: 'Rishi23Root/pyblink', html_url: 'u2', description: null },
      { full_name: 'other/one', html_url: 'u3', description: null },
      { full_name: 'other/two', html_url: 'u4', description: null },
    ],
    'rishi23root',
    1,
  )
  assert.deepStrictEqual(
    filtered.map((item) => item.full_name),
    ['other/one'],
  )

  // 5. posts.ts frontmatter parser + trailing-slash links + draft exclusion
  const fm1 = parseFrontmatter(
    '---\n# comment\ntitle: "Hello \\"World\\" #1" # trailing\ndate: 2026-11-14 # date\ndraft: True # wip\n---\nbody',
  )
  assert.strictEqual(fm1.title, 'Hello "World" #1')
  assert.strictEqual(fm1.date, '2026-11-14')
  assert.strictEqual(fm1.draft, true)

  const fm2 = parseFrontmatter("---\ntitle: 'It''s #2' # comment\ndraft: TRUE\n---\n")
  assert.strictEqual(fm2.title, "It's #2")
  assert.strictEqual(fm2.draft, true)

  const fm3 = parseFrontmatter('---\ndraft: False # comment\n---\n')
  assert.strictEqual(fm3.draft, false)

  const published = await listPosts()
  assert.ok(published.length >= 2)
  assert.ok(published.every((p) => !p.draft))
  const recent = await renderRecentPosts('https://rishi23root.in', 5)
  assert.ok(recent.includes('(https://rishi23root.in/writing/how-this-site-works/)'))
  assert.ok(!recent.includes('draft-template'))

  // 6. toolbox.ts escapes hyphens and underscores for shields.io
  const badge = renderToolbox([{ label: 'Next-Auth_v2', color: '000000' }])
  assert.ok(badge.includes('/badge/Next--Auth__v2-000000?style=flat'))

  console.log('scripts.test.ts: all assertions passed')
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
