export type CommandAction = {
  id: string
  name: string
  section?: string
  /** Path or URL for navigation / redirect (preferred over perform). */
  href?: string
  /** Built-in action id handled by the palette (e.g. theme). */
  perform?: 'theme'
  shortcut?: string[]
  /** 24x24 SVG path data for leading row icon. */
  iconPath?: string
  /** Muted right-hand label (e.g. social handle). */
  meta?: string
}
