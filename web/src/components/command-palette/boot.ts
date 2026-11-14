/**
 * Tiny first-paint listener. The palette UI module is only fetched on the
 * first Cmd/Ctrl+K (or ?) so React-free pages stay light.
 *
 * Nav chords (G then H / P / W / M) read shortcut + href from the embedded
 * actions JSON — same source the palette shows — without loading the UI chunk.
 */
import type { CommandAction } from './types'

let loading: Promise<typeof import('./palette')> | null = null
let goPending = false
let goTimer = 0
let chordMap: Map<string, string> | null = null

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

function navChords(): Map<string, string> {
  if (chordMap) return chordMap
  chordMap = new Map()
  const el = document.getElementById('site-kbar-actions')
  if (!el?.textContent) return chordMap
  try {
    const actions = JSON.parse(el.textContent) as CommandAction[]
    for (const a of actions) {
      if (!a.href || !a.shortcut || a.shortcut.length !== 2) continue
      if (a.shortcut[0].toLowerCase() !== 'g') continue
      chordMap.set(a.shortcut[1].toLowerCase(), a.href)
    }
  } catch {
    /* ignore bad JSON */
  }
  return chordMap
}

function clearGo() {
  goPending = false
  if (goTimer) {
    window.clearTimeout(goTimer)
    goTimer = 0
  }
}

window.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.altKey) return
  const meta = e.metaKey || e.ctrlKey
  const key = e.key.toLowerCase()

  // Cmd/Ctrl+K — open / toggle
  if (meta && key === 'k') {
    e.preventDefault()
    clearGo()
    load().then((m) => m.togglePalette())
    return
  }

  // ? — open when not typing (Shift+/ on US keyboards)
  if (!meta && e.key === '?' && !isTypingTarget(e.target)) {
    e.preventDefault()
    clearGo()
    load().then((m) => m.openPalette())
    return
  }

  // G then H / P / W / M — jump without opening the palette
  if (meta || e.shiftKey || isTypingTarget(e.target)) {
    clearGo()
    return
  }

  if (goPending) {
    const href = navChords().get(key)
    clearGo()
    if (href) {
      e.preventDefault()
      window.location.assign(href)
    }
    return
  }

  if (key === 'g') {
    e.preventDefault()
    goPending = true
    goTimer = window.setTimeout(clearGo, 1200)
  }
})
