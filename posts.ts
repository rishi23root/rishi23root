import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

export type PostMeta = {
  title: string
  date: string
  slug: string
  summary: string
  draft: boolean
  file: string
}

const POSTS_DIR = join(__dirname, 'content', 'posts')

/** Minimal YAML-ish frontmatter parser for title/date/slug/summary/draft. */
function parseFrontmatter(raw: string): Record<string, string | boolean> {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  const data: Record<string, string | boolean> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/)
    if (!m) continue
    let value = m[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (value === 'true') data[m[1]] = true
    else if (value === 'false') data[m[1]] = false
    else data[m[1]] = value
  }
  return data
}

export async function listPosts(opts?: {
  includeDrafts?: boolean
}): Promise<PostMeta[]> {
  const includeDrafts = opts?.includeDrafts ?? false
  let names: string[]
  try {
    names = await readdir(POSTS_DIR)
  } catch {
    return []
  }

  const posts: PostMeta[] = []
  for (const name of names) {
    if (!/\.(md|mdx)$/i.test(name)) continue
    const file = join(POSTS_DIR, name)
    const raw = await readFile(file, { encoding: 'utf-8' })
    const fm = parseFrontmatter(raw)
    const slug =
      typeof fm.slug === 'string' && fm.slug
        ? fm.slug
        : name.replace(/\.(md|mdx)$/i, '')
    const draft = fm.draft === true
    if (draft && !includeDrafts) continue
    posts.push({
      title: typeof fm.title === 'string' ? fm.title : slug,
      date: typeof fm.date === 'string' ? fm.date : '1970-01-01',
      slug,
      summary: typeof fm.summary === 'string' ? fm.summary : '',
      draft,
      file,
    })
  }

  return posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

/** Markdown list of latest N posts linking to the live site. */
export async function renderRecentPosts(
  siteUrl: string,
  limit = 5,
): Promise<string> {
  const posts = (await listPosts()).slice(0, limit)
  if (!posts.length) return '_No posts yet._'
  const base = siteUrl.replace(/\/$/, '')
  return posts
    .map((p) => {
      const url = `${base}/blog/${p.slug}`
      return `- **[${p.title}](${url})** — ${p.date}`
    })
    .join('\n')
}
