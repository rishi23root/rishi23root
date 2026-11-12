/** Same breakpoint as `.home-mood` in global.css: the plate is hidden below it. */
export const DESKTOP_MQ = '(min-width: 1024px)'

/** `/mood/x.webp` -> `/mood/x.jpg` (the fallback sibling), else null. */
export function jpgFallback(src?: string): string | null {
  return src?.endsWith('.webp') ? `${src.slice(0, -'.webp'.length)}.jpg` : null
}
