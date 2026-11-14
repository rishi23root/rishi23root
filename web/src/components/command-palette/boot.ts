/**
 * Tiny first-paint listener. The palette UI module is only fetched on the
 * first Cmd/Ctrl+K (or ?) so React-free pages stay light.
 */
let loading: Promise<typeof import('./palette')> | null = null

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

window.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.altKey) return
  const meta = e.metaKey || e.ctrlKey
  const key = e.key.toLowerCase()

  // Cmd/Ctrl+K — open / toggle
  if (meta && key === 'k') {
    e.preventDefault()
    load().then((m) => m.togglePalette())
    return
  }

  // ? — open when not typing (Shift+/ on US keyboards)
  if (!meta && e.key === '?' && !isTypingTarget(e.target)) {
    e.preventDefault()
    load().then((m) => m.openPalette())
  }
})
