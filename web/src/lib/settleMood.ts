/**
 * Settles the homepage from the centered "await" layout into the split.
 *
 * Mood emerges from behind the text (measured FLIP). Once the plate's right
 * edge clears the text, travel keeps ~`--home-gap` between plate-right and
 * text-left (not flush at the corner). Same vertical start; opacity 0.72→1;
 * soft ease; continuous text width (`fill: 'both'`).
 */

/** Fallback for --mood-settle / --ease-settle in global.css; keep in sync. */
const SETTLE_MS = 1600
const SETTLE_EASE = 'cubic-bezier(0.33, 0, 0.1, 1)'
/** Let text ease right before the plate starts moving. */
const PLATE_DELAY_MS = 120
/** Travel opacity — quieter while emerging, full at rest. */
const PLATE_TRAVEL_OPACITY = 0.72
/** Dense samples so the emerge jump stays near one frame. */
const PLATE_SAMPLES = Array.from({ length: 41 }, (_, i) => i / 40)

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

/** Approximate cubic-bezier(0.33, 0, 0.1, 1) for keyframe baking. */
function softEase(t: number): number {
  if (t <= 0) return 0
  if (t >= 1) return 1
  // Newton solve x for cubic bezier x1=0.33, x2=0.1 (y1=0, y2=1).
  let x = t
  for (let i = 0; i < 6; i++) {
    const x1 = 0.33
    const x2 = 0.1
    const cx = 3 * x1
    const bx = 3 * (x2 - x1) - cx
    const ax = 1 - cx - bx
    const dx = ((ax * x + bx) * x + cx) * x - t
    const ddx = (3 * ax * x + 2 * bx) * x + cx
    if (Math.abs(ddx) < 1e-6) break
    x -= dx / ddx
  }
  const y1 = 0
  const y2 = 1
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  return ((ay * x + by) * x + cy) * x
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function readHomeGap(split: Element, fallback: number): number {
  const raw = getComputedStyle(split).getPropertyValue('--home-gap').trim()
  if (!raw) return fallback
  // Resolve via a probe on column-gap when settled (already computed px).
  const gap = parseFloat(getComputedStyle(split).columnGap)
  return Number.isFinite(gap) && gap > 0 ? gap : fallback
}

function slide(text: HTMLElement, plate: HTMLElement, split: HTMLElement): Promise<unknown> {
  const html = document.documentElement
  const firstText = text.getBoundingClientRect()
  const firstPlate = plate.getBoundingClientRect()

  html.classList.add('mood-settling', 'mood-settled')
  html.classList.remove('mood-await')

  // Final layout (sync, before paint).
  const lastText = text.getBoundingClientRect()
  const lastPlate = plate.getBoundingClientRect()
  const settledGap = lastText.left - lastPlate.right
  const gapPx = Math.max(readHomeGap(split, settledGap), settledGap, 1)

  // Hold await width as an inline style through the first paint so content
  // cannot snap to the settled track before WAAPI's from-keyframe applies.
  text.style.boxSizing = 'border-box'
  text.style.width = `${firstText.width}px`
  text.style.maxWidth = 'none'

  const { duration, easing } = motion()
  const textTiming = { duration, easing, fill: 'both' as const }

  const dx0 = firstPlate.left - lastPlate.left
  const dy0 = firstPlate.top - lastPlate.top
  const scale0 = lastPlate.width ? firstPlate.width / lastPlate.width : 1

  // Bake soft ease into plate keyframes; use linear effect timing so the
  // horizontal gap constraint is evaluated on the real eased path.
  const plateKeys = PLATE_SAMPLES.map((offset) => {
    const t = softEase(offset)
    // Text wall-clock progress while this plate sample plays (plate is delayed).
    const wall = Math.min(1, (PLATE_DELAY_MS + offset * duration) / duration)
    const textT = softEase(wall)
    const textLeft = lerp(firstText.left, lastText.left, textT)

    const naturalScale = lerp(scale0, 1, t)
    const naturalLeft = lastPlate.left + lerp(dx0, 0, t)
    const naturalRight = naturalLeft + lastPlate.width * naturalScale

    // Stay behind the text until natural clearance can keep ~`--home-gap`.
    // Do not peek flush at the text corner (right edge in (textLeft−gap, textLeft)).
    const width = lastPlate.width * naturalScale
    let left = naturalLeft
    if (naturalRight < textLeft && textLeft - naturalRight < gapPx) {
      // Would emerge into the flush zone — keep right edge under textLeft.
      left = textLeft - width
    }

    const dx = left - lastPlate.left
    const dy = lerp(dy0, 0, t) // measured vertical only — no extra offset
    const scale = naturalScale
    const opacity = lerp(PLATE_TRAVEL_OPACITY, 1, t)

    return {
      offset,
      transformOrigin: '0 0',
      transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
      opacity,
    }
  })

  const plateAnim = plate.animate(plateKeys, {
    duration,
    // Ease is baked into samples; linear keeps constraint offsets honest.
    easing: 'linear',
    fill: 'both',
    delay: PLATE_DELAY_MS,
  })

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
      textAnim.cancel()
      plateAnim.cancel()
    })
}

async function run() {
  const html = document.documentElement
  if (!html.classList.contains('mood-await')) return

  await pageVtFinished()
  await new Promise((r) => window.setTimeout(r, 240))

  if (!html.classList.contains('mood-await')) return

  const split = document.querySelector<HTMLElement>('.home-split')
  const text = document.querySelector<HTMLElement>('.home-text')
  const plate = document.querySelector<HTMLElement>('.home-mood .hero-shell-stage')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (reduced || !split || !text || !plate || typeof text.animate !== 'function') {
    html.classList.add('mood-settled')
    html.classList.remove('mood-await')
    return
  }

  await slide(text, plate, split)
}

/** Call when the first mood image is ready (or if it fails). Safe to call often. */
export function settleMoodLayout() {
  if (started || typeof document === 'undefined') return
  started = true
  void run()
}
