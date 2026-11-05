import { getCollection } from 'astro:content'
import type { APIRoute } from 'astro'
import { publishedPostsFilter, site } from '../lib/site'

export const GET: APIRoute = async () => {
  const posts = (await getCollection('posts', publishedPostsFilter)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  )

  const lines = [
    `# ${site.github.name}`,
    '',
    `> ${site.fullDescription}`,
    '',
    `Site: ${site.siteUrl}`,
    `Blog: ${site.siteUrl}/blog`,
    `RSS: ${site.siteUrl}/rss.xml`,
    `GitHub: ${site.contact.socials.github}`,
    `Email: ${site.contact.email}`,
    '',
    '## Key pages',
    '',
    `- ${site.siteUrl}/`,
    `- ${site.siteUrl}/blog`,
    `- ${site.siteUrl}/rss.xml`,
    ...posts.map((post) => `- ${site.siteUrl}/blog/${post.data.slug}`),
    '',
    '## Posts',
    '',
    ...posts.map(
      (post) =>
        `- ${post.data.date.toISOString().slice(0, 10)} — [${post.data.title}](${site.siteUrl}/blog/${post.data.slug}): ${post.data.summary}`,
    ),
    '',
    '## Content source',
    '',
    'Shared markdown/MDX and site metadata live in the GitHub profile repo under `content/`.',
    'The profile README and this static site both build from that tree.',
    'This file is generated at build time from `content/site.json` and published posts.',
    '',
  ]

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
