export type MoodSlot = {
  id: string
  /** WebP still in web/public; a .jpg sibling is used as the fallback. */
  src?: string
  alt?: string
}

declare global {
  interface Window {
    /** First mood picked (and preloaded) by the inline head script in index.astro. */
    __heroMoodFirst?: string
  }
}
