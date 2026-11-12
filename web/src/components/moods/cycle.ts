import type { MoodSlot } from './types'

/**
 * Shuffle-bag mood cycle persisted in localStorage.
 * Every mood is shown once before any repeats; a fresh shuffle starts when the
 * bag is empty, and never opens with the mood that was just shown.
 */
const KEY = 'mood-cycle:v1'

type CycleState = {
  order: string[]
  /** Index of the mood currently shown in `order`. */
  index: number
}

function shuffle<T>(items: T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function freshOrder(ids: string[], avoidFirst?: string): string[] {
  const order = shuffle(ids)
  if (avoidFirst && order.length > 1 && order[0] === avoidFirst) {
    const swap = 1 + Math.floor(Math.random() * (order.length - 1))
    ;[order[0], order[swap]] = [order[swap], order[0]]
  }
  return order
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((id) => set.has(id))
}

function read(ids: string[]): CycleState | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CycleState
    if (!Array.isArray(parsed.order) || typeof parsed.index !== 'number') return null
    // Mood list changed (added/removed) -> start a new bag.
    if (!sameSet(parsed.order, ids)) return null
    return parsed
  } catch {
    return null
  }
}

function write(state: CycleState): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* private mode / storage full: cycle still works for this page */
  }
}

let memory: CycleState | null = null

/** Advance the bag by one and persist it. Returns the mood id to show. */
export function advanceMood(moods: MoodSlot[]): string | null {
  const ids = moods.map((m) => m.id)
  if (!ids.length) return null
  const prev = memory ?? read(ids)
  let next: CycleState
  if (!prev) {
    next = { order: freshOrder(ids), index: 0 }
  } else if (prev.index + 1 >= prev.order.length) {
    next = { order: freshOrder(ids, prev.order[prev.index]), index: 0 }
  } else {
    next = { order: prev.order, index: prev.index + 1 }
  }
  memory = next
  write(next)
  return next.order[next.index] ?? null
}

/** Position of the current mood in this pass (1-based) and pass size. */
export function cyclePosition(): { n: number; total: number } | null {
  if (!memory) return null
  return { n: memory.index + 1, total: memory.order.length }
}
