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
