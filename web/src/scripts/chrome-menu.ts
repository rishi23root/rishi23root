/**
 * Phone header menu: .menu-toggle discloses .chrome-end as an overlay.
 * Non-modal, no focus trap. Above the breakpoint .chrome-end is the plain header.
 */

// Mirrors the "Phone chrome" media query in styles/global.css.
const NARROW_MQ = '(max-width: 40rem)'

export function initChromeMenu(header: HTMLElement) {
  if (header.dataset.menuInit === '1') return
  const buttonEl = header.querySelector<HTMLButtonElement>('.menu-toggle')
  const panelEl = header.querySelector<HTMLElement>('.chrome-end')
  if (!buttonEl || !panelEl) return
  const button = buttonEl
  const panel = panelEl
  header.dataset.menuInit = '1'

  const narrow = window.matchMedia(NARROW_MQ)

  function isOpen(): boolean {
    return button.getAttribute('aria-expanded') === 'true'
  }

  function setOpen(open: boolean) {
    button.setAttribute('aria-expanded', String(open))
    panel.classList.toggle('is-open', open)
    panel.inert = narrow.matches && !open
  }

  function close() {
    if (!isOpen()) return
    window.dispatchEvent(new Event('socials:close'))
    setOpen(false)
  }

  function closeIfOutside(e: Event) {
    if (e.target instanceof Node && !header.contains(e.target)) close()
  }

  button.addEventListener('click', () => {
    if (isOpen()) close()
    else setOpen(true)
  })

  panel.addEventListener('click', (e) => {
    // Also keeps the menu closed if the browser restores this page on Back.
    if (e.target instanceof Element && e.target.closest('.nav a')) close()
  })

  // pointerup too: iOS Safari sends no document click for taps on plain content.
  document.addEventListener('pointerup', closeIfOutside)
  document.addEventListener('click', closeIfOutside)

  // Focus-out: anything but the button or the panel, wordmark included.
  document.addEventListener('focusin', (e) => {
    if (e.target instanceof Node && e.target !== button && !panel.contains(e.target)) close()
  })

  // On window on purpose: the socials menu stops its own Escape at document,
  // so the innermost menu closes first.
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented || !isOpen()) return
    e.preventDefault()
    close()
    button.focus()
  })

  narrow.addEventListener('change', () => {
    close()
    setOpen(false)
  })

  setOpen(false)
}

document.querySelectorAll<HTMLElement>('.chrome').forEach(initChromeMenu)
