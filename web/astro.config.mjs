import { defineConfig } from 'astro/config'
import { unified } from '@astrojs/markdown-remark'
import { rehypePublicImageSize } from './src/lib/rehypePublicImageSize.ts'
import { rehypeTableLabels } from './src/lib/rehypeTableLabels.ts'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import { excalidrawBake } from './scripts/excalidraw-integration.mjs'

export default defineConfig({
  site: 'https://rishi23root.in',
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    excalidrawBake(),
    mdx(),
    react(),
    sitemap({
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
    processor: unified({
      rehypePlugins: [rehypePublicImageSize, rehypeTableLabels],
    }),
  },
})
