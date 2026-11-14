/**
 * Settles the homepage from the centered "await" layout into the split.
 *
 * One measured FLIP slide, no view transition: the same text block (one nav,
 * one copy) and the same plate move from where they were to where the split
 * puts them. Both ends are read from the live layout.
 *
 * Text width is interpolated continuously (WAAPI `width` + `fill: 'both'`) so
 * the first paint after dropping `mood-await` still shows the post-group
 * measure — no hard snap. Bio / stack copy stay on `--home-col` in CSS so
 * their lines don't re-wrap during the slide.
 */

/** Fallback for --mood-settle / --ease-settle in global.css; keep in sync. */
const SETTLE_MS = 1600
const SETTLE_EASE = 'cubic-bezier(0.33, 0, 0.1, 1)'

let started = false

function pageVtFinished(): Promise<void> {
  return Promise.resolve(window.__homePageVt).then(
    () => undefined,
    () => undefined,
  )
}

function motion(): { duration: number; easing: string } {
  const css = getComputedStyle(document.documentElement)
  // The CSS minifier may rewrite 1600ms as 1.6s, so honour the unit.
  const raw = css.getPropertyValue('--mood-settle').trim()
  const ms = parseFloat(raw) * (/\ds$/.test(raw) ? 1000 : 1)
  return {
    duration: Number.isFinite(ms) && ms > 0 ? ms : SETTLE_MS,
    easing: css.getPropertyValue('--ease-settle').trim() || SETTLE_EASE,
  }
}

function slide(text: HTMLElement, plate: HTMLElement): Promise<unknown> {
  const html = document.documentElement
  const firstText = text.getBoundingClientRect()
  const firstPlate = plate.getBoundingClientRect()

  html.classList.add('mood-settling', 'mood-settled')
  html.classList.remove('mood-await')

  // Final layout (sync, before paint).
  const lastText = text.getBoundingClientRect()
  const lastPlate = plate.getBoundingClientRect()

  // Hold await width as an inline style through the first paint so content
  // cannot snap to the settled track before WAAPI's from-keyframe applies.
  text.style.boxSizing = 'border-box'
  text.style.width = `${firstText.width}px`
  text.style.maxWidth = 'none'

  const { duration, easing } = motion()
  // `both` = apply from-keyframe immediately (no flash) and hold the end
  // until we cancel in finally.
  const timing = { duration, easing, fill: 'both' as const }

  const scale = lastPlate.width ? firstPlate.width / lastPlate.width : 1
  const plateAnim = plate.animate(
    [
      {
        transformOrigin: '0 0',
        transform: `translate(${firstPlate.left - lastPlate.left}px, ${
          firstPlate.top - lastPlate.top
        }px) scale(${scale})`,
      },
      { transformOrigin: '0 0', transform: 'none' },
    ],
    timing,
  )

  const textAnim = text.animate(
    [
      {
        transform: `translate(${firstText.left - lastText.left}px, ${firstText.top - lastText.top}px)`,
        width: `${firstText.width}px`,
      },
      { transform: 'none', width: `${lastText.width}px` },
    ],
    timing,
  )

  // WAAPI now owns width; drop the inline pin on the next frame.
  requestAnimationFrame(() => {
    text.style.width = ''
    text.style.maxWidth = ''
    text.style.boxSizing = ''
  })

  return Promise.all([plateAnim.finished, textAnim.finished])
    .catch(() => undefined)
    .finally(() => {
      html.classList.remove('mood-settling')
      text.style.width = ''
      text.style.maxWidth = ''
      text.style.boxSizing = ''
      // Drop fill:both so normal grid width takes over cleanly.
      textAnim.cancel()
      plateAnim.cancel()
    })
}

async function run() {
  const html = document.documentElement
  if (!html.classList.contains('mood-await')) return

  await pageVtFinished()
  // A short beat so the centered, writing-like layout is actually seen.
  await new Promise((r) => window.setTimeout(r, 240))

  if (!html.classList.contains('mood-await')) return

  const text = document.querySelector<HTMLElement>('.home-text')
  const plate = document.querySelector<HTMLElement>('.home-mood .hero-shell-stage')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (reduced || !text || !plate || typeof text.animate !== 'function') {
    html.classList.add('mood-settled')
    html.classList.remove('mood-await')
    return
  }

  await slide(text, plate)
}

/** Call when the first mood image is ready (or if it fails). Safe to call often. */
export function settleMoodLayout() {
  if (started || typeof document === 'undefined') return
  started = true
  void run()
}
