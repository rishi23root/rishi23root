import { useCallback, useEffect, useRef, useState } from 'react'
import MoodStill from './moods/MoodStill'
import { adoptCurrentMood, advanceMood, cyclePosition, peekNextMood } from './moods/cycle'
import { DESKTOP_MQ } from './moods/media'
import type { MoodSlot } from './moods/types'
import { settleMoodLayout } from '../lib/settleMood'

type Props = {
  moods: MoodSlot[]
  /** Link for the "all moods" chip. */
  allMoodsHref?: string
}

/** Crossfade length; mirrored by --mood-xfade in global.css. */
const XFADE_MS = 420

function useDesktop(): boolean {
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP_MQ).matches)
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ)
    const onChange = () => setDesktop(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return desktop
}

/** `?mood=<id>` (links from /mood) forces the first mood shown. */
function readMoodParam(): string | null {
  return new URLSearchParams(window.location.search).get('mood')
}

const byId = (moods: MoodSlot[], id: string | null | undefined) =>
  id ? moods.find((m) => m.id === id) : undefined

function initialSlot(moods: MoodSlot[], forced?: string | null): MoodSlot | null {
  if (!moods.length) return null
  const hit = byId(moods, forced)
  if (hit) return hit
  // The head script already advanced the bag for this load: adopt its pick.
  const early = window.__heroMoodFirst
  window.__heroMoodFirst = undefined
  if (early) {
    const adopted = byId(moods, adoptCurrentMood(moods) ?? early)
    if (adopted) return adopted
  }
  return byId(moods, advanceMood(moods)) ?? moods[0]
}

const prefetched = new Set<string>()

function prefetch(src?: string) {
  if (!src || prefetched.has(src)) return
  prefetched.add(src)
  const img = new Image()
  img.decoding = 'async'
  img.fetchPriority = 'low'
  img.src = src
}

/** Run once the page (incl. the first mood image) has loaded, then idle. */
function afterLoad(fn: () => void): () => void {
  let cancelIdle: (() => void) | undefined
  const run = () => {
    if (window.requestIdleCallback) {
      const id = window.requestIdleCallback(fn, { timeout: 2000 })
      cancelIdle = () => window.cancelIdleCallback(id)
    } else {
      const id = window.setTimeout(fn, 200)
      cancelIdle = () => window.clearTimeout(id)
    }
  }
  if (document.readyState === 'complete') run()
  else window.addEventListener('load', run, { once: true })
  return () => {
    window.removeEventListener('load', run)
    cancelIdle?.()
  }
}

/**
 * Portrait mood plate. Mounted client:only so each full page load advances the
 * shuffle-bag cycle (no repeats until every mood has been seen). "next" in the
 * overlay advances the same cycle in place with a crossfade.
 */
export default function HeroMoodShell({ moods, allMoodsHref = '/mood' }: Props) {
  const desktop = useDesktop()
  // Below 1024px the plate is display:none — pick nothing, mount no <img>.
  // The first mood is chosen the first time the viewport is desktop-sized.
  const [slot, setSlot] = useState<MoodSlot | null>(() =>
    desktop ? initialSlot(moods, readMoodParam()) : null,
  )
  const [leaving, setLeaving] = useState<MoodSlot | null>(null)
  const [pos, setPos] = useState(() => cyclePosition())
  const [revealed, setRevealed] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const plateReady = useRef(false)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  // If the first still never loads, don't leave the page stuck centered.
  useEffect(() => {
    const fallback = window.setTimeout(() => settleMoodLayout(), 2500)
    return () => window.clearTimeout(fallback)
  }, [])

  const onPlateReady = useCallback(() => {
    if (plateReady.current) return
    plateReady.current = true
    settleMoodLayout()
  }, [])

  useEffect(() => {
    if (desktop && !slot) {
      setSlot(initialSlot(moods, readMoodParam()))
      setPos(cyclePosition())
    }
  }, [desktop, slot, moods])

  // Warm the cache for the one mood "next" will show — desktop only, and only
  // once the current image has loaded so it never competes with it.
  useEffect(() => {
    if (!desktop || !slot) return
    return afterLoad(() => {
      const target = byId(moods, peekNextMood(moods))
      if (target && target.id !== slot.id) prefetch(target.src)
    })
  }, [desktop, moods, slot])

  useEffect(() => {
    if (slot && !slot.src) onPlateReady()
  }, [slot, onPlateReady])

  const next = useCallback(() => {
    const target = byId(moods, advanceMood(moods))
    if (!target || target.id === slot?.id) return
    window.clearTimeout(timer.current)
    setLeaving(slot)
    setSlot(target)
    setPos(cyclePosition())
    timer.current = window.setTimeout(() => setLeaving(null), XFADE_MS)
  }, [moods, slot])

  const label = slot ? slot.alt || `${slot.id} mood illustration` : 'Mood illustration placeholder'

  if (!desktop) return <div className="hero-shell" data-mood-id="none" aria-hidden="true" />

  const renderSlot = (s: MoodSlot, key: string, className: string, reportReady = false) =>
    s.src ? (
      <MoodStill
        key={key}
        src={s.src}
        className={className}
        onReady={reportReady ? onPlateReady : undefined}
      />
    ) : (
      // Placeholder for a mood with no image yet.
      <div key={key} className="hero-shell-empty" aria-hidden="true" />
    )

  return (
    <div
      className="hero-shell"
      data-mood-id={slot?.id ?? 'none'}
      data-revealed={revealed ? 'true' : 'false'}
    >
      <div
        className="hero-shell-stage mood-inset"
        // Tap anywhere on the plate (touch) toggles the overlay.
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('a,button')) return
          setRevealed((v) => !v)
        }}
      >
        <div className="hero-shell-art" role="img" aria-label={label}>
          {leaving ? renderSlot(leaving, `out-${leaving.id}`, 'is-leaving') : null}
          {slot ? (
            renderSlot(slot, `in-${slot.id}`, leaving ? 'is-entering' : '', !leaving)
          ) : (
            <div className="hero-shell-empty" aria-hidden="true" />
          )}
        </div>

        {slot ? (
          <div className="mood-overlay">
            <div className="mood-overlay-row mood-overlay-top">
              <span className="mood-chip">
                <span className="mood-chip-label">mood</span>
                {pos ? (
                  <span className="mood-chip-count">
                    {String(pos.n).padStart(2, '0')}/{String(pos.total).padStart(2, '0')}
                  </span>
                ) : null}
              </span>
              <a
                className="mood-chip mood-chip-link"
                href={allMoodsHref}
                aria-label="See all moods"
                tabIndex={-1}
              >
                all <span aria-hidden="true">→</span>
              </a>
            </div>
            <div className="mood-overlay-row mood-overlay-bottom">
              <span className="mood-chip mood-chip-name" aria-live="polite">
                {slot.id}
              </span>
              <button
                type="button"
                className="mood-chip mood-chip-next"
                tabIndex={-1}
                onClick={(e) => {
                  next()
                  // A pointer click focuses the button even with tabIndex={-1},
                  // which would keep the chips up after the cursor leaves.
                  if (e.detail > 0) e.currentTarget.blur()
                }}
              >
                next <span aria-hidden="true">›</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
