/**
 * Settles the homepage mood into the left column.
 *
 * Await already uses the mood-left / text-right split (with gap). The plate
 * starts clipped away and expands from the left only — never from behind the
 * text. Soft ease, no snap / bounce.
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

function expandFromLeft(plate: HTMLElement): Promise<unknown> {
  const html = document.documentElement
  html.classList.add('mood-settling', 'mood-settled')
  html.classList.remove('mood-await')

  const { duration, easing } = motion()
  // `both` = apply the clipped from-keyframe immediately (no flash) and hold
  // the end until we cancel in finally.
  const plateAnim = plate.animate(
    [
      {
        // Fully clipped from the right → reveal grows left → right.
        clipPath: 'inset(0 100% 0 0)',
        opacity: 0.72,
      },
      {
        clipPath: 'inset(0 0 0 0)',
        opacity: 1,
      },
    ],
    { duration, easing, fill: 'both' },
  )

  return plateAnim.finished
    .catch(() => undefined)
    .finally(() => {
      html.classList.remove('mood-settling')
      plateAnim.cancel()
    })
}

async function run() {
  const html = document.documentElement
  if (!html.classList.contains('mood-await')) return

  await pageVtFinished()
  // A short beat so the split + empty left column is actually seen.
  await new Promise((r) => window.setTimeout(r, 240))

  if (!html.classList.contains('mood-await')) return

  const plate = document.querySelector<HTMLElement>('.home-mood .hero-shell-stage')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (reduced || !plate || typeof plate.animate !== 'function') {
    html.classList.add('mood-settled')
    html.classList.remove('mood-await')
    return
  }

  await expandFromLeft(plate)
}

/** Call when the first mood image is ready (or if it fails). Safe to call often. */
export function settleMoodLayout() {
  if (started || typeof document === 'undefined') return
  started = true
  void run()
}
