export function initSocialsMenu(root: HTMLElement) {
  if (root.dataset.socialsInit === '1') return
  const triggerEl = root.querySelector<HTMLButtonElement>('.socials-menu-trigger')
  const panelEl = root.querySelector<HTMLElement>('.socials-menu-panel')
  if (!triggerEl || !panelEl) return
  const trigger = triggerEl
  const panel = panelEl
  root.dataset.socialsInit = '1'

  let animTimer = 0
  let leaveTimer = 0
  let pinned = false
  let reduceMotion = false
  let hoverCapable = false

  try {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    /* ignore */
  }
  try {
    // Fine pointer + real hover: open on hover. Touch / coarse: click only.
    hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  } catch {
    /* ignore */
  }

  function isOpen(): boolean {
    return trigger.getAttribute('aria-expanded') === 'true'
  }

  function setPinned(next: boolean) {
    pinned = next
    trigger.toggleAttribute('data-pinned', pinned)
  }

  function cancelLeave() {
    if (leaveTimer) {
      window.clearTimeout(leaveTimer)
      leaveTimer = 0
    }
  }

  function cancelAnim() {
    if (animTimer) {
      window.clearTimeout(animTimer)
      animTimer = 0
    }
  }

  function menuItems(): HTMLElement[] {
    return Array.from(panel.querySelectorAll<HTMLElement>('[role="menuitem"]'))
  }

  function open(opts: { pin?: boolean; focus?: 'first' | 'last' | false } = {}) {
    cancelLeave()
    cancelAnim()
    if (opts.pin) setPinned(true)
    if (!isOpen()) {
      panel.hidden = false
      panel.inert = false
      // Force layout before adding .is-open so opacity/transform transitions play cleanly.
      void panel.offsetWidth
      panel.classList.add('is-open')
      trigger.setAttribute('aria-expanded', 'true')
    }
    if (opts.focus === 'last') menuItems().at(-1)?.focus()
    else if (opts.focus === 'first') menuItems()[0]?.focus()
  }

  function hidePanel() {
    panel.hidden = true
    panel.inert = false
  }

  function close(restoreFocus = false) {
    cancelLeave()
    cancelAnim()
    if (!isOpen()) {
      setPinned(false)
      return
    }
    panel.classList.remove('is-open')
    panel.inert = true
    trigger.setAttribute('aria-expanded', 'false')
    setPinned(false)
    if (restoreFocus) trigger.focus()
    if (reduceMotion) {
      hidePanel()
      return
    }
    animTimer = window.setTimeout(() => {
      animTimer = 0
      hidePanel()
    }, 180)
  }

  function scheduleHoverClose() {
    if (pinned) return
    cancelLeave()
    // Bridge the 0.45rem gap between trigger and dropdown panel.
    leaveTimer = window.setTimeout(() => {
      leaveTimer = 0
      if (!pinned) close(false)
    }, 160)
  }

  // Click pins (or toggles pin off). Touch devices land here with no hover.
  trigger.addEventListener('click', (e) => {
    e.stopPropagation()
    cancelLeave()
    if (pinned) {
      close(true)
      return
    }
    if (isOpen()) {
      setPinned(true)
      return
    }
    open({ pin: true, focus: 'first' })
  })

  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      open({ pin: true, focus: 'first' })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      open({ pin: true, focus: 'last' })
    }
  })

  root.addEventListener('focusout', (e) => {
    if (!isOpen()) return
    if (!(e.relatedTarget instanceof Node) || root.contains(e.relatedTarget)) return
    close(false)
  })

  if (hoverCapable) {
    root.addEventListener('mouseenter', () => open())
    root.addEventListener('mouseleave', scheduleHoverClose)
  }

  document.addEventListener('click', (e) => {
    if (!isOpen()) return
    if (e.target instanceof Node && root.contains(e.target)) return
    close(false)
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      e.preventDefault()
      e.stopPropagation()
      close(true)
    }
  })

  window.addEventListener('socials:close', () => close(false))

  panel.addEventListener('mousedown', (e) => {
    if (e.target === panel) e.preventDefault()
  })

  panel.addEventListener('keydown', (e) => {
    const items = menuItems()
    if (!items.length) return
    const i = items.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(i + 1) % items.length].focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(i - 1 + items.length) % items.length].focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      items[0].focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      items[items.length - 1].focus()
    }
  })
}

function boot() {
  document.querySelectorAll<HTMLElement>('[data-socials-menu]').forEach(initSocialsMenu)
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }
}
