import type { CommandAction } from './types'

const ROOT_ID = 'site-kbar'
const DATA_ID = 'site-kbar-actions'

let open = false
let active = 0
let query = ''
let actions: CommandAction[] = []
let filtered: CommandAction[] = []
let root: HTMLElement | null = null

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
  if (h.startsWith(n)) return 100 - n.length
  if (h.includes(n)) return 50 - h.indexOf(n)
  // Simple subsequence match
  let i = 0
  for (const ch of h) {
    if (ch === n[i]) i++
    if (i === n.length) return 20
  }
  return 0
}

function filterActions(q: string): CommandAction[] {
  if (!q.trim()) return actions.slice()
  return actions
    .map((a) => ({ a, s: Math.max(score(a.name, q), score(a.section ?? '', q)) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s)
    .map((x) => x.a)
}

function run(action: CommandAction) {
  close()
  if (action.perform === 'theme') {
    const toggle = document.getElementById('themeToggle')
    if (toggle) toggle.click()
    return
  }
  if (action.href) {
    window.location.assign(action.href)
  }
}

function renderList(listEl: HTMLElement) {
  listEl.replaceChildren()
  if (!filtered.length) {
    const empty = document.createElement('p')
    empty.className = 'kbar-empty'
    empty.textContent = 'No matches'
    listEl.appendChild(empty)
    return
  }

  let lastSection = ''
  filtered.forEach((action, i) => {
    const section = action.section || 'Jump'
    if (section !== lastSection) {
      lastSection = section
      const label = document.createElement('p')
      label.className = 'kbar-section'
      label.textContent = section
      listEl.appendChild(label)
    }
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'kbar-item' + (i === active ? ' is-active' : '')
    btn.setAttribute('role', 'option')
    btn.setAttribute('aria-selected', i === active ? 'true' : 'false')
    btn.dataset.index = String(i)

    const name = document.createElement('span')
    name.className = 'kbar-item-name'
    name.textContent = action.name
    btn.appendChild(name)

    if (action.shortcut?.length) {
      const keys = document.createElement('span')
      keys.className = 'kbar-keys'
      action.shortcut.forEach((k) => {
        const kbd = document.createElement('kbd')
        kbd.textContent = k
        keys.appendChild(kbd)
      })
      btn.appendChild(keys)
    }

    btn.addEventListener('click', () => run(action))
    btn.addEventListener('mousemove', () => {
      if (active !== i) {
        active = i
        syncActive(listEl)
      }
    })
    listEl.appendChild(btn)
  })
}

function syncActive(listEl: HTMLElement) {
  listEl.querySelectorAll('.kbar-item').forEach((el, i) => {
    const on = i === active
    el.classList.toggle('is-active', on)
    el.setAttribute('aria-selected', on ? 'true' : 'false')
    if (on && 'scrollIntoView' in el) {
      ;(el as HTMLElement).scrollIntoView({ block: 'nearest' })
    }
  })
}

function onKeyDown(e: KeyboardEvent) {
  if (!open) return
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (!filtered.length) return
    active = (active + 1) % filtered.length
    const list = root?.querySelector('.kbar-list') as HTMLElement | null
    if (list) syncActive(list)
    return
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (!filtered.length) return
    active = (active - 1 + filtered.length) % filtered.length
    const list = root?.querySelector('.kbar-list') as HTMLElement | null
    if (list) syncActive(list)
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
      <input class="kbar-input" type="text" autocomplete="off" spellcheck="false" placeholder="Jump to…" aria-label="Filter commands" />
      <div class="kbar-list" role="listbox"></div>
      <p class="kbar-hint"><kbd>↑</kbd><kbd>↓</kbd> move · <kbd>↵</kbd> open · <kbd>esc</kbd> close</p>
    </div>
  `
  document.body.appendChild(root)

  root.querySelector('[data-kbar-dismiss]')?.addEventListener('click', close)
  const input = root.querySelector('.kbar-input') as HTMLInputElement
  input.addEventListener('input', () => {
    query = input.value
    filtered = filterActions(query)
    active = 0
    const list = root!.querySelector('.kbar-list') as HTMLElement
    renderList(list)
  })
  return root
}

export function openPalette() {
  if (open) return
  actions = readActions()
  if (!actions.length) return
  query = ''
  active = 0
  filtered = filterActions(query)
  const el = ensureRoot()
  el.hidden = false
  open = true
  document.documentElement.classList.add('kbar-open')
  const list = el.querySelector('.kbar-list') as HTMLElement
  renderList(list)
  const input = el.querySelector('.kbar-input') as HTMLInputElement
  input.value = ''
  input.focus()
  window.addEventListener('keydown', onKeyDown)
}

export function close() {
  if (!open) return
  open = false
  document.documentElement.classList.remove('kbar-open')
  window.removeEventListener('keydown', onKeyDown)
  if (root) root.hidden = true
}

export function togglePalette() {
  if (open) close()
  else openPalette()
}
