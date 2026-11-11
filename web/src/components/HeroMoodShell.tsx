import { useMemo, useState } from 'react'
import MoodStill from './moods/MoodStill'
import MoodStub from './moods/MoodStub'
import type { MoodSlot } from './moods/types'

export type { MoodSlot }
export type HeroMoodShellProps = {
  moods: MoodSlot[]
  /** Override random pick (e.g. ?mood=cyclist) — also read from URL once */
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
 * Mounted with client:only — single client pick per full page load
 * (random or ?mood= / initialMoodId). No SSR random, no effect re-pick, no fade thrash.
 */
export default function HeroMoodShell({
  moods,
  initialMoodId,
}: HeroMoodShellProps) {
  const [slot] = useState<MoodSlot | null>(() =>
    pickMood(moods, initialMoodId ?? readMoodParam()),
  )

  const label = useMemo(() => {
    if (!slot) return 'Mood illustration placeholder'
    return slot.alt || `${slot.id} mood illustration`
  }, [slot])

  return (
    <div
      className="hero-shell"
      data-mood-id={slot?.id ?? 'none'}
      data-animated="false"
      data-component={slot?.component ?? ''}
    >
      <div className="hero-shell-stage mood-inset" role="img" aria-label={label}>
        {slot ? (
          slot.src ? (
            <MoodStill src={slot.src} fade={false} />
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
