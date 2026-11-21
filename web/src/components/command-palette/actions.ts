import type { CommandAction } from './types'

const DATA_ID = 'site-kbar-actions'
let cached: CommandAction[] | null = null

export function readActions(): CommandAction[] {
  if (cached) return cached
  const el = document.getElementById(DATA_ID)
  if (!el?.textContent) return []
  try {
    const parsed = JSON.parse(el.textContent) as CommandAction[]
    if (!Array.isArray(parsed)) return []
    cached = parsed
    return parsed
  } catch {
    return []
  }
}

export function runAction(action: CommandAction) {
  if (action.perform === 'theme') {
    document.getElementById('themeToggle')?.click()
    return
  }
  if (action.href) {
    if (/^https?:\/\//i.test(action.href)) {
      window.open(action.href, '_blank', 'noopener,noreferrer')
    } else {
      window.location.assign(action.href)
    }
  }
}
