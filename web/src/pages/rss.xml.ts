import { getCollection } from 'astro:content'
import rss from '@astrojs/rss'
import { publishedPostsFilter, site } from '../lib/site'

export async function GET(context: { site?: URL }) {
  const posts = (await getCollection('posts', publishedPostsFilter)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  )

  return rss({
    title: site.github.name,
    description: site.fullDescription,
    site: context.site ?? site.siteUrl,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.summary,
      pubDate: post.data.date,
      link: `/blog/${post.data.slug}`,
    })),
    customData: `<language>en-us</language>`,
  })
}
