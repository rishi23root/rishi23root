import { defineConfig } from 'astro/config'
import { rehypePublicImageSize } from './src/lib/rehypePublicImageSize.ts'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://rishi23root.in',
  output: 'static',
  integrations: [mdx({ rehypePlugins: [rehypePublicImageSize] }), react(), sitemap()],
  // Index redirect; per-slug redirects live in pages/blog/[slug].astro
  redirects: {
    '/blog': '/writing',
  },
  markdown: {
    rehypePlugins: [rehypePublicImageSize],
  },
})
