/** Settles the homepage from the centered "await" layout into the split. */

const SETTLE_MS = 780

let started = false

function pageVtFinished(): Promise<void> {
  const pending = (window as Window & { __homePageVt?: Promise<unknown> }).__homePageVt
  if (pending) return Promise.resolve(pending).then(() => undefined, () => undefined)
  return Promise.resolve()
}

function flip(text: HTMLElement, plate: HTMLElement) {
  const firstText = text.getBoundingClientRect()
  const firstPlate = plate.getBoundingClientRect()

  document.documentElement.classList.remove('mood-await')

  const lastText = text.getBoundingClientRect()
  const lastPlate = plate.getBoundingClientRect()
  const ease = getComputedStyle(document.documentElement).getPropertyValue('--ease-out').trim() ||
    'cubic-bezier(0.22, 1, 0.36, 1)'

  text.animate(
    [
      { transform: `translateX(${firstText.left - lastText.left}px)` },
      { transform: 'none' },
    ],
    { duration: SETTLE_MS, easing: ease, fill: 'none' },
  )
  plate.animate(
    [
      { transform: `translateX(${firstPlate.left - lastPlate.left}px)` },
      { transform: 'none' },
    ],
    { duration: SETTLE_MS, easing: ease, fill: 'none' },
  )
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
  if (started) return
  if (typeof document === 'undefined') return
  if (!document.documentElement.classList.contains('mood-await')) {
    started = true
    return
  }
  started = true
  void run()
}
