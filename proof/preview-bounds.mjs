// Usage: node preview-bounds.mjs --base http://localhost:4321 --out <dir>
// Checks GitHub hover-preview (.gh-pop) placement at 375x300 and 1280x360. Report -> <out>/preview-bounds.txt
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const argv = process.argv.slice(2)
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d }
const BASE = arg('base', 'http://localhost:4321').replace(/\/$/, '')
const OUT = arg('out')
if (!OUT) { console.error('--out required'); process.exit(2) }
fs.mkdirSync(OUT, { recursive: true })
const POST = '/writing/how-this-site-works/'
const lines = []
const log = (s = '') => { console.log(s); lines.push(s) }
const outp = (n) => path.join(OUT, n)

const browser = await chromium.launch()
const VIEWPORTS = [[375, 300], [1280, 360], [375, 200], [1280, 200], [375, 110]]
let FAILS = 0, CHECKS = 0
const VARIANTS = [['mid', ''], ['top', '-top'], ['bottom', '-bottom']]

for (const [w, h] of VIEWPORTS) {
  log(`== viewport ${w}x${h} ==`)
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: false, hasTouch: false, reducedMotion: 'no-preference' })
  const page = await ctx.newPage()
  page.setDefaultTimeout(10000)
  await page.goto(BASE + POST, { waitUntil: 'load', timeout: 30000 })
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {})
  await page.waitForTimeout(500)

  const links = page.locator('.post-body a[href*="github.com/"]:not(.gh-card)')
  const count = await links.count()
  log(`candidate github.com links in article: ${count}`)

  for (const [variant, suffix] of VARIANTS) {
    try {
      let opened = null
      for (let i = 0; i < Math.min(count, 15) && !opened; i++) {
        await page.mouse.move(0, 0)
        await page.waitForTimeout(350)
        const loc = links.nth(i)
        // Place the link per variant (top/bottom: ~40px from that edge).
        await loc.evaluate((el, v) => {
          const r = el.getBoundingClientRect()
          if (v === 'mid') el.scrollIntoView({ block: 'center', behavior: 'instant' })
          else if (v === 'top') window.scrollBy({ top: r.top - 40, behavior: 'instant' })
          else window.scrollBy({ top: r.bottom - (innerHeight - 40), behavior: 'instant' })
        }, variant)
        await page.waitForTimeout(150)
        const c = await loc.evaluate((el) => {
          const r = el.getClientRects()[0] || el.getBoundingClientRect()
          return { x: r.left + r.width / 2, y: r.top + r.height / 2, href: el.href, top: el.getBoundingClientRect().top, bottom: el.getBoundingClientRect().bottom }
        })
        if (c.top < 0 || c.bottom > h) continue // link not in view
        await page.mouse.move(c.x, c.y)
        await page.waitForTimeout(600)
        const isOpen = await page.evaluate(() => !!document.querySelector('.gh-pop.is-open'))
        if (isOpen) opened = { i, href: c.href, linkTop: c.top, linkBottom: c.bottom }
      }
      if (!opened) { log(`[${variant}] no preview opened (tried candidates in view)`); continue }
      log(`[${variant}] hovered link #${opened.i} ${opened.href} linkTop=${Math.round(opened.linkTop)} linkBottom=${Math.round(opened.linkBottom)}`)

      const m = await page.evaluate(() => {
        const pop = document.querySelector('.gh-pop.is-open')
        const r = pop.getBoundingClientRect()
        const card = pop.querySelector('a')
        return {
          rect: { top: r.top, left: r.left, bottom: r.bottom, right: r.right, width: r.width, height: r.height },
          innerHeight, innerWidth, scrollHeight: pop.scrollHeight, clientHeight: pop.clientHeight,
          scrollable: pop.scrollHeight > pop.clientHeight,
          overflowY: getComputedStyle(pop).overflowY,
          cardHref: card ? card.getAttribute('href') : null,
        }
      })
      const R = m.rect
      const conds = [['top >= 0', R.top >= 0], ['left >= 0', R.left >= 0], ['bottom <= innerHeight', R.bottom <= m.innerHeight], ['right <= innerWidth', R.right <= m.innerWidth]]
      log(`[${variant}] pop rect top=${R.top.toFixed(1)} left=${R.left.toFixed(1)} bottom=${R.bottom.toFixed(1)} right=${R.right.toFixed(1)} (w=${R.width.toFixed(0)} h=${R.height.toFixed(0)}) innerHeight=${m.innerHeight} innerWidth=${m.innerWidth}`)
      for (const [name, ok] of conds) { CHECKS++; if (!ok) FAILS++; log(`[${variant}] ${name}: ${ok ? 'PASS' : 'FAIL'}`) }
      log(`[${variant}] pop scrollable (scrollHeight ${m.scrollHeight} > clientHeight ${m.clientHeight}): ${m.scrollable}`)
      await page.screenshot({ path: outp(`82-preview-${w}x${h}${suffix}.png`) })
      log(`wrote 82-preview-${w}x${h}${suffix}.png`)

      if (h === 110) log(`[${variant}] .gh-pop scrollHeight=${m.scrollHeight} clientHeight=${m.clientHeight} overflow-y=${m.overflowY}`)
      if (m.scrollable) {
        const s = await page.evaluate(() => {
          const pop = document.querySelector('.gh-pop.is-open')
          pop.scrollTop = pop.scrollHeight
          const pr = pop.getBoundingClientRect()
          const a = pop.querySelector('a.gh-card').getBoundingClientRect()
          return {
            scrollTop: pop.scrollTop,
            inViewport: a.top >= 0 && a.bottom <= innerHeight && a.left >= 0 && a.right <= innerWidth,
            inPopArea: a.top >= pr.top && a.bottom <= pr.bottom,
            aTop: Math.round(a.top), aBottom: Math.round(a.bottom),
            bottomOk: a.bottom <= innerHeight, bottomNonNeg: a.bottom >= 0,
          }
        })
        log(`[${variant}] after scrolling pop to bottom: scrollTop=${s.scrollTop}; a.gh-card ${s.aTop}..${s.aBottom}px; bottom<=innerHeight: ${s.bottomOk ? 'YES' : 'NO'}; bottom>=0: ${s.bottomNonNeg ? 'YES' : 'NO'}; inside viewport: ${s.inViewport ? 'PASS' : 'FAIL'}; inside pop visible area: ${s.inPopArea ? 'PASS' : 'FAIL'}`)
      }
    } catch (e) {
      log(`ERROR [${variant} ${w}x${h}]: ${String(e.message || e).split('\n')[0]}`)
    }
  }
  await ctx.close()
}
await browser.close()
log(`SUMMARY: ${FAILS} FAIL of ${CHECKS} checks`)
fs.writeFileSync(outp('preview-bounds.txt'), lines.join('\n') + '\n')
console.log(`\nreport saved: ${outp('preview-bounds.txt')}`)
