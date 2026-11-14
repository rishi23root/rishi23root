import siteJson from '../../../content/site.json'

export const site = siteJson

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

/** Site chrome / bio icon ids (no website self-link — already on-site). */
export type SocialId = 'email' | 'x' | 'linkedin' | 'github' | 'pypi'

/**
 * Contact links for site icon rows + Person JSON-LD `sameAs`.
 * Omits `contact.socials.website` (canonical URL is `Person.url` / the open tab).
 * README contact inject still renders Website separately via `index.ts`.
 */
export const socialLinks: { id: SocialId; label: string; href: string }[] = [
  { id: 'email', label: 'Email', href: `mailto:${site.contact.email}` },
  { id: 'x', label: 'X', href: site.contact.socials.x },
  { id: 'linkedin', label: 'LinkedIn', href: site.contact.socials.linkedin },
  { id: 'github', label: 'GitHub', href: site.contact.socials.github },
  { id: 'pypi', label: 'PyPI', href: site.contact.socials.pypi },
]
