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
export function getOrderedProjects(
  projects: Project[] = (site.projects ?? []) as Project[],
): Project[] {
  return [...projects].sort(
    (a, b) =>
      (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER),
  )
}

/** Featured projects (`featured !== false`), sorted by `order` ascending. */
export function getFeaturedProjects(
  projects: Project[] = (site.projects ?? []) as Project[],
): Project[] {
  return getOrderedProjects(projects).filter((project) => project.featured !== false)
}

/** Unique project tags with counts, sorted by count descending then alphabetically.
 * Drops tags that match every project (a filter that selects all items is a no-op).
 */
export function getProjectTags(projects: Project[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const project of projects) {
    for (const tag of normalizeProjectTags(project.tags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count < projects.length)
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
  if (url.origin === new URL(site.siteUrl).origin && !isFile && !url.pathname.endsWith('/')) {
    url.pathname = `${url.pathname}/`
  }
  return url.toString()
}

/** GitHub profile photo by URL only — never commit a binary avatar. */
export function githubAvatarUrl(size = 160): string {
  return `https://github.com/${site.github.name}.png?size=${size}`
}

/** Ids for the chrome `@` SocialsMenu (+ kbar Socials & Person JSON-LD `sameAs`). */
export type SocialId = 'email' | 'x' | 'linkedin' | 'github' | 'pypi'

export type SocialLink = {
  id: SocialId
  label: string
  href: string
  meta: string
  iconPath: string
}

const tailSegment = (url: string) => url.replace(/\/+$/, '').split('/').pop() ?? ''

/**
 * Site social links for `SocialsMenu`, `CommandPalette`, and Person JSON-LD `sameAs`.
 * Omits `contact.socials.website` (already on-site; canonical is `Person.url`).
 * README `contact_inject` still renders Website via `index.ts`.
 */
export const socialLinks: SocialLink[] = [
  {
    id: 'email',
    label: 'Email',
    href: `mailto:${site.contact.email}`,
    meta: site.contact.email,
    iconPath:
      'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z',
  },
  {
    id: 'x',
    label: 'X',
    href: site.contact.socials.x,
    meta: `@${tailSegment(site.contact.socials.x)} ↗`,
    iconPath:
      'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.727-8.849L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    href: site.contact.socials.linkedin,
    meta: `${site.contact.socials.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\//, '').replace(/\/+$/, '')} ↗`,
    iconPath:
      'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM8.5 18H6v-8h2.5v8zM7.25 9.25A1.75 1.75 0 1 1 7.25 5.75a1.75 1.75 0 0 1 0 3.5zM18 18h-2.5v-4.2c0-1.55-.55-2.05-1.4-2.05-.9 0-1.35.65-1.55 1.25-.05.2-.05.45-.05.7V18H10v-8h2.4v1.1c.45-.75 1.2-1.35 2.55-1.35 1.85 0 3.05 1.2 3.05 3.8V18z',
  },
  {
    id: 'github',
    label: 'GitHub',
    href: site.contact.socials.github,
    meta: `${tailSegment(site.contact.socials.github)} ↗`,
    iconPath:
      'M12 .5C5.73.5.5 5.74.5 12.02c0 5.1 3.29 9.43 7.86 10.96.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.58.24 2.75.12 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.07.78 2.16 0 1.56-.01 2.81-.01 3.19 0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.74 18.27.5 12 .5z',
  },
  {
    id: 'pypi',
    label: 'PyPI',
    href: site.contact.socials.pypi,
    meta: `${tailSegment(site.contact.socials.pypi)} ↗`,
    iconPath:
      'M12 2C7.58 2 4 2.9 4 4.5v3c0 1.6 3.58 2.5 8 2.5s8-.9 8-2.5v-3C20 2.9 16.42 2 12 2zm0 1.5c3.87 0 6.5.7 6.5 1.5S15.87 6.5 12 6.5 5.5 5.8 5.5 5 8.13 3.5 12 3.5zM4 9v3c0 1.6 3.58 2.5 8 2.5s8-.9 8-2.5V9c-1.3.9-4.2 1.5-8 1.5S5.3 9.9 4 9zm0 5v3c0 1.6 3.58 2.5 8 2.5s8-.9 8-2.5v-3c-1.3.9-4.2 1.5-8 1.5S5.3 14.9 4 14zm0 5v.5C4 21.1 7.58 22 12 22s8-.9 8-2.5V19c-1.3.9-4.2 1.5-8 1.5S5.3 19.9 4 19z',
  },
]
