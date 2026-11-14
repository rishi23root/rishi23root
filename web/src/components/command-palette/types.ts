export type CommandAction = {
  id: string
  name: string
  section?: string
  /** Path for in-site navigation (preferred over perform). */
  href?: string
  /** Built-in action id handled by the palette (e.g. theme). */
  perform?: 'theme'
  shortcut?: string[]
}
