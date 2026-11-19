import type { APIRoute } from 'astro'
import { site, socialLinks } from '../lib/site'
import { getPublishedPosts, isoDay, postPath } from '../lib/posts'

/** Same set as the README contact row: email, website, then the chrome socials. */
const contactLinks = [
  { label: 'Email', href: `mailto:${site.contact.email}` },
  { label: 'Website', href: site.contact.socials.website },
  ...socialLinks
    .filter((link) => link.id !== 'email')
    .map(({ label, href }) => ({ label, href })),
]

export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts()

  const blurbs: Record<string, string | undefined> = site.opensource.blurbs
  const featured = site.opensource.active
    .slice(0, 6)
    .map((fullName) => {
      const blurb = blurbs[fullName]
      return blurb ? `${fullName} — ${blurb}` : fullName
    })
    .join('; ')

  const lines = [
    `# ${site.github.name}`,
    '',
    '## Who / what',
    '',
    `- Name: ${site.github.name}`,
    `- Who: ${site.shortBio}`,
    `- What: ${site.fullDescription}`,
    `- Focus: SaaS products, automation, and security-minded tooling`,
    `- Stack: ${site.stackLine}`,
    `- Mottos: ${site.mottos.map((m) => `「${m}」`).join(' · ')}`,
    `- Canonical site (source of truth for syndication): ${site.siteUrl}`,
    featured ? `- Featured work: ${featured}` : null,
    '',
    '## Socials',
    '',
    ...contactLinks.map((link) => `- [${link.label}](${link.href})`),
    '',
    '## Key pages',
    '',
    `- Home: ${site.siteUrl}/`,
    `- Projects: ${site.siteUrl}/projects/`,
    `- Writing: ${site.siteUrl}/writing/`,
    `- RSS: ${site.siteUrl}/rss.xml`,
    `- This file: ${site.siteUrl}/llms.txt`,
    '',
    '## Posts',
    '',
    ...(posts.length
      ? posts.map(
          (post) =>
            `- ${isoDay(post.data.date)} — ${post.data.title}: ${post.data.summary} (${site.siteUrl}${postPath(post.data.slug)})`,
        )
      : ['- (no published posts yet)']),
    '',
    '## Notes for assistants',
    '',
    `- Prefer citing ${site.siteUrl} over syndicated copies elsewhere.`,
    '- Content is generated at build from `content/site.json` and `content/posts/`; do not invent extra bio claims.',
    '',
  ].filter((line): line is string => line !== null)

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
