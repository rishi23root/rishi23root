import siteJson from '../../../content/site.json'

export const site = siteJson

export type Site = typeof siteJson

/** GitHub profile photo by URL only — never commit a binary avatar. */
export function githubAvatarUrl(size = 160): string {
  return `https://github.com/${site.github.name}.png?size=${size}`
}

/**
 * Published posts only. Drafts show up in `astro dev` so they can be
 * previewed, but never in a build (pages, RSS, sitemap, llms.txt).
 */
export function publishedPostsFilter<T extends { data: { draft?: boolean } }>(
  entry: T,
): boolean {
  return import.meta.env.DEV || entry.data.draft !== true
}

/** Guardrail: frontmatter slug must equal the file name (no silent URL drift). */
export function assertSlugMatchesFile(entry: {
  id: string
  filePath?: string
  data: { slug: string }
}): void {
  const stem = (entry.filePath ?? entry.id).split('/').pop()!.replace(/\.(md|mdx)$/, '')
  if (stem !== entry.data.slug) {
    throw new Error(
      `Post slug "${entry.data.slug}" must match its file name "${stem}" (${entry.filePath ?? entry.id})`,
    )
  }
}

/** Rough reading time (~200 wpm) from the raw post body + FAQ. */
export function readingTimeMinutes(
  body: string | undefined,
  faq: { q: string; a: string }[] = [],
): number {
  const text = [
    (body ?? '')
      .replace(/^import .*$/gm, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[#>*_`~\-[\]()!]/g, ' '),
    ...faq.flatMap((f) => [f.q, f.a]),
  ].join(' ')
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

export function formatPostDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function postKeywords(data: {
  primaryKeyword?: string
  secondaryKeywords?: string[]
  tags?: string[]
}): string[] {
  return [
    ...new Set(
      [data.primaryKeyword, ...(data.secondaryKeywords ?? []), ...(data.tags ?? [])].filter(
        (k): k is string => Boolean(k),
      ),
    ),
  ]
}
