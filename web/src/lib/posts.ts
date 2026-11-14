import { getCollection, type CollectionEntry } from 'astro:content'

export type Post = CollectionEntry<'posts'>

const isPublished = (entry: Post) => entry.data.draft !== true

async function postsNewestFirst(filter: (entry: Post) => boolean): Promise<Post[]> {
  const posts = await getCollection('posts', filter)
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
}

/**
 * Published posts only, newest first, in dev and build alike. Every listing
 * uses this: Writing index, home, command palette, RSS, llms.txt, redirects.
 */
export function getPublishedPosts(): Promise<Post[]> {
  return postsNewestFirst(isPublished)
}

/**
 * Posts that get a page. Drafts are included only in `astro dev`, so they can
 * be previewed at their URL without showing up in any list.
 */
export function getRenderablePosts(): Promise<Post[]> {
  return postsNewestFirst((entry) => import.meta.env.DEV || isPublished(entry))
}

export function postPath(slug: string): string {
  return `/writing/${slug}/`
}

/** YYYY-MM-DD */
export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** "November 5, 2026" (UTC, so build machines agree). */
export function formatPostDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/** Guardrail: frontmatter slug must equal the file name (no silent URL drift). */
export function assertSlugMatchesFile(entry: Post): void {
  const file = entry.filePath ?? entry.id
  const stem = file.split('/').pop()!.replace(/\.(md|mdx)$/, '')
  if (stem !== entry.data.slug) {
    throw new Error(`Post slug "${entry.data.slug}" must match its file name "${stem}" (${file})`)
  }
}

/** Rough reading time (~200 wpm) from the raw post body + FAQ. */
export function readingTimeMinutes(post: Post): number {
  const body = (post.body ?? '')
    .replace(/^import .*$/gm, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`~\-[\]()!]/g, ' ')
  const text = [body, ...post.data.faq.flatMap((f) => [f.q, f.a])].join(' ')
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

/** Unique keywords for meta + JSON-LD: primary, secondary, then tags. */
export function postKeywords(post: Post): string[] {
  const { primaryKeyword, secondaryKeywords, tags } = post.data
  const all = [primaryKeyword, ...secondaryKeywords, ...tags].filter((k): k is string => Boolean(k))
  return [...new Set(all)]
}
