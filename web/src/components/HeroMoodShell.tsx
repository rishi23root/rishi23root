import { useEffect, useMemo, useState } from 'react'
import MoodStill from './moods/MoodStill'
import MoodStub from './moods/MoodStub'
import type { MoodSlot } from './moods/types'

export type { MoodSlot }
export type HeroMoodShellProps = {
  moods: MoodSlot[]
  /** Override random pick (e.g. ?mood=cyclist) — also read from URL once on mount */
  initialMoodId?: string
}

function pickMood(moods: MoodSlot[], preferred?: string | null): MoodSlot | null {
  if (!moods.length) return null
  if (preferred) {
    const hit = moods.find((m) => m.id === preferred)
    if (hit) return hit
  }
  return moods[Math.floor(Math.random() * moods.length)] ?? null
}

function readMoodParam(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('mood')
}

/**
 * Portrait mood panel host (desktop split).
 * One client-only mood pick among static stills: cyclist, park, building, warehouse.
 * No SSR/hydrate/effect triple-random; fade respects prefers-reduced-motion via CSS.
 */
export default function HeroMoodShell({
  moods,
  initialMoodId,
}: HeroMoodShellProps) {
  // null on SSR + first paint — pick once after mount (stable; no hydration mismatch)
  const [slot, setSlot] = useState<MoodSlot | null>(null)

  useEffect(() => {
    setSlot(pickMood(moods, initialMoodId ?? readMoodParam()))
    // Static site.json moods — pick exactly once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const label = useMemo(() => {
    if (!slot) return 'Mood illustration placeholder'
    return slot.alt || `${slot.id} mood illustration`
  }, [slot])

  return (
    <div
      className="hero-shell"
      data-mood-id={slot?.id ?? 'pending'}
      data-animated="false"
      data-component={slot?.component ?? ''}
    >
      <div className="hero-shell-stage" role="img" aria-label={label}>
        {slot ? (
          slot.src ? (
            <MoodStill src={slot.src} fade />
          ) : (
            <MoodStub id={slot.id} />
          )
        ) : (
          <div className="hero-shell-empty" aria-hidden="true" />
        )}
      </div>
    </div>
  )
}
