function initSocialsMenu(root: HTMLElement) {
  if (root.dataset.socialsInit === '1') return
  const triggerEl = root.querySelector<HTMLButtonElement>('.socials-menu-trigger')
  const panelEl = root.querySelector<HTMLElement>('.socials-menu-panel')
  if (!triggerEl || !panelEl) return
  const trigger = triggerEl
  const panel = panelEl
  root.dataset.socialsInit = '1'

  let animTimer = 0
  let leaveTimer = 0
  let openRaf1 = 0
  let openRaf2 = 0
  let scrollRaf = 0
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

  function isTriggerVisible(rect: DOMRect): boolean {
    return (
      rect.bottom > 0 &&
      rect.top < window.innerHeight &&
      rect.right > 0 &&
      rect.left < window.innerWidth
    )
  }

  // Fixed + body portal escapes chrome view-transition stacking so the
  // opaque panel paints above the sticky writing TOC rail.
  function placePanel(rect = trigger.getBoundingClientRect()) {
    panel.style.position = 'fixed'
    panel.style.top = `${Math.round(rect.bottom + 6)}px`
    panel.style.right = `${Math.round(window.innerWidth - rect.right)}px`
    panel.style.left = 'auto'
    panel.style.bottom = 'auto'
  }

  function clearPlace() {
    panel.style.position = ''
    panel.style.top = ''
    panel.style.right = ''
    panel.style.left = ''
    panel.style.bottom = ''
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

  function cancelOpenRaf() {
    if (openRaf1) {
      window.cancelAnimationFrame(openRaf1)
      openRaf1 = 0
    }
    if (openRaf2) {
      window.cancelAnimationFrame(openRaf2)
      openRaf2 = 0
    }
  }

  function cancelScrollRaf() {
    if (scrollRaf) {
      window.cancelAnimationFrame(scrollRaf)
      scrollRaf = 0
    }
  }

  function syncPosition() {
    if (!isOpen()) return
    const rect = trigger.getBoundingClientRect()
    if (!isTriggerVisible(rect)) {
      close(false)
      return
    }
    placePanel(rect)
  }

  function onScrollOrResize() {
    if (!isOpen() || scrollRaf) return
    scrollRaf = window.requestAnimationFrame(() => {
      scrollRaf = 0
      syncPosition()
    })
  }

  function attachPositionListeners() {
    window.addEventListener('scroll', onScrollOrResize, { passive: true, capture: true })
    window.addEventListener('resize', onScrollOrResize, { passive: true })
  }

  function detachPositionListeners() {
    window.removeEventListener('scroll', onScrollOrResize, true)
    window.removeEventListener('resize', onScrollOrResize)
    cancelScrollRaf()
  }

  function open(opts: { pin?: boolean; focus?: boolean } = {}) {
    cancelLeave()
    cancelAnim()
    if (opts.pin) setPinned(true)
    if (isOpen()) {
      placePanel()
      return
    }
    cancelOpenRaf()
    document.body.appendChild(panel)
    panel.hidden = false
    panel.inert = false
    placePanel()
    trigger.setAttribute('aria-expanded', 'true')
    attachPositionListeners()
    openRaf1 = window.requestAnimationFrame(() => {
      openRaf1 = 0
      openRaf2 = window.requestAnimationFrame(() => {
        openRaf2 = 0
        if (!isOpen()) return
        panel.classList.add('is-open')
        if (opts.focus) {
          const first = panel.querySelector<HTMLElement>('[role="menuitem"]')
          first?.focus()
        }
      })
    })
  }

  function finishClose(restoreFocus = true) {
    cancelLeave()
    cancelAnim()
    cancelOpenRaf()
    detachPositionListeners()
    panel.classList.remove('is-open')
    panel.hidden = true
    panel.inert = false
    clearPlace()
    if (panel.parentNode !== root) root.appendChild(panel)
    trigger.setAttribute('aria-expanded', 'false')
    setPinned(false)
    if (restoreFocus) trigger.focus()
  }

  function close(restoreFocus = true) {
    cancelLeave()
    cancelAnim()
    cancelOpenRaf()
    detachPositionListeners()
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
      finishClose(false)
      return
    }
    animTimer = window.setTimeout(() => {
      animTimer = 0
      panel.hidden = true
      panel.inert = false
      clearPlace()
      if (panel.parentNode !== root) root.appendChild(panel)
    }, 180)
  }

  function scheduleHoverClose() {
    if (pinned) return
    cancelLeave()
    // Bridge the 6px gap between trigger and portaled panel.
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
    open({ pin: true, focus: true })
  })

  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && isOpen()) {
      finishClose(false)
    }
  })

  if (hoverCapable) {
    trigger.addEventListener('mouseenter', () => {
      open({ focus: false })
    })
    trigger.addEventListener('mouseleave', scheduleHoverClose)
    panel.addEventListener('mouseenter', cancelLeave)
    panel.addEventListener('mouseleave', scheduleHoverClose)
  }

  document.addEventListener('click', (e) => {
    if (!isOpen()) return
    const target = e.target
    if (target instanceof Node && (root.contains(target) || panel.contains(target))) return
    close(false)
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      e.preventDefault()
      e.stopPropagation()
      close(true)
    }
  })

  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      // Restore DOM position + focus trigger before default Tab runs so focus
      // continues naturally from the trigger instead of the end of <body>.
      finishClose(false)
      trigger.focus()
      return
    }
    const items = Array.from(panel.querySelectorAll<HTMLElement>('[role="menuitem"]'))
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot)
} else {
  boot()
}
