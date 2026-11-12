/** Settles the homepage from the centered "await" layout into the split. */

/** Mirrored by --mood-settle in global.css. */
const SETTLE_MS = 780

let started = false

function pageVtFinished(): Promise<void> {
  return Promise.resolve(window.__homePageVt).then(
    () => undefined,
    () => undefined,
  )
}

function flip(text: HTMLElement, plate: HTMLElement) {
  const firstText = text.getBoundingClientRect()
  const firstPlate = plate.getBoundingClientRect()

  document.documentElement.classList.remove('mood-await')

  const ease = getComputedStyle(document.documentElement).getPropertyValue('--ease-out').trim() ||
    'cubic-bezier(0.22, 1, 0.36, 1)'

  const slide = (el: HTMLElement, first: DOMRect) =>
    el.animate(
      [
        { transform: `translateX(${first.left - el.getBoundingClientRect().left}px)` },
        { transform: 'none' },
      ],
      { duration: SETTLE_MS, easing: ease, fill: 'none' },
    )
  slide(text, firstText)
  slide(plate, firstPlate)
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

  if (reduced || !text || !plate) {
    html.classList.remove('mood-await')
    return
  }

  const startVt = document.startViewTransition?.bind(document)
  if (typeof startVt === 'function') {
    html.classList.add('vt-mood-settle')
    try {
      const vt = startVt(() => {
        html.classList.remove('mood-await')
      })
      await vt.finished.catch(() => undefined)
    } finally {
      html.classList.remove('vt-mood-settle')
    }
    return
  }

  flip(text, plate)
}

/** Call when the first mood image is ready (or if it fails). Safe to call often. */
export function settleMoodLayout() {
  if (started || typeof document === 'undefined') return
  started = true
  void run()
}
