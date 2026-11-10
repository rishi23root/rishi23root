import { useEffect, useMemo, useState } from 'react'
import MoodStill from './moods/MoodStill'
import MoodStub from './moods/MoodStub'
import type { MoodSlot } from './moods/types'

export type { MoodSlot }
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

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduce(mq.matches)
    sync()
    if (mq.addEventListener) mq.addEventListener('change', sync)
    else mq.addListener(sync)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', sync)
      else mq.removeListener(sync)
    }
  }, [])
  return reduce
}

function Scene({
  slot,
  reduceMotion,
}: {
  slot: MoodSlot
  reduceMotion: boolean
}) {
  if (slot.src) {
    return <MoodStill src={slot.src} fade={!reduceMotion} />
  }
  return <MoodStub id={slot.id} />
}

/**
 * Widescreen hero host (~70–80% viewport).
 * Random mood on load among static stills: cyclist, park, building, warehouse.
 * No animation / no seashore / no boy-under-tree.
 */
export default function HeroMoodShell({
  moods,
  initialMoodId,
}: HeroMoodShellProps) {
  const reduceMotion = usePrefersReducedMotion()
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
      data-animated="false"
      data-component={slot?.component ?? ''}
    >
      <div className="hero-shell-stage" role="img" aria-label={label}>
        {slot ? (
          <Scene slot={slot} reduceMotion={reduceMotion} />
        ) : (
          <div className="hero-shell-empty" aria-hidden="true" />
        )}
      </div>
    </div>
  )
}
