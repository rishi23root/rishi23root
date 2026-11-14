import { fileURLToPath } from 'node:url'
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
  },
  markdown: {
    rehypePlugins: [rehypePublicImageSize],
  },
  vite: {
    resolve: {
      alias: [
        // The package exports `./index.css` only under `development` / `production`
        // conditions (no `default`), so resolvers without them fail. Pin the file.
        {
          find: /^@excalidraw\/excalidraw\/index\.css$/,
          replacement: fileURLToPath(
            new URL('./node_modules/@excalidraw/excalidraw/dist/prod/index.css', import.meta.url),
          ),
        },
      ],
    },
  },
})
