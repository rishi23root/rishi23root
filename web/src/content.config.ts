import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: '../content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    slug: z.string(),
    summary: z.string(),
    draft: z.boolean().default(false),
    /** Optional per-post OG/Twitter image path or absolute URL; falls back to site default */
    image: z.string().optional(),
  }),
})

export const collections = { posts }
