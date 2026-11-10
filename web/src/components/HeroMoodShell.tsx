import { useEffect, useMemo, useState } from 'react'

/** Site-content mood slot — assets/layers fill in later; shell is empty for now. */
export type MoodSlot = {
  id: string
  animated?: boolean
  src?: string
  layers?: {
    base: string
    clouds?: string
    shadows?: string
    grass?: string
  }
  /** Future named scene component id */
  component?: string
  alt?: string
}

export type HeroMoodShellProps = {
  moods: MoodSlot[]
  /** Override random pick (e.g. ?mood=cyclist) — also read from URL on mount */
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

/**
 * Widescreen hero host (~70–80% viewport).
 * v1: empty placeholder shell + random slot selection.
 * Later: mount windy/still scenes from mood demos into this stage.
 */
export default function HeroMoodShell({
  moods,
  initialMoodId,
}: HeroMoodShellProps) {
  const [slot, setSlot] = useState<MoodSlot | null>(() =>
    pickMood(moods, initialMoodId ?? null),
  )

  useEffect(() => {
    const param =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('mood')
        : null
    setSlot(pickMood(moods, initialMoodId ?? param))
  }, [moods, initialMoodId])

  const label = useMemo(() => {
    if (!slot) return 'Mood illustration placeholder'
    return slot.alt || `${slot.id} mood illustration`
  }, [slot])

  return (
    <div
      className="hero-shell"
      data-mood-id={slot?.id ?? 'none'}
      data-animated={slot?.animated ? 'true' : 'false'}
      data-component={slot?.component ?? ''}
    >
      <div className="hero-shell-stage" role="img" aria-label={label}>
        {/* Empty stage — animations / layers land incrementally */}
        <div className="hero-shell-empty" aria-hidden="true" />
      </div>
    </div>
  )
}
