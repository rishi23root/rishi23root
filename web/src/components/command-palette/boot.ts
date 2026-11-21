/**
 * Tiny first-paint listener. The palette UI module is only fetched on the
 * first Cmd/Ctrl+K (or ?) so React-free pages stay light.
 *
 * Two-key chords (G then H / P / W / M, T then T, …) read shortcut + href /
 * perform from the embedded actions JSON — same source the palette shows —
 * without loading the UI chunk.
 */
import { readActions, runAction } from './actions'
import type { CommandAction } from './types'

let loading: Promise<typeof import('./palette')> | null = null
let chordPending: string | null = null
let chordTimer = 0
let chordMap: Map<string, CommandAction> | null = null
let firstKeys: Set<string> | null = null

function load() {
  if (!loading) {
    loading = import('./palette').catch((err) => {
      loading = null
      throw err
    })
  }
  return loading
}

function hasOpenModal(): boolean {
  if (document.documentElement.classList.contains('kbar-open')) return true
  for (const dialog of document.querySelectorAll('[role="dialog"][aria-modal="true"]')) {
    if (!dialog.closest('[hidden]') && dialog.getAttribute('aria-hidden') !== 'true') {
      return true
    }
  }
  return Boolean(document.querySelector('dialog[open]'))
}

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  const tag = t.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable
}

function buildChords() {
  chordMap = new Map()
  firstKeys = new Set()
  for (const a of readActions()) {
    if (!a.shortcut || a.shortcut.length !== 2) continue
    if (!a.href && !a.perform) continue
    const a0 = a.shortcut[0].toLowerCase()
    const a1 = a.shortcut[1].toLowerCase()
    chordMap.set(a0 + a1, a)
    firstKeys.add(a0)
  }
}

function clearChord() {
  chordPending = null
  if (chordTimer) {
    window.clearTimeout(chordTimer)
    chordTimer = 0
  }
}

window.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.altKey) return
  const meta = e.metaKey || e.ctrlKey
  const key = e.key.toLowerCase()

  // Cmd/Ctrl+K — open / toggle (never stack over another open modal)
  if (meta && key === 'k') {
    if (!document.documentElement.classList.contains('kbar-open') && hasOpenModal()) return
    e.preventDefault()
    clearChord()
    window.dispatchEvent(new Event('socials:close'))
    load().then((m) => m.togglePalette(), () => {})
    return
  }

  // Ignore bare shortcuts while any modal dialog is open
  if (hasOpenModal()) {
    clearChord()
    return
  }

  // ? — open when not typing (Shift+/ on US keyboards)
  if (!meta && e.key === '?' && !isTypingTarget(e.target)) {
    e.preventDefault()
    clearChord()
    window.dispatchEvent(new Event('socials:close'))
    load().then((m) => m.openPalette(), () => {})
    return
  }

  // Two-key chords without opening the palette
  if (meta || e.shiftKey || isTypingTarget(e.target)) {
    clearChord()
    return
  }

  if (!chordMap) buildChords()

  if (chordPending) {
    const action = chordMap!.get(chordPending + key)
    clearChord()
    if (action) {
      e.preventDefault()
      window.dispatchEvent(new Event('socials:close'))
      runAction(action)
    }
    return
  }

  if (firstKeys!.has(key)) {
    chordPending = key
    chordTimer = window.setTimeout(clearChord, 1200)
  }
})
