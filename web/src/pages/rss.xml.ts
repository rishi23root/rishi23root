import rss from '@astrojs/rss'
import { site } from '../lib/site'
import { getPublishedPosts, postPath } from '../lib/posts'

export async function GET(context: { site?: URL }) {
  const posts = await getPublishedPosts()

  return rss({
    title: site.github.name,
    description: site.fullDescription,
    site: context.site ?? site.siteUrl,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.summary,
      pubDate: post.data.date,
      link: postPath(post.data.slug),
    })),
    customData: `<language>en-us</language>`,
  })
}
