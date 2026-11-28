import rss from '@astrojs/rss'
import { site } from '../lib/site'
import { getPublishedPosts, postPath } from '../lib/posts'

export async function GET(context: { site?: URL }) {
  const posts = await getPublishedPosts()

  return rss({
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    title: site.github.name,
    description: site.fullDescription,
    site: context.site ?? site.siteUrl,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.summary,
      pubDate: post.data.date,
      link: postPath(post.data.slug),
    })),
    customData: [
      '<language>en-us</language>',
      `<atom:link href="${new URL('/rss.xml', site.siteUrl)}" rel="self" type="application/rss+xml"/>`,
      posts[0]
        ? `<lastBuildDate>${new Date(posts[0].data.updated ?? posts[0].data.date).toUTCString()}</lastBuildDate>`
        : '',
    ].join(''),
  })
}
