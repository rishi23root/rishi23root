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

export type SocialId = 'email' | 'website' | 'x' | 'linkedin' | 'github' | 'pypi'

/** Contact links in display order (footer icons, Person JSON-LD). */
export const socialLinks: { id: SocialId; label: string; href: string }[] = [
  { id: 'email', label: 'Email', href: `mailto:${site.contact.email}` },
  { id: 'website', label: 'Website', href: site.contact.socials.website },
  { id: 'x', label: 'X', href: site.contact.socials.x },
  { id: 'linkedin', label: 'LinkedIn', href: site.contact.socials.linkedin },
  { id: 'github', label: 'GitHub', href: site.contact.socials.github },
  { id: 'pypi', label: 'PyPI', href: site.contact.socials.pypi },
]
