import { getCollection } from 'astro:content'
import type { APIRoute } from 'astro'
import { publishedPostsFilter, site } from '../lib/site'

export const GET: APIRoute = async () => {
  const posts = (await getCollection('posts', publishedPostsFilter)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  )

  const socials = site.contact.socials
  const featured = site.opensource.active
    .slice(0, 6)
    .map((fullName) => {
      const blurb = site.opensource.blurbs[fullName]
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
    `- Contact: ${site.contact.email}`,
    `- Also: ${socials.github} · ${socials.x} · ${socials.linkedin} · ${socials.pypi}`,
    featured ? `- Featured work: ${featured}` : null,
    '',
    '## Key pages',
    '',
    `- Home: ${site.siteUrl}/`,
    `- Blog: ${site.siteUrl}/blog`,
    `- RSS: ${site.siteUrl}/rss.xml`,
    `- This file: ${site.siteUrl}/llms.txt`,
    '',
    '## Posts',
    '',
    ...(posts.length
      ? posts.map(
          (post) =>
            `- ${post.data.date.toISOString().slice(0, 10)} — ${post.data.title}: ${post.data.summary} (${site.siteUrl}/blog/${post.data.slug})`,
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
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
