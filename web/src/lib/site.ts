import siteJson from '../../../content/site.json'

export const site = siteJson

export type Project = {
  title: string
  blurb?: string
  url: string
  order?: number
  repo?: string
  featured?: boolean
  tags?: string[]
}

/** Normalize a project's tags (trimmed, lowercase, deduplicated). */
export function normalizeProjectTags(tags?: string[]): string[] {
  if (!tags?.length) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of tags) {
    const tag = raw.trim().toLowerCase()
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    out.push(tag)
  }
  return out
}

/** Projects sorted by explicit `order` ascending (unordered items last). */
export function getOrderedProjects(): Project[] {
  return [...((site.projects ?? []) as Project[])].sort(
    (a, b) => (a.order ?? 99) - (b.order ?? 99),
  )
}

/** Featured projects (`featured !== false`), sorted by `order` ascending. */
export function getFeaturedProjects(): Project[] {
  return getOrderedProjects().filter((project) => project.featured !== false)
}

/** Unique project tags with counts, sorted by count descending then alphabetically. */
export function getProjectTags(projects: Project[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const project of projects) {
    for (const tag of normalizeProjectTags(project.tags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

/**
 * Absolute URL on the canonical site (canonical links, OG, JSON-LD).
 * Directory-style paths keep a trailing slash to match `trailingSlash: 'always'`;
 * file paths (rss.xml, images, fonts) do not.
 */
export function absoluteUrl(path: string): string {
  const url = new URL(path, `${site.siteUrl}/`)
  const isFile = /\.[a-z0-9]+$/i.test(url.pathname.split('/').pop() ?? '')
  if (!isFile && !url.pathname.endsWith('/')) {
    url.pathname = `${url.pathname}/`
  }
  return url.toString()
}

/** GitHub profile photo by URL only — never commit a binary avatar. */
export function githubAvatarUrl(size = 160): string {
  return `https://github.com/${site.github.name}.png?size=${size}`
}

/** Ids for the chrome `@` SocialsMenu (+ Person JSON-LD `sameAs`). */
export type SocialId = 'email' | 'x' | 'linkedin' | 'github' | 'pypi'

/**
 * Site social links for `SocialsMenu` and Person JSON-LD `sameAs`.
 * Omits `contact.socials.website` (already on-site; canonical is `Person.url`).
 * README `contact_inject` still renders Website via `index.ts`.
 */
export const socialLinks: { id: SocialId; label: string; href: string }[] = [
  { id: 'email', label: 'Email', href: `mailto:${site.contact.email}` },
  { id: 'x', label: 'X', href: site.contact.socials.x },
  { id: 'linkedin', label: 'LinkedIn', href: site.contact.socials.linkedin },
  { id: 'github', label: 'GitHub', href: site.contact.socials.github },
  { id: 'pypi', label: 'PyPI', href: site.contact.socials.pypi },
]
