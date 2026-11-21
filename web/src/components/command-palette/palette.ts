import type { CommandAction } from './types'

const ROOT_ID = 'site-kbar'
const DATA_ID = 'site-kbar-actions'
const LIST_ID = 'site-kbar-list'

let open = false
let active = 0
let actions: CommandAction[] = []
let filtered: CommandAction[] = []
let root: HTMLElement | null = null
let opener: HTMLElement | null = null

function optionId(index: number): string {
  return `site-kbar-opt-${index}`
}

function readActions(): CommandAction[] {
  const el = document.getElementById(DATA_ID)
  if (!el?.textContent) return []
  try {
    const parsed = JSON.parse(el.textContent) as CommandAction[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function score(hay: string, needle: string): number {
  const h = hay.toLowerCase()
  const n = needle.toLowerCase().trim()
  if (!n) return 1
  if (h.startsWith(n)) return 100
  const idx = h.indexOf(n)
  if (idx !== -1) return 50 + 1 / (1 + idx)
  // Simple subsequence match
  let i = 0
  for (const ch of h) {
    if (ch === n[i]) i++
    if (i === n.length) return 20
  }
  return 0
}

export function filterActions(q: string, list: CommandAction[] = actions): CommandAction[] {
  const trimmed = q.trim()
  if (!trimmed) return list.slice()
  const atMode = trimmed.startsWith('@')
  const needle = atMode ? trimmed.slice(1).trim() : trimmed
  const pool = atMode ? list.filter((a) => a.section === 'Socials') : list
  if (!needle) return pool.slice()
  return pool
    .map((a) => ({
      a,
      s: Math.max(
        score(a.name, needle),
        atMode ? 0 : score(a.section ?? '', needle),
        score(a.meta ?? '', needle),
      ),
    }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s)
    .map((x) => x.a)
}

function run(action: CommandAction) {
  if (action.perform === 'theme') {
    close(true)
    const toggle = document.getElementById('themeToggle')
    if (toggle) toggle.click()
    return
  }
  if (action.href) {
    if (/^https?:\/\//i.test(action.href)) {
      close(true)
      window.open(action.href, '_blank', 'noopener,noreferrer')
    } else {
      close(false)
      window.location.assign(action.href)
    }
    return
  }
  close(true)
}

function renderList(listEl: HTMLElement, emptyEl: HTMLElement, input: HTMLInputElement) {
  listEl.replaceChildren()
  listEl.scrollTop = 0
  if (!filtered.length) {
    listEl.hidden = true
    emptyEl.hidden = false
    input.setAttribute('aria-expanded', 'false')
    input.removeAttribute('aria-activedescendant')
    return
  }

  listEl.hidden = false
  emptyEl.hidden = true

  let lastSection = ''
  let groupEl: HTMLElement | null = null
  let groupIndex = 0

  filtered.forEach((action, i) => {
    const section = action.section || 'Jump'
    if (section !== lastSection || !groupEl) {
      lastSection = section
      const groupId = `site-kbar-group-${groupIndex++}`
      groupEl = document.createElement('div')
      groupEl.setAttribute('role', 'group')
      groupEl.setAttribute('aria-labelledby', groupId)

      const label = document.createElement('p')
      label.id = groupId
      label.className = 'kbar-section'
      label.setAttribute('role', 'presentation')
      label.textContent = section
      groupEl.appendChild(label)
      listEl.appendChild(groupEl)
    }

    const opt = document.createElement('div')
    opt.id = optionId(i)
    opt.className = 'kbar-item' + (i === active ? ' is-active' : '')
    opt.setAttribute('role', 'option')
    opt.setAttribute('aria-selected', i === active ? 'true' : 'false')
    opt.dataset.index = String(i)

    if (action.iconPath) {
      const icon = document.createElement('span')
      icon.className = 'kbar-item-icon'
      icon.setAttribute('aria-hidden', 'true')
      const svgNS = 'http://www.w3.org/2000/svg'
      const svg = document.createElementNS(svgNS, 'svg')
      svg.setAttribute('viewBox', '0 0 24 24')
      svg.setAttribute('focusable', 'false')
      const path = document.createElementNS(svgNS, 'path')
      path.setAttribute('fill', 'currentColor')
      path.setAttribute('d', action.iconPath)
      svg.appendChild(path)
      icon.appendChild(svg)
      opt.appendChild(icon)
    }

    const name = document.createElement('span')
    name.className = 'kbar-item-name'
    name.textContent = action.name
    opt.appendChild(name)

    if (action.shortcut?.length) {
      const keys = document.createElement('span')
      keys.className = 'kbar-keys'
      keys.setAttribute('aria-hidden', 'true')
      action.shortcut.forEach((k) => {
        const kbd = document.createElement('kbd')
        kbd.textContent = k
        keys.appendChild(kbd)
      })
      opt.appendChild(keys)
    } else if (action.meta) {
      const meta = document.createElement('span')
      meta.className = 'kbar-meta'
      meta.textContent = action.meta
      opt.appendChild(meta)
    }

    opt.addEventListener('mousedown', (e) => e.preventDefault())
    opt.addEventListener('click', () => run(action))
    opt.addEventListener('mousemove', () => {
      if (active !== i) {
        active = i
        syncActive(listEl, input, false)
      }
    })
    groupEl.appendChild(opt)
  })

  input.setAttribute('aria-expanded', 'true')
  input.setAttribute('aria-activedescendant', optionId(active))
}

function syncActive(listEl: HTMLElement, input: HTMLInputElement, scroll = true) {
  let activeId = ''
  listEl.querySelectorAll<HTMLElement>('.kbar-item').forEach((el, i) => {
    const on = i === active
    el.classList.toggle('is-active', on)
    el.setAttribute('aria-selected', on ? 'true' : 'false')
    if (on) {
      activeId = el.id
      if (scroll && 'scrollIntoView' in el) {
        el.scrollIntoView({ block: 'nearest' })
      }
    }
  })
  if (activeId) input.setAttribute('aria-activedescendant', activeId)
  else input.removeAttribute('aria-activedescendant')
}

function onFocusIn(e: FocusEvent) {
  if (!open || !root) return
  const dialog = root.querySelector('.kbar-dialog')
  if (dialog && e.target instanceof Node && !dialog.contains(e.target)) {
    const input = root.querySelector('.kbar-input') as HTMLInputElement | null
    input?.focus()
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (!open) return
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
    close(true)
    return
  }
  if (e.key === 'Tab') {
    e.preventDefault()
    const dialog = root?.querySelector('.kbar-dialog') as HTMLElement | null
    if (!dialog) return
    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'input:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.hidden && !el.closest('[hidden]'))
    if (!focusables.length) return
    const idx = focusables.indexOf(document.activeElement as HTMLElement)
    const next = e.shiftKey
      ? focusables[(idx <= 0 ? focusables.length : idx) - 1]
      : focusables[(idx + 1) % focusables.length]
    next.focus()
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (!filtered.length) return
    active = (active + 1) % filtered.length
    const list = root?.querySelector('.kbar-list') as HTMLElement | null
    const input = root?.querySelector('.kbar-input') as HTMLInputElement | null
    if (list && input) syncActive(list, input)
    return
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (!filtered.length) return
    active = (active - 1 + filtered.length) % filtered.length
    const list = root?.querySelector('.kbar-list') as HTMLElement | null
    const input = root?.querySelector('.kbar-input') as HTMLInputElement | null
    if (list && input) syncActive(list, input)
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    const hit = filtered[active]
    if (hit) run(hit)
  }
}

function ensureRoot(): HTMLElement {
  if (root && document.body.contains(root)) return root
  root = document.createElement('div')
  root.id = ROOT_ID
  root.className = 'kbar'
  root.hidden = true
  root.innerHTML = `
    <div class="kbar-backdrop" data-kbar-dismiss></div>
    <div class="kbar-dialog" role="dialog" aria-modal="true" aria-label="Command palette">
      <input
        class="kbar-input"
        type="text"
        role="combobox"
        aria-expanded="false"
        aria-controls="${LIST_ID}"
        aria-autocomplete="list"
        autocomplete="off"
        spellcheck="false"
        placeholder="Jump to…"
        aria-label="Filter commands"
      />
      <div id="${LIST_ID}" class="kbar-list" role="listbox" aria-label="Commands"></div>
      <p class="kbar-empty" role="status" aria-live="polite" hidden>No matches</p>
      <p class="kbar-hint"><kbd>↑</kbd><kbd>↓</kbd> move · <kbd>↵</kbd> open · <kbd>@</kbd> socials · <kbd>esc</kbd> close</p>
    </div>
  `
  document.body.appendChild(root)

  root.querySelector('[data-kbar-dismiss]')?.addEventListener('click', () => close(true))
  const input = root.querySelector('.kbar-input') as HTMLInputElement
  const list = root.querySelector('.kbar-list') as HTMLElement
  const empty = root.querySelector('.kbar-empty') as HTMLElement
  input.addEventListener('input', () => {
    filtered = filterActions(input.value)
    active = 0
    renderList(list, empty, input)
  })
  return root
}

export function openPalette() {
  if (open) return
  actions = readActions()
  if (!actions.length) return
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  active = 0
  filtered = filterActions('')
  const el = ensureRoot()
  el.hidden = false
  open = true
  document.documentElement.classList.add('kbar-open')
  const list = el.querySelector('.kbar-list') as HTMLElement
  const empty = el.querySelector('.kbar-empty') as HTMLElement
  const input = el.querySelector('.kbar-input') as HTMLInputElement
  renderList(list, empty, input)
  input.value = ''
  input.focus()
  window.addEventListener('keydown', onKeyDown, true)
  document.addEventListener('focusin', onFocusIn)
}

export function close(restoreFocus = true) {
  if (!open) return
  open = false
  document.documentElement.classList.remove('kbar-open')
  window.removeEventListener('keydown', onKeyDown, true)
  document.removeEventListener('focusin', onFocusIn)
  if (root) {
    const input = root.querySelector('.kbar-input') as HTMLInputElement | null
    input?.setAttribute('aria-expanded', 'false')
    input?.removeAttribute('aria-activedescendant')
    root.hidden = true
  }
  const prev = opener
  opener = null
  if (restoreFocus && prev && prev.isConnected) {
    prev.focus()
  }
}

export function togglePalette() {
  if (open) close(true)
  else openPalette()
}
