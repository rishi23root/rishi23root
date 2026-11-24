// Usage: node shots.mjs --base http://localhost:4321 --out <dir> [--dist <dir>]
// Parts A (issue #76), B (#81), C (#82). Stable PNG names; report -> <out>/report.txt
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const argv = process.argv.slice(2)
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d }
const BASE = arg('base', 'http://localhost:4321').replace(/\/$/, '')
const OUT = arg('out')
const DIST = arg('dist')
if (!OUT) { console.error('--out required'); process.exit(2) }
fs.mkdirSync(OUT, { recursive: true })

const lines = []
const log = (s = '') => { console.log(s); lines.push(s) }
const step = async (name, fn) => {
  try { return await fn() } catch (e) { log(`ERROR [${name}]: ${String(e.message || e).split('\n')[0]}`); return undefined }
}
const ROUTES = [['/', 'home'], ['/projects/', 'projects'], ['/writing/', 'writing'], ['/writing/hello-world/', 'hello'],
  ['/writing/how-this-site-works/', 'post'], ['/mood/', 'mood'], ['/404.html', '404']]
const POST = '/writing/how-this-site-works/'
const outp = (n) => path.join(OUT, n)

async function newPage(browser, { width = 1280, height = 800, theme = 'dark', dpr = 1 } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: dpr, isMobile: false, hasTouch: false,
    reducedMotion: 'no-preference',
  })
  if (theme === 'light') await ctx.addInitScript(() => { try { localStorage.setItem('theme', 'light') } catch (e) {} })
  const page = await ctx.newPage()
  page.setDefaultTimeout(10000)
  return { ctx, page }
}

async function open(page, route) {
  await page.goto(BASE + route, { waitUntil: 'load', timeout: 30000 })
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {})
  await page.waitForTimeout(500)
}

// Viewport-clipped screenshot around a locator (scrolled to centre first).
async function shotAround(page, loc, name, pad = 12) {
  await loc.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(200)
  const bb = await loc.boundingBox()
  const vp = page.viewportSize()
  const x = Math.max(0, bb.x - pad), y = Math.max(0, bb.y - pad)
  const w = Math.min(vp.width, bb.x + bb.width + pad) - x
  const h = Math.min(vp.height, bb.y + bb.height + pad) - y
  await page.screenshot({ path: outp(name), clip: { x, y, width: w, height: h } })
}

const browser = await chromium.launch()
log(`base=${BASE} out=${OUT} dist=${DIST ?? '(none)'}`)

// ---------------- PART A.1 sweep ----------------
log('== A.1 sweep (route width theme scrollWidth/clientWidth) ==')
const WIDTHS = [320, 360, 375, 390, 414, 768]
const sweep = []
const themeSeen = {}
const sbNotes = new Set()
for (const theme of ['dark', 'light']) for (const w of WIDTHS) {
  const { ctx, page } = await newPage(browser, { width: w, height: 800, theme })
  for (const [route] of ROUTES) {
    const m = await step(`sweep ${route} ${w} ${theme}`, async () => {
      await open(page, route)
      return page.evaluate(() => ({
        sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
        iw: window.innerWidth, t: document.documentElement.getAttribute('data-theme'),
      }))
    })
    if (!m) { sweep.push({ route, w, theme, error: true }); continue }
    themeSeen[`${theme}`] = m.t
    sbNotes.add(m.iw - m.cw)
    const pass = m.sw <= m.cw
    const line = `${route} ${w} ${theme} ${m.sw}/${m.cw} ${pass ? 'PASS' : 'FAIL'}`
    log(line)
    sweep.push({ route, w, theme, pass, line })
  }
  await ctx.close()
}
const fails = sweep.filter((r) => r.pass === false)
log(`sweep combos: ${sweep.length}  FAIL: ${fails.length}  errors: ${sweep.filter((r) => r.error).length}`)
const byRW = {}
for (const f of fails) { const k = `${f.route} @${f.w}`; byRW[k] = (byRW[k] || 0) + 1 }
log(`FAIL counts by route@width (both themes summed): ${JSON.stringify(byRW)}`)
log(`theme check: html[data-theme] seen on dark runs=${themeSeen.dark} light runs=${themeSeen.light}`)
log(`scrollbar width (innerWidth - clientWidth) seen: ${[...sbNotes].join(',')} px (0 = headless hides scrollbars, so clientWidth equals viewport)`)

// A.2 header crops
log('== A.2 header crops ==')
const hdr = [['/', 'home', 320, 'dark'], ['/', 'home', 375, 'dark'], ['/writing/', 'writing', 320, 'dark'],
  ['/writing/', 'writing', 375, 'dark'], [POST, 'post', 320, 'dark'], [POST, 'post', 375, 'dark'],
  ['/404.html', '404', 320, 'dark'], ['/404.html', '404', 375, 'dark'], ['/', 'home', 320, 'light']]
for (const [route, slug, w, theme] of hdr) {
  await step(`header ${slug} ${w} ${theme}`, async () => {
    const { ctx, page } = await newPage(browser, { width: w, height: 800, theme })
    await open(page, route)
    const name = `76-header-${slug}-${w}-${theme}.png`
    await page.screenshot({ path: outp(name), clip: { x: 0, y: 0, width: w, height: 160 } })
    log(`wrote ${name}`)
    await ctx.close()
  })
}

// A.3 full pages at 375 dark
log('== A.3 full pages 375 dark ==')
for (const [route, slug] of ROUTES) {
  await step(`full ${slug}`, async () => {
    const { ctx, page } = await newPage(browser, { width: 375, height: 800 })
    await open(page, route)
    const name = `76-full-${slug}-375-dark.png`
    await page.screenshot({ path: outp(name), fullPage: true })
    log(`wrote ${name}`)
    await ctx.close()
  })
}
await step('post inline code 375', async () => {
  const { ctx, page } = await newPage(browser, { width: 375, height: 800 })
  await open(page, POST)
  const loc = page.locator('.post-body :is(p, li)').filter({
    has: page.locator('code', { hasText: 'ExcalidrawBoard.astro' }),
  }).first()
  if ((await loc.count()) === 0) { log('no paragraph with inline code ExcalidrawBoard.astro'); await ctx.close(); return }
  await shotAround(page, loc, '76-post-inline-code-375-dark.png', 16)
  log('wrote 76-post-inline-code-375-dark.png')
  await ctx.close()
})

// A.4 1280 shots
log('== A.4 1280 shots ==')
await step('76-home-1280', async () => {
  for (const theme of ['dark', 'light']) {
    const { ctx, page } = await newPage(browser, { width: 1280, height: 800, theme })
    await open(page, '/')
    await page.screenshot({ path: outp(`76-home-1280-${theme}.png`) })
    await ctx.close()
  }
  log('wrote 76-home-1280-dark.png, 76-home-1280-light.png')
})
await step('76-post-1280', async () => {
  const { ctx, page } = await newPage(browser, { width: 1280, height: 800 })
  await open(page, POST)
  await page.screenshot({ path: outp('76-post-1280-dark.png'), clip: { x: 0, y: 0, width: 1280, height: 800 } })
  await ctx.close()
  log('wrote 76-post-1280-dark.png')
})

// A.5 tap targets
log('== A.5 tap targets ==')
for (const w of [320, 375]) for (const route of ['/', POST]) {
  await step(`tap ${route} ${w}`, async () => {
    const { ctx, page } = await newPage(browser, { width: w, height: 800 })
    await open(page, route)
    const rect = (sel) => page.locator(sel).first().boundingBox().then((b) => b && ({
      x: +b.x.toFixed(1), y: +b.y.toFixed(1), width: +b.width.toFixed(1), height: +b.height.toFixed(1),
      right: +(b.x + b.width).toFixed(1),
    }))
    for (const [label, sel] of [['theme toggle', '#themeToggle'], ['@ socials', '#socialsMenuTrigger']]) {
      const b = await rect(sel)
      if (!b) { log(`${route} ${w} ${label}: NOT FOUND (${sel})`); continue }
      log(`${route} ${w} ${label}: x=${b.x} y=${b.y} w=${b.width} h=${b.height} right=${b.right} viewport=${w} ${b.right <= w ? 'INSIDE' : 'OVERFLOWS'}`)
    }
    await ctx.close()
  })
}

// ---------------- PART B (#81) ----------------
log('== B.1 post kbd sentence ==')
await step('81-kbd', async () => {
  const { ctx, page } = await newPage(browser, { width: 1280, height: 800 })
  await open(page, POST)
  const kbds = await page.$$eval('.post-body kbd', (els) => els.map((e) => e.textContent))
  log(`kbd texts in post: ${JSON.stringify(kbds)}`)
  const p = page.locator('.post-body p:has(kbd)').filter({ hasText: /⌘|Cmd/ }).first()
  await shotAround(page, p, '81-post-kbd-sentence-dark.png', 12)
  log('wrote 81-post-kbd-sentence-dark.png')
  await ctx.close()
})

log('== B.2 palette footer ==')
await step('81-palette', async () => {
  const { ctx, page } = await newPage(browser, { width: 1280, height: 800 })
  await open(page, POST)
  await page.keyboard.press('?')
  let ok = await page.locator('.kbar-hint').waitFor({ state: 'visible', timeout: 6000 }).then(() => true).catch(() => false)
  if (!ok) {
    log('palette did not open with "?", trying Control+k')
    await page.keyboard.press('Control+k')
    ok = await page.locator('.kbar-hint').waitFor({ state: 'visible', timeout: 6000 }).then(() => true).catch(() => false)
  }
  if (!ok) { log('palette did not open'); await ctx.close(); return }
  await page.waitForTimeout(300)
  const hint = page.locator('.kbar-hint')
  log(`palette footer text: ${JSON.stringify((await hint.textContent()).trim())}`)
  log(`palette footer kbd texts: ${JSON.stringify(await hint.locator('kbd').allTextContents())}`)
  await shotAround(page, hint, '81-palette-footer-dark.png', 16)
  log('wrote 81-palette-footer-dark.png')
  await ctx.close()
})

log('== B.3 skip link ==')
for (const [route, slug] of [['/', 'home'], [POST, 'post']]) {
  await step(`skip ${slug}`, async () => {
    const { ctx, page } = await newPage(browser, { width: 1280, height: 800 })
    await open(page, route)
    await page.keyboard.press('Tab')
    const ae = await page.evaluate(() => {
      const el = document.activeElement
      return { html: el.outerHTML.slice(0, 200), text: (el.textContent || '').trim().slice(0, 80) }
    })
    log(`[${slug}] first Tab activeElement outerHTML: ${ae.html}`)
    log(`[${slug}] first Tab activeElement text: ${JSON.stringify(ae.text)}`)
    await page.screenshot({ path: outp(`81-skiplink-${slug}-dark.png`), clip: { x: 0, y: 0, width: 1280, height: 200 } })
    log(`wrote 81-skiplink-${slug}-dark.png`)
    if ((await page.locator('a.skip-link').count()) === 0) {
      log(`[${slug}] skip link: no skip link (a.skip-link not found)`)
    } else {
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      const after = await page.evaluate(() => {
        const el = document.activeElement
        const t = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null
        return {
          active: `${el.tagName}#${el.id}`, scrollY: window.scrollY, hash: location.hash,
          hashTarget: t ? `${t.tagName}#${t.id}` : null,
          hashTargetTop: t ? Math.round(t.getBoundingClientRect().top) : null,
        }
      })
      log(`[${slug}] after Enter on skip link: ${JSON.stringify(after)}`)
    }
    await ctx.close()
  })
}

log('== B.4 TOC focus ==')
async function tocRun(theme, lateName) {
  const { ctx, page } = await newPage(browser, { width: 1280, height: 900, theme })
  await open(page, POST)
  if (theme === 'light') log(`light theme check: html[data-theme]=${await page.getAttribute('html', 'data-theme')}`)
  const links = page.locator('.post-toc a[data-toc]')
  log(`[${theme}] TOC links: ${await links.count()}`)
  await links.nth(1).focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  const st = () => page.evaluate(() => {
    const el = document.activeElement; const cs = getComputedStyle(el)
    return { active: `${el.tagName} "${(el.textContent || '').trim().slice(0, 60)}" href=${el.getAttribute('href')}`,
      outline: `style=${cs.outlineStyle} width=${cs.outlineWidth} color=${cs.outlineColor}`,
      href: el.getAttribute('href') }
  })
  const s1 = await st()
  log(`[${theme}] TOC activeElement: ${s1.active}`)
  log(`[${theme}] TOC activeElement outline: ${s1.outline}`)
  const heading = page.locator(`[id="${(s1.href || '#').slice(1)}"]`).first()
  const hbox = async () => {
    const bb = await heading.boundingBox()
    if (!bb) return null
    const x = Math.max(0, bb.x - 24), y = Math.max(0, bb.y - 24)
    const w = Math.min(1280, bb.x + bb.width + 24) - x
    const h = Math.min(900, bb.y + bb.height + 24) - y
    return { x, y, width: w, height: h }
  }
  const clip = await hbox()
  const shotName = theme === 'dark' ? '81-toc-focus-dark.png' : '81-toc-focus-light.png'
  if (clip && clip.width > 0 && clip.height > 0) {
    await page.screenshot({ path: outp(shotName), clip })
    log(`wrote ${shotName}`)
  } else log(`[${theme}] target heading not in view for clip (${s1.href})`)
  if (lateName) {
    await page.waitForTimeout(1200)
    const s2 = await st()
    log(`[${theme}] TOC outline 1.5s after Enter: ${s2.outline}`)
    const c2 = await hbox()
    if (c2 && c2.width > 0 && c2.height > 0) { await page.screenshot({ path: outp(lateName), clip: c2 }); log(`wrote ${lateName}`) }
  }
  await ctx.close()
}
await step('81-toc dark', () => tocRun('dark', '81-toc-focus-late-dark.png'))
await step('81-toc light', () => tocRun('light', null))

log('== B.5 aria-current on crumbs ==')
await step('crumbs', async () => {
  const { ctx, page } = await newPage(browser, { width: 1280, height: 800 })
  await open(page, POST)
  const v = await page.getAttribute('.post-crumbs-current', 'aria-current')
  log(`.post-crumbs-current aria-current = ${v === null ? 'null (absent)' : JSON.stringify(v)}`)
  await ctx.close()
})

log('== B.6 glyph grep ==')
if (!DIST) log('no --dist given, skipping grep')
else {
  const pats = ['⌘', '↵', '⏎', '⌥', '⇧']
  const args = ['-rIl', ...pats.flatMap((p) => ['-e', p]), DIST]
  let out = ''
  try { out = execFileSync('grep', args, { encoding: 'utf8' }) } catch (e) { out = e.stdout || '' }
  const files = out.split('\n').filter(Boolean)
  log(`glyph matches in ${DIST}: ${files.length} files`)
  for (const f of files) log(`  ${path.relative(DIST, f)}`)
}

// ---------------- PART C (#82) ----------------
log('== C.1 Excalidraw pill ==')
for (const theme of ['dark', 'light']) {
  await step(`pill ${theme}`, async () => {
    const { ctx, page } = await newPage(browser, { width: 1280, height: 900, theme })
    await open(page, POST)
    const board = page.locator('.excal-board').first()
    if ((await board.count()) === 0) { log(`[${theme}] no .excal-board found`); await ctx.close(); return }
    await board.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await page.mouse.move(5, 5)
    await page.waitForTimeout(2000)
    const restOp = await board.locator('.excal-pill').first().evaluate((el) => getComputedStyle(el).opacity)
    log(`[${theme}] .excal-pill opacity at rest: ${restOp}`)
    await board.screenshot({ path: outp(`82-pill-rest-${theme}.png`) })
    const bb = await board.boundingBox()
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2)
    await page.waitForTimeout(600)
    const hovOp = await board.locator('.excal-pill').first().evaluate((el) => getComputedStyle(el).opacity)
    log(`[${theme}] .excal-pill opacity on hover: ${hovOp}`)
    await board.screenshot({ path: outp(`82-pill-hover-${theme}.png`) })
    log(`wrote 82-pill-rest-${theme}.png, 82-pill-hover-${theme}.png`)
    await ctx.close()
  })
}
log('(C.2 preview bounds: run preview-bounds.mjs separately, report -> <out>/preview-bounds.txt)')

await browser.close()
fs.writeFileSync(outp('report.txt'), lines.join('\n') + '\n')
console.log(`\nreport saved: ${outp('report.txt')}`)
