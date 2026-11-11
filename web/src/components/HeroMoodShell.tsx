import { useMemo, useState } from 'react'
import MoodStill from './moods/MoodStill'
import MoodStub from './moods/MoodStub'
import { advanceMood } from './moods/cycle'
import type { MoodSlot } from './moods/types'

export type { MoodSlot }
export type HeroMoodShellProps = {
  moods: MoodSlot[]
  /** Force a mood (e.g. ?mood=cyclist from /mood). Also read from the URL. */
  initialMoodId?: string
}

function readMoodParam(): string | null {
  if (typeof window === 'undefined') return null
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

/**
 * Portrait mood plate. Mounted client:only so each full page load advances the
 * shuffle-bag cycle (no repeats until every mood has been seen). ?mood= wins.
 */
export default function HeroMoodShell({
  moods,
  initialMoodId,
}: HeroMoodShellProps) {
  const [slot] = useState<MoodSlot | null>(() =>
    initialSlot(moods, initialMoodId ?? readMoodParam()),
  )

  const label = useMemo(() => {
    if (!slot) return 'Mood illustration placeholder'
    return slot.alt || `${slot.id} mood illustration`
  }, [slot])

  return (
    <div className="hero-shell" data-mood-id={slot?.id ?? 'none'}>
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
