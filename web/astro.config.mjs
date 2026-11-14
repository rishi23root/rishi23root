import { defineConfig } from 'astro/config'
import { rehypePublicImageSize } from './src/lib/rehypePublicImageSize.ts'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://rishi23root.in',
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    mdx({ rehypePlugins: [rehypePublicImageSize] }),
    react(),
    sitemap({
      filter: (page) => {
        try {
          const { pathname } = new URL(page)
          if (pathname === '/mood' || pathname.startsWith('/mood/')) return false
          if (pathname === '/blog' || pathname.startsWith('/blog/')) return false
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
    rehypePlugins: [rehypePublicImageSize],
  },
})
