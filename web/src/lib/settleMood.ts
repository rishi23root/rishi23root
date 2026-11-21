import { DESKTOP_MQ } from '../components/moods/media'

/**
 * Settles the homepage from the centered "await" layout into the split.
 *
 * `mood-await` matches inner pages' `--post-group` width so coming back from
 * `/writing`, `/projects`, or `/mood` keeps `site-chrome` and the centered
 * measure seamless. `slide()` moves `.home-text` (`translate`), the mood plate,
 * and trailing right-aligned elements (`.chrome-end`, `.home-section-more`,
 * `.home-writing-list time` via `translateX`) purely on the compositor with zero
 * `width` animation or text reflow.
 */

/** Fallback for --mood-settle / --ease-settle in global.css; keep in sync. */
const SETTLE_MS = 1600
const SETTLE_EASE = 'cubic-bezier(0.33, 0, 0.1, 1)'
/** Let text clear first so the plate isn't flush against it mid-slide. */
const PLATE_DELAY_MS = 120
/** Travel opacity — plate is quieter while emerging, full at rest. */
const PLATE_TRAVEL_OPACITY = 0.72

let started = false

function clearHeadFailsafe() {
  window.__moodAwaitCleanup?.()
}

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
  const plateFrom =
    Math.abs(scale - 1) > 0.001
      ? `translate(${dx}px, ${dy}px) scale(${scale})`
      : `translate(${dx}px, ${dy}px)`

  const plateAnim = plate.animate(
    [
      {
        transform: plateFrom,
        opacity: PLATE_TRAVEL_OPACITY,
      },
      {
        transform: 'none',
        opacity: 1,
      },
    ],
    plateTiming,
  )

  const textDx = firstText.left - lastText.left
  const textDy = firstText.top - lastText.top
  const textAnim = text.animate(
    [
      { transform: `translate(${textDx}px, ${textDy}px)` },
      { transform: 'none' },
    ],
    textTiming,
  )

  const anims: Animation[] = [plateAnim, textAnim]
  const widthDelta = firstText.width - lastText.width
  if (Math.abs(widthDelta) > 0.5) {
    text
      .querySelectorAll<HTMLElement>('.chrome-end, .home-section-more, .home-writing-list time')
      .forEach((el) => {
        anims.push(
          el.animate([{ transform: `translateX(${widthDelta}px)` }, { transform: 'none' }], textTiming),
        )
      })
  }

  // If the viewport drops below desktop mid-slide, abort immediately so
  // mobile layout is never held offset by a desktop transform.
  const mq = window.matchMedia(DESKTOP_MQ)
  const onMqChange = () => {
    if (!mq.matches) {
      anims.forEach((a) => a.cancel())
    }
  }
  mq.addEventListener('change', onMqChange)

  return Promise.all(anims.map((a) => a.finished))
    .catch(() => undefined)
    .finally(() => {
      mq.removeEventListener('change', onMqChange)
      html.classList.remove('mood-settling')
      // Drop fill:both so resting layout owns transform/opacity cleanly.
      anims.forEach((a) => a.cancel())
    })
}

async function run() {
  const html = document.documentElement
  if (!html.classList.contains('mood-await')) return

  await pageVtFinished()
  // A short beat so the centered layout is actually seen.
  await new Promise((r) => window.setTimeout(r, 240))

  if (!html.classList.contains('mood-await')) return
  clearHeadFailsafe()

  const text = document.querySelector<HTMLElement>('.home-text')
  const plate = document.querySelector<HTMLElement>('.home-mood .hero-shell-stage')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const desktop = window.matchMedia(DESKTOP_MQ).matches

  if (reduced || !desktop || !text || !plate || typeof text.animate !== 'function') {
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
