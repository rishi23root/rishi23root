import { useCallback, useEffect, useRef, useState } from 'react'
import MoodStill from './moods/MoodStill'
import MoodStub from './moods/MoodStub'
import { advanceMood, cyclePosition } from './moods/cycle'
import type { MoodSlot } from './moods/types'

type Props = {
  moods: MoodSlot[]
  /** Link for the "all moods" chip. */
  allMoodsHref?: string
}

/** Crossfade length; mirrored by --mood-xfade in global.css. */
const XFADE_MS = 420

/** `?mood=<id>` (links from /mood) forces the first mood shown. */
function readMoodParam(): string | null {
  return new URLSearchParams(window.location.search).get('mood')
}

function initialSlot(moods: MoodSlot[], forced?: string | null): MoodSlot | null {
  if (!moods.length) return null
  if (forced) {
    const hit = moods.find((m) => m.id === forced)
    if (hit) return hit
  }
  const id = advanceMood(moods)
  return moods.find((m) => m.id === id) ?? moods[0] ?? null
}

function preload(src?: string) {
  if (!src || typeof Image === 'undefined') return
  const img = new Image()
  img.decoding = 'async'
  img.src = src
}

/**
 * Portrait mood plate. Mounted client:only so each full page load advances the
 * shuffle-bag cycle (no repeats until every mood has been seen). "next" in the
 * overlay advances the same cycle in place with a crossfade.
 */
export default function HeroMoodShell({ moods, allMoodsHref = '/mood' }: Props) {
  const [slot, setSlot] = useState<MoodSlot | null>(() => initialSlot(moods, readMoodParam()))
  const [leaving, setLeaving] = useState<MoodSlot | null>(null)
  const [pos, setPos] = useState(() => cyclePosition())
  const [revealed, setRevealed] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Warm the cache for whatever "next" is likely to show.
  useEffect(() => {
    moods.forEach((m) => m.id !== slot?.id && preload(m.src))
  }, [moods, slot])

  const next = useCallback(() => {
    const id = advanceMood(moods)
    const target = moods.find((m) => m.id === id)
    if (!target || target.id === slot?.id) return
    window.clearTimeout(timer.current)
    setLeaving(slot)
    setSlot(target)
    setPos(cyclePosition())
    timer.current = window.setTimeout(() => setLeaving(null), XFADE_MS)
  }, [moods, slot])

  const label = slot ? slot.alt || `${slot.id} mood illustration` : 'Mood illustration placeholder'

  const renderSlot = (s: MoodSlot, key: string, className: string) =>
    s.src ? <MoodStill key={key} src={s.src} className={className} /> : <MoodStub key={key} id={s.id} />

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
            renderSlot(slot, `in-${slot.id}`, leaving ? 'is-entering' : '')
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
              <a className="mood-chip mood-chip-link" href={allMoodsHref} aria-label="See all moods">
                all <span aria-hidden="true">→</span>
              </a>
            </div>
            <div className="mood-overlay-row mood-overlay-bottom">
              <span className="mood-chip mood-chip-name" aria-live="polite">
                {slot.id}
              </span>
              <button type="button" className="mood-chip mood-chip-next" onClick={next}>
                next <span aria-hidden="true">›</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
