import { readFile, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { chromium } from 'playwright'
import sharp from 'sharp'

const root = fileURLToPath(new URL('../..', import.meta.url))
const publicDir = path.join(root, 'web/public')
const site = JSON.parse(await readFile(path.join(root, 'content/site.json'), 'utf8'))
const image = (file, type) =>
  `data:${type};base64,${readFileSync(file).toString('base64')}`

const mood = image(path.join(publicDir, 'mood/cyclist.webp'), 'image/webp')
const favicon = image(path.join(publicDir, 'favicon.svg'), 'image/svg+xml')
const font = image(path.join(publicDir, 'fonts/source-sans-3-latin.woff2'), 'font/woff2')
const bio = site.shortBio[0].toUpperCase() + site.shortBio.slice(1)
const browser = await chromium.launch()

try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await page.setContent(`<!doctype html>
    <html><head><style>
      @font-face {
        font-family: 'Source Sans 3';
        src: url('${font}') format('woff2');
        font-weight: 100 900;
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; width: 1200px; height: 630px; }
      body { background: #1c1b19; color: #f2ebe0; font-family: 'Source Sans 3', sans-serif; }
      main { height: 100%; display: flex; align-items: center; padding: 56px 80px; gap: 48px; }
      section { flex: 1; min-width: 0; }
      h1 { margin: 0; font-size: 84px; font-weight: 700; letter-spacing: -2px; line-height: 1; }
      .handle { margin: 12px 0 42px; color: rgba(242,235,224,.68); font-size: 30px; }
      .bio { margin: 0; font-size: 31px; line-height: 1.25; }
      .url { margin: 54px 0 0; color: rgba(242,235,224,.68); font: 20px ui-monospace, monospace; letter-spacing: .02em; }
      .portrait { width: 440px; height: 518px; object-fit: cover; object-position: center; border-radius: 22px; }
    </style></head><body><main>
      <section><h1>Rishabh</h1><p class="handle">@rishi23root</p><p class="bio">${bio}</p><p class="url">rishi23root.in</p></section>
      <img class="portrait" src="${mood}" alt="">
    </main></body></html>`)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: path.join(publicDir, 'og-default.png') })

  await page.setViewportSize({ width: 180, height: 180 })
  await page.setContent(`<body style="margin:0;background:#0f1216"><img src="${favicon}" style="display:block;width:180px;height:180px"></body>`)
  await page.screenshot({ path: path.join(publicDir, 'apple-touch-icon.png') })
  for (const file of ['og-default.png', 'apple-touch-icon.png']) {
    const output = path.join(publicDir, file)
    const png = await sharp(output).png({ palette: true, quality: 90, effort: 10 }).toBuffer()
    await writeFile(output, png)
  }
  const size = (await readFile(path.join(publicDir, 'og-default.png'))).byteLength
  if (size > 150 * 1024) throw new Error(`og-default.png is ${Math.ceil(size / 1024)} KB; maximum is 150 KB`)
} finally {
  await browser.close()
}
