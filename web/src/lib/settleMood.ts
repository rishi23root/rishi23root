/**
 * Settles the homepage mood by growing the left column + plate together.
 *
 * Await: no mood track (text uses the full split). Settle: soft left→right
 * expand of grid track + gap; the plate fills that growing column — space and
 * image open as one. Never reserved empty mood space, never from behind text.
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

function expandLayout(
  split: HTMLElement,
  mood: HTMLElement,
  plate: HTMLElement,
): Promise<unknown> {
  const html = document.documentElement

  // Jump to settled grid to read final track sizes, then pin collapsed
  // before paint so WAAPI's from-keyframe owns the first frame.
  html.classList.add('mood-settling', 'mood-settled')
  html.classList.remove('mood-await')

  const moodW = mood.getBoundingClientRect().width
  const gapPx = parseFloat(getComputedStyle(split).columnGap) || 0

  split.style.gridTemplateColumns = '0px minmax(0, 1fr)'
  split.style.columnGap = '0px'
  mood.style.overflow = 'hidden'
  mood.style.minWidth = '0'

  const { duration, easing } = motion()
  const timing = { duration, easing, fill: 'both' as const }

  // Column + gap grow left→right; plate is width:100% of the track so it
  // expands with the space (overflow clips until the track is wide enough).
  const splitAnim = split.animate(
    [
      {
        gridTemplateColumns: '0px minmax(0, 1fr)',
        columnGap: '0px',
      },
      {
        gridTemplateColumns: `${moodW}px minmax(0, 1fr)`,
        columnGap: `${gapPx}px`,
      },
    ],
    timing,
  )

  const plateAnim = plate.animate(
    [
      { opacity: 0.78 },
      { opacity: 1 },
    ],
    timing,
  )

  return Promise.all([splitAnim.finished, plateAnim.finished])
    .catch(() => undefined)
    .finally(() => {
      html.classList.remove('mood-settling')
      split.style.gridTemplateColumns = ''
      split.style.columnGap = ''
      mood.style.overflow = ''
      mood.style.minWidth = ''
      splitAnim.cancel()
      plateAnim.cancel()
    })
}

async function run() {
  const html = document.documentElement
  if (!html.classList.contains('mood-await')) return

  await pageVtFinished()
  // Brief beat on the text-only layout (no empty mood hole).
  await new Promise((r) => window.setTimeout(r, 200))

  if (!html.classList.contains('mood-await')) return

  const split = document.querySelector<HTMLElement>('.home-split')
  const mood = document.querySelector<HTMLElement>('.home-mood')
  const plate = document.querySelector<HTMLElement>('.home-mood .hero-shell-stage')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (reduced || !split || !mood || !plate || typeof split.animate !== 'function') {
    html.classList.add('mood-settled')
    html.classList.remove('mood-await')
    return
  }

  await expandLayout(split, mood, plate)
}

/** Call when the first mood image is ready (or if it fails). Safe to call often. */
export function settleMoodLayout() {
  if (started || typeof document === 'undefined') return
  started = true
  void run()
}
