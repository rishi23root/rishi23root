import { createMoodBag, MOOD_CYCLE_KEY } from './cycle'
import { DESKTOP_MQ } from './media'
import type { MoodSlot } from './types'

/**
 * Runs inline in <head> (serialized with toString, so it must stay
 * self-contained): picks the first mood exactly as HeroMoodShell would —
 * `?mood=<id>` wins, else advance the shuffle bag — and starts its download
 * before React hydrates. Desktop only; the plate is display:none below it.
 * The pick is handed over on window.__heroMoodFirst so React does not
 * advance again.
 */
function preloadFirstMood(
  moods: Pick<MoodSlot, 'id' | 'src'>[],
  key: string,
  desktopMq: string,
  makeBag: typeof createMoodBag,
): void {
  try {
    if (!window.matchMedia(desktopMq).matches) return
    const ids = moods.map((m) => m.id)
    const forced = new URLSearchParams(window.location.search).get('mood')
    let id = forced && ids.indexOf(forced) !== -1 ? forced : null
    if (!id) {
      const bag = makeBag(key)
      const next = bag.advance(ids, bag.read(ids))
      id = next.order[next.index]
    }
    window.__heroMoodFirst = id
    const hit = moods.find((m) => m.id === id)
    if (hit && hit.src) {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = hit.src
      if (/\.webp$/.test(hit.src)) link.type = 'image/webp'
      link.setAttribute('fetchpriority', 'high')
      link.setAttribute('data-hero-mood', id)
      document.head.appendChild(link)
    }
  } catch {
    /* never block the page over a preload */
  }
}

/** The inline script source for index.astro's <head>. */
export function firstMoodPreloadScript(moods: MoodSlot[]): string {
  // Only what the script needs; `<` escaped so data can't close the tag.
  const args = [moods.map(({ id, src }) => ({ id, src })), MOOD_CYCLE_KEY, DESKTOP_MQ]
    .map((v) => JSON.stringify(v).replace(/</g, '\\u003c'))
    .join(',')
  return `(${preloadFirstMood})(${args},${createMoodBag})`
}
