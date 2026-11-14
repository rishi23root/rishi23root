/**
 * Settles the homepage from the centered "await" layout into the split.
 *
 * Mood emerges from behind the text (measured FLIP). Text eases to the
 * right track first; the plate follows a beat later at slightly lower
 * opacity so a clear gap opens — no flush edge, no vertical offset.
 * Soft ease, continuous width (`fill: 'both'`), no snap / bounce.
 */

/** Fallback for --mood-settle / --ease-settle in global.css; keep in sync. */
const SETTLE_MS = 1600
const SETTLE_EASE = 'cubic-bezier(0.33, 0, 0.1, 1)'
/** Let text clear first so the plate isn't flush against it mid-slide. */
const PLATE_DELAY_MS = 120
/** Travel opacity — plate is quieter while emerging, full at rest. */
const PLATE_TRAVEL_OPACITY = 0.72

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
  const textTiming = { duration, easing, fill: 'both' as const }
  const plateTiming = {
    duration,
    easing,
    fill: 'both' as const,
    delay: PLATE_DELAY_MS,
  }

  // Vertical: measured tops only — no extra lower offset.
  const dx = firstPlate.left - lastPlate.left
  const dy = firstPlate.top - lastPlate.top
  const scale = lastPlate.width ? firstPlate.width / lastPlate.width : 1

  const plateAnim = plate.animate(
    [
      {
        transformOrigin: '0 0',
        transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
        opacity: PLATE_TRAVEL_OPACITY,
      },
      {
        transformOrigin: '0 0',
        transform: 'none',
        opacity: 1,
      },
    ],
    plateTiming,
  )

  const textAnim = text.animate(
    [
      {
        transform: `translate(${firstText.left - lastText.left}px, ${firstText.top - lastText.top}px)`,
        width: `${firstText.width}px`,
      },
      { transform: 'none', width: `${lastText.width}px` },
    ],
    textTiming,
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
