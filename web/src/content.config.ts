import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

/** kebab-case slug; must also equal the file name (checked in lib/site.ts). */
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const faqItem = z.object({
  q: z.string().min(1),
  /** Stand-alone answer: quotable without the rest of the post. */
  a: z.string().min(1),
})

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: '../content/posts' }),
  schema: z.object({
    title: z.string().min(1).max(90),
    date: z.coerce.date(),
    slug: z.string().regex(slugPattern, 'slug must be kebab-case'),
    /** One sentence. Used for meta description, OG, RSS and llms.txt. */
    summary: z.string().min(1).max(220),
    draft: z.boolean().default(false),
    author: z.string().default('Rishabh'),
    /** Set when a published post materially changes. */
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    /** Focus phrase for meta keywords + JSON-LD (optional). */
    primaryKeyword: z.string().optional(),
    secondaryKeywords: z.array(z.string()).default([]),
    /** Override the <title> only (keep the H1 human). */
    seoTitle: z.string().optional(),
    /** Optional cover shown under the header (path in web/public or URL). */
    cover: z.string().optional(),
    /** Optional per-post OG/Twitter image path or absolute URL; falls back to cover, then site default */
    image: z.string().optional(),
    /** Visible FAQ + FAQPage JSON-LD (answer engines). */
    faq: z.array(faqItem).default([]),
  }),
})

export const collections = { posts }
