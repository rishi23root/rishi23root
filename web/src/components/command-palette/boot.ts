/**
 * Tiny first-paint listener. The palette UI module is only fetched on the
 * first Cmd/Ctrl+K (or ?) so React-free pages stay light.
 *
 * Two-key chords (G then H / P / W / M, T then T, …) read shortcut + href /
 * perform from the embedded actions JSON — same source the palette shows —
 * without loading the UI chunk.
 */
import type { CommandAction } from './types'

let loading: Promise<typeof import('./palette')> | null = null
let chordPending: string | null = null
let chordTimer = 0
let chordMap: Map<string, CommandAction> | null = null
let firstKeys: Set<string> | null = null

function load() {
  if (!loading) loading = import('./palette')
  return loading
}

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  const tag = t.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    t.isContentEditable
  )
}

function buildChords() {
  chordMap = new Map()
  firstKeys = new Set()
  const el = document.getElementById('site-kbar-actions')
  if (!el?.textContent) return
  try {
    const actions = JSON.parse(el.textContent) as CommandAction[]
    for (const a of actions) {
      if (!a.shortcut || a.shortcut.length !== 2) continue
      if (!a.href && !a.perform) continue
      const a0 = a.shortcut[0].toLowerCase()
      const a1 = a.shortcut[1].toLowerCase()
      chordMap.set(a0 + a1, a)
      firstKeys.add(a0)
    }
  } catch {
    /* ignore bad JSON */
  }
}

function chords(): Map<string, CommandAction> {
  if (!chordMap) buildChords()
  return chordMap!
}

function chordStarters(): Set<string> {
  if (!firstKeys) buildChords()
  return firstKeys!
}

function clearChord() {
  chordPending = null
  if (chordTimer) {
    window.clearTimeout(chordTimer)
    chordTimer = 0
  }
}

function runChord(action: CommandAction) {
  if (action.perform === 'theme') {
    const toggle = document.getElementById('themeToggle')
    if (toggle) toggle.click()
    return
  }
  if (action.href) window.location.assign(action.href)
}

window.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.altKey) return
  const meta = e.metaKey || e.ctrlKey
  const key = e.key.toLowerCase()

  // Cmd/Ctrl+K — open / toggle
  if (meta && key === 'k') {
    e.preventDefault()
    clearChord()
    load().then((m) => m.togglePalette())
    return
  }

  // ? — open when not typing (Shift+/ on US keyboards)
  if (!meta && e.key === '?' && !isTypingTarget(e.target)) {
    e.preventDefault()
    clearChord()
    load().then((m) => m.openPalette())
    return
  }

  // Two-key chords without opening the palette
  if (meta || e.shiftKey || isTypingTarget(e.target)) {
    clearChord()
    return
  }

  if (chordPending) {
    const action = chords().get(chordPending + key)
    clearChord()
    if (action) {
      e.preventDefault()
      runChord(action)
    }
    return
  }

  if (chordStarters().has(key)) {
    e.preventDefault()
    chordPending = key
    chordTimer = window.setTimeout(clearChord, 1200)
  }
})
