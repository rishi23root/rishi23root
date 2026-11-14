/**
 * Settles the homepage from the centered "await" layout into the split.
 *
 * One measured FLIP slide, no view transition: the same text block (one nav,
 * one copy) and the same plate move from where they were to where the split
 * puts them. Nothing is hardcoded: both ends are read from the live layout,
 * so it lands correctly at any desktop width.
 *
 * Text: its left edge slides with translateX while its box width eases from
 * the Writing / post-group measure down to the settled text track on the
 * same curve, so both edges glide together. Copy inside is width:100% of
 * that column, so lines ease with the animated width (await looks like a
 * full readable measure; settled matches the mood+text split).
 */

/** Fallback for --mood-settle in global.css; keep the two in sync. */
const SETTLE_MS = 900
const SETTLE_EASE = 'cubic-bezier(0.45, 0, 0.15, 1)'

let started = false

function pageVtFinished(): Promise<void> {
  return Promise.resolve(window.__homePageVt).then(
    () => undefined,
    () => undefined,
  )
}

function motion(): { duration: number; easing: string } {
  const css = getComputedStyle(document.documentElement)
  // The CSS minifier may rewrite 900ms as .9s, so honour the unit.
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

  // Final layout (forced synchronously, before the next paint).
  const lastText = text.getBoundingClientRect()
  const lastPlate = plate.getBoundingClientRect()
  const timing = { ...motion(), fill: 'none' as const }

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

  return Promise.all([plateAnim.finished, textAnim.finished])
    .catch(() => undefined)
    .finally(() => html.classList.remove('mood-settling'))
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
