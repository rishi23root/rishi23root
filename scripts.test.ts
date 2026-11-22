import assert from 'assert'
import { execFileSync } from 'child_process'
import { join } from 'path'
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
import {
  listPosts,
  parseFrontmatter,
  renderRecentPosts,
} from './posts'
import { renderToolbox } from './toolbox'
import {
  absoluteUrl,
  getFeaturedProjects,
  getOrderedProjects,
  getProjectTags,
  normalizeProjectTags,
  socialLinks,
  type Project,
} from './web/src/lib/site'
import { filterActions } from './web/src/components/command-palette/palette'
import type { CommandAction } from './web/src/components/command-palette/types'

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
  const origWarn = console.warn
  const warnings: string[] = []
  let retryCalls = 0
  let networkRetryCalls = 0
  let exhaustCalls = 0
  try {
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map(String).join(' '))
    }
    assert.strictEqual(githubReq.defaults.raxConfig?.retry, 5)
    githubReq.defaults.raxConfig = {
      ...origRaxConfig,
      retry: 2,
      retryDelay: 1,
      backoffType: 'static',
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
      if (cfg.url === '/network-retry-test') {
        networkRetryCalls++
        if (networkRetryCalls === 1) {
          const err = Object.assign(new Error('Connection reset'), {
            isAxiosError: true,
            config: cfg,
            code: 'ECONNRESET',
          })
          throw err
        }
        return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config: cfg }
      }
      if (cfg.url === '/exhaust-test') {
        exhaustCalls++
        const err = Object.assign(new Error('Server Error'), {
          isAxiosError: true,
          config: cfg,
          response: { status: 500, statusText: 'ERR', headers: {}, config: cfg, data: {} },
        })
        throw err
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

    warnings.length = 0
    await githubReq.get('/retry-test')
    assert.strictEqual(retryCalls, 2)
    assert.ok(
      warnings.some((w) => w.includes('#1') && w.includes('/retry-test')),
      `Expected retry warning with #1 and /retry-test, got: ${JSON.stringify(warnings)}`,
    )

    warnings.length = 0
    await githubReq.get('/network-retry-test')
    assert.strictEqual(networkRetryCalls, 2)
    assert.ok(
      warnings.some((w) => w.includes('ECONNRESET')),
      `Expected network retry warning mentioning ECONNRESET, got: ${JSON.stringify(warnings)}`,
    )

    warnings.length = 0
    await assert.rejects(() => githubReq.get('/exhaust-test'))
    assert.strictEqual(exhaustCalls, 3)

    const fetched = await fetchFeaturedRepos(['ok/repo', 'missing/repo'], {
      'missing/repo': 'Fallback blurb',
    })
    assert.strictEqual(fetched.length, 2)
    assert.strictEqual(fetched[0].stargazers_count, 10)
    assert.deepStrictEqual(fetched[1], {
      full_name: 'missing/repo',
      html_url: 'https://github.com/missing/repo',
      description: 'Fallback blurb',
    })
  } finally {
    console.warn = origWarn
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

  const fmBlockFolded = parseFrontmatter(
    '---\ntitle: >-\n  Wrapped\n  title\n---\n',
  )
  assert.strictEqual(fmBlockFolded.title, 'Wrapped title')

  const fmBlockLiteral = parseFrontmatter(
    '---\nsummary: |\n  Line 1\n  Line 2\n---\n',
  )
  assert.strictEqual(fmBlockLiteral.summary, 'Line 1\nLine 2\n')

  const fmBlockLiteralStrip = parseFrontmatter(
    '---\nsummary: |-\n  Line 1\n  Line 2\n---\n',
  )
  assert.strictEqual(fmBlockLiteralStrip.summary, 'Line 1\nLine 2')

  assert.strictEqual(
    escapeMd('Using <ExcalidrawBoard> for [draft] foo_bar *bold*'),
    'Using \\<ExcalidrawBoard\\> for \\[draft\\] foo\\_bar \\*bold\\*',
  )

  const published = await listPosts()
  assert.ok(published.length >= 2)
  assert.ok(published.every((p) => !p.draft))
  const recent = await renderRecentPosts('https://rishi23root.in', 5)
  assert.ok(recent.includes('(https://rishi23root.in/writing/how-this-site-works/)'))
  assert.ok(!recent.includes('draft-template'))

  // 6. toolbox.ts escapes hyphens and underscores for shields.io
  const badge = renderToolbox([{ label: 'Next-Auth_v2', color: '000000' }])
  assert.ok(badge.includes('/badge/Next--Auth__v2-000000?style=flat'))

  // 7. web/src/lib/site.ts project & tag helpers
  assert.deepStrictEqual(normalizeProjectTags(undefined), [])
  assert.deepStrictEqual(normalizeProjectTags([]), [])
  assert.deepStrictEqual(
    normalizeProjectTags([' Python ', 'python', '', '   ', 'Open-Source', 'ai, ml']),
    ['python', 'open-source', 'ai, ml'],
  )

  const sampleProjects: Project[] = [
    { title: 'Unordered', url: 'https://example.com/u', tags: ['zeta', 'ai, ml'] },
    { title: 'Hundred', url: 'https://example.com/100', order: 100, tags: ['Python', ' python '] },
    { title: 'Zero', url: 'https://example.com/0', order: 0, tags: ['alpha', 'python'] },
    { title: 'Two', url: 'https://example.com/2', order: 2, featured: false, tags: ['beta'] },
    { title: 'Thousand', url: 'https://example.com/1000', order: 1000 },
  ]
  const sampleCopy = [...sampleProjects]

  assert.deepStrictEqual(
    getOrderedProjects(sampleProjects).map((p) => p.title),
    ['Zero', 'Two', 'Hundred', 'Thousand', 'Unordered'],
  )
  assert.deepStrictEqual(sampleProjects, sampleCopy)
  assert.deepStrictEqual(
    getOrderedProjects().map((p) => p.title),
    [
      'Maryam',
      'Pixel Streaming Infrastructure',
      'opencv_wrap',
      'pyblink',
      'resume-editor',
      'selenium-automations',
    ],
  )

  assert.deepStrictEqual(
    getFeaturedProjects(sampleProjects).map((p) => p.title),
    ['Zero', 'Hundred', 'Thousand', 'Unordered'],
  )
  assert.strictEqual(getFeaturedProjects().length, 6)

  assert.deepStrictEqual(getProjectTags(sampleProjects), [
    { tag: 'python', count: 2 },
    { tag: 'ai, ml', count: 1 },
    { tag: 'alpha', count: 1 },
    { tag: 'beta', count: 1 },
    { tag: 'zeta', count: 1 },
  ])

  assert.strictEqual(absoluteUrl('/writing'), 'https://rishi23root.in/writing/')
  assert.strictEqual(
    absoluteUrl('/og-default.png'),
    'https://rishi23root.in/og-default.png',
  )
  assert.strictEqual(
    absoluteUrl('https://images.unsplash.com/photo-123?w=1200'),
    'https://images.unsplash.com/photo-123?w=1200',
  )

  // 8. socialLinks single source of truth + kbar @ filter
  assert.deepStrictEqual(
    socialLinks.map((s) => ({ id: s.id, label: s.label, meta: s.meta })),
    [
      { id: 'email', label: 'Email', meta: 'hi@rishi23root.in' },
      { id: 'x', label: 'X', meta: '@rishi23root ↗' },
      { id: 'linkedin', label: 'LinkedIn', meta: 'in/rishi23root ↗' },
      { id: 'github', label: 'GitHub', meta: 'rishi23root ↗' },
      { id: 'pypi', label: 'PyPI', meta: 'rishi23root ↗' },
    ],
  )
  assert.ok(socialLinks.every((s) => s.iconPath.length > 0))

  const kbarActions: CommandAction[] = [
    { id: 'home', name: 'Home', section: 'Navigate', href: '/' },
    { id: 'post-x', name: 'XPost', section: 'Writing', href: '/writing/x/' },
    ...socialLinks.map((s) => ({
      id: `social-${s.id}`,
      name: s.label,
      section: 'Socials',
      href: s.href,
      iconPath: s.iconPath,
      meta: s.meta,
    })),
  ]
  assert.strictEqual(filterActions('', kbarActions).length, kbarActions.length)
  assert.deepStrictEqual(
    filterActions('@', kbarActions).map((a) => a.id),
    ['social-email', 'social-x', 'social-linkedin', 'social-github', 'social-pypi'],
  )
  assert.deepStrictEqual(
    filterActions('  @  ', kbarActions).map((a) => a.id),
    ['social-email', 'social-x', 'social-linkedin', 'social-github', 'social-pypi'],
  )
  assert.deepStrictEqual(
    filterActions('@git', kbarActions).map((a) => a.id),
    ['social-github'],
  )
  assert.deepStrictEqual(
    filterActions('@hi@', kbarActions).map((a) => a.id),
    ['social-email'],
  )
  assert.deepStrictEqual(filterActions('@nonexistent', kbarActions), [])
  assert.deepStrictEqual(
    filterActions('@l', kbarActions).map((a) => a.id),
    ['social-linkedin', 'social-email'],
  )
  assert.deepStrictEqual(
    filterActions('@x', kbarActions).map((a) => a.id),
    ['social-x'],
  )
  assert.deepStrictEqual(
    filterActions('x', kbarActions).map((a) => a.id),
    ['post-x', 'social-x'],
  )
  assert.deepStrictEqual(filterActions('@c', kbarActions), [])
  assert.strictEqual(filterActions('   ', kbarActions).length, kbarActions.length)
  assert.deepStrictEqual(
    filterActions('@   ', kbarActions).map((a) => a.id),
    ['social-email', 'social-x', 'social-linkedin', 'social-github', 'social-pypi'],
  )
  assert.deepStrictEqual(
    filterActions('@in', kbarActions).map((a) => a.id),
    ['social-linkedin', 'social-email'],
  )
  assert.deepStrictEqual(
    filterActions('@py', kbarActions).map((a) => a.id),
    ['social-pypi'],
  )
  assert.deepStrictEqual(
    filterActions('socials', kbarActions).map((a) => a.id),
    ['social-email', 'social-x', 'social-linkedin', 'social-github', 'social-pypi'],
  )

  // 9. Run web helper tests (ESM modules under web/) via root tsx
  const tsxBin = join(__dirname, 'node_modules', '.bin', 'tsx')
  execFileSync(tsxBin, [join(__dirname, 'web', 'scripts', 'web.test.ts')], {
    stdio: 'inherit',
    cwd: join(__dirname, 'web'),
  })

  console.log('scripts.test.ts: all assertions passed')
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
