import type { MoodSlot } from './types'

/**
 * Shuffle-bag mood cycle persisted in localStorage.
 * Every mood is shown once before any repeats; a fresh shuffle starts when the
 * bag is empty, and never opens with the mood that was just shown.
 */
export const MOOD_CYCLE_KEY = 'mood-cycle:v1'

export type CycleState = {
  order: string[]
  /** Index of the mood currently shown in `order`. */
  index: number
}

/**
 * The bag itself. Self-contained on purpose (no references outside its own
 * body): index.astro inlines it with Function#toString so the head script
 * picks the first mood with exactly this code, before React loads.
 */
export function createMoodBag(key: string) {
  const freshOrder = (ids: string[], avoidFirst?: string): string[] => {
    const order = ids.slice()
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    if (avoidFirst && order.length > 1 && order[0] === avoidFirst) {
      const swap = 1 + Math.floor(Math.random() * (order.length - 1))
      ;[order[0], order[swap]] = [order[swap], order[0]]
    }
    return order
  }

  const sameSet = (a: string[], b: string[]): boolean => {
    if (a.length !== b.length) return false
    const set = new Set(a)
    return b.every((id) => set.has(id))
  }

  const read = (ids: string[]): CycleState | null => {
    try {
      const raw = window.localStorage.getItem(key)
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

  /**
   * Step past `prev` (null starts a new bag) and persist the result.
   * `pending` is a next bag already drawn by a peek, reused so it matches.
   */
  const advance = (ids: string[], prev: CycleState | null, pending?: string[] | null): CycleState => {
    let next: CycleState
    if (!prev) {
      next = { order: freshOrder(ids), index: 0 }
    } else if (prev.index + 1 >= prev.order.length) {
      const order = pending && sameSet(pending, ids) ? pending : freshOrder(ids, prev.order[prev.index])
      next = { order, index: 0 }
    } else {
      next = { order: prev.order, index: prev.index + 1 }
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(next))
    } catch {
      /* private mode / storage full: cycle still works for this page */
    }
    return next
  }

  return { freshOrder, sameSet, read, advance }
}

const bag = createMoodBag(MOOD_CYCLE_KEY)
const idsOf = (moods: MoodSlot[]) => moods.map((m) => m.id)

let memory: CycleState | null = null
/** Next bag, drawn early by peekNextMood so the prefetch matches the advance. */
let pendingOrder: string[] | null = null

/** Advance the bag by one and persist it. Returns the mood id to show. */
export function advanceMood(moods: MoodSlot[]): string | null {
  const ids = idsOf(moods)
  if (!ids.length) return null
  const next = bag.advance(ids, memory ?? bag.read(ids), pendingOrder)
  pendingOrder = null
  memory = next
  return next.order[next.index] ?? null
}

/**
 * Pick up the mood the inline head script (index.astro) already advanced to
 * on this page load, without advancing again. Returns its id, or null.
 */
export function adoptCurrentMood(moods: MoodSlot[]): string | null {
  const state = bag.read(idsOf(moods))
  if (!state) return null
  memory = state
  return state.order[state.index] ?? null
}

/** The mood the next advanceMood() will return, without advancing. */
export function peekNextMood(moods: MoodSlot[]): string | null {
  const ids = idsOf(moods)
  if (ids.length < 2) return null
  const cur = memory ?? bag.read(ids)
  if (!cur) return null
  if (cur.index + 1 < cur.order.length) return cur.order[cur.index + 1] ?? null
  if (!pendingOrder || !bag.sameSet(pendingOrder, ids)) {
    pendingOrder = bag.freshOrder(ids, cur.order[cur.index])
  }
  return pendingOrder[0] ?? null
}

/** Position of the current mood in this pass (1-based) and pass size. */
export function cyclePosition(): { n: number; total: number } | null {
  if (!memory) return null
  return { n: memory.index + 1, total: memory.order.length }
}
