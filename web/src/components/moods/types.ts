export type MoodSlot = {
  id: string
  /** Activity title shown on /mood (ids stay stable for assets/URL params). */
  label?: string
  /** WebP still in web/public/mood. */
  src?: string
  alt?: string
}

declare global {
  interface Window {
    /** First mood picked (and preloaded) by the inline head script in index.astro. */
    __heroMoodFirst?: string
    /** Cross-document view transition into the homepage (index.astro), awaited by settleMood. */
    __homePageVt?: Promise<unknown>
  }
}
