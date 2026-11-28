import { defineConfig } from 'astro/config'
import { unified } from '@astrojs/markdown-remark'
import { rehypePublicImageSize } from './src/lib/rehypePublicImageSize.ts'
import { rehypeTableLabels } from './src/lib/rehypeTableLabels.ts'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import { readdirSync, readFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { excalidrawBake } from './scripts/excalidraw-integration.mjs'

const draftSlugs = []
const posts = readdirSync(new URL('../content/posts/', import.meta.url))
  .filter((file) => /\.mdx?$/.test(file))
  .map((file) => {
    const source = readFileSync(new URL(`../content/posts/${file}`, import.meta.url), 'utf8')
    const frontmatter = source.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] ?? ''
    const field = (name) =>
      frontmatter.match(new RegExp(`^${name}:\\s*([^\\n]+)`, 'm'))?.[1].trim().replace(/^['"]|['"]$/g, '')
    if (field('draft') === 'true') {
      draftSlugs.push(field('slug'))
      return null
    }
    return { slug: field('slug'), date: new Date(field('date')), updated: field('updated') }
  })
  .filter(Boolean)
const latestPostDate = posts.reduce(
  (latest, post) => (post.date > latest ? post.date : latest),
  new Date(0),
)
// public/writing/<slug>/ (e.g. a draft's og.png) is copied verbatim; drop it for drafts.
const dropDraftAssets = {
  name: 'drop-draft-assets',
  hooks: {
    'astro:build:done': ({ dir }) => {
      for (const slug of draftSlugs) {
        if (slug) rmSync(fileURLToPath(new URL(`writing/${slug}/`, dir)), { recursive: true, force: true })
      }
    },
  },
}
const postDates = new Map(posts.map((post) => [post.slug, new Date(post.updated ?? post.date)]))

export default defineConfig({
  site: 'https://rishi23root.in',
  output: 'static',
  trailingSlash: 'always',
  server: { host: '0.0.0.0' },
  integrations: [
    excalidrawBake(),
    dropDraftAssets,
    mdx(),
    react(),
    sitemap({
      serialize(item) {
        const { pathname } = new URL(item.url)
        const slug = pathname.match(/^\/writing\/([^/]+)\/$/)?.[1]
        const lastmod = slug
          ? postDates.get(slug)
          : pathname === '/' || pathname === '/writing/'
            ? latestPostDate
            : undefined
        return lastmod ? { ...item, lastmod } : item
      },
      filter: (page) => {
        try {
          const { pathname } = new URL(page)
          if (pathname === '/mood' || pathname.startsWith('/mood/')) return false
          if (pathname === '/blog' || pathname.startsWith('/blog/')) return false
          if (pathname === '/404' || pathname === '/404/' || pathname === '/404.html') return false
          return true
        } catch {
          return true
        }
      },
    }),
  ],
  // Index redirect; per-slug redirects live in pages/blog/[slug].astro
  redirects: {
    '/blog': '/writing/',
    '/writing/on-shared-content': '/writing/how-this-site-works/',
  },
  markdown: {
    // Dual themes, no default colour: global.css picks --shiki-dark/--shiki-light
    // from html[data-theme] and paints the block with the site's --frame-bg.
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
      defaultColor: false,
    },
    processor: unified({
      rehypePlugins: [rehypePublicImageSize, rehypeTableLabels],
    }),
  },
})
