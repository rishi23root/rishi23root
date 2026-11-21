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

function parseYamlScalar(rawValue: string): string | boolean {
  const trimmed = rawValue.trim()
  if (!trimmed) return ''

  // Double-quoted scalar: supports escaped quotes/backslashes + trailing # comments.
  if (trimmed.startsWith('"')) {
    let out = ''
    let escaped = false
    for (let i = 1; i < trimmed.length; i++) {
      const ch = trimmed[i]
      if (escaped) {
        if (ch === 'n') out += '\n'
        else if (ch === 'r') out += '\r'
        else if (ch === 't') out += '\t'
        else out += ch
        escaped = false
      } else if (ch === '\\') {
        escaped = true
      } else if (ch === '"') {
        return out
      } else {
        out += ch
      }
    }
    return out
  }

  // Single-quoted scalar: YAML escapes ' as '' + trailing # comments.
  if (trimmed.startsWith("'")) {
    let out = ''
    for (let i = 1; i < trimmed.length; i++) {
      const ch = trimmed[i]
      if (ch === "'") {
        if (trimmed[i + 1] === "'") {
          out += "'"
          i++
        } else {
          return out
        }
      } else {
        out += ch
      }
    }
    return out
  }

  // Unquoted scalar: strip inline comments preceded by whitespace.
  const value = trimmed.replace(/\s+#.*$/, '').trim()
  const lower = value.toLowerCase()
  if (lower === 'true') return true
  if (lower === 'false') return false
  return value
}

/** Minimal YAML-ish frontmatter parser for title/date/slug/summary/draft. */
export function parseFrontmatter(raw: string): Record<string, string | boolean> {
  const normalized = raw.replace(/^\uFEFF/, '')
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) return {}
  const data: Record<string, string | boolean> = {}
  for (const line of match[1].split(/\r?\n/)) {
    if (/^\s*(#|$)/.test(line)) continue
    const m = line.match(/^([A-Za-z0-9_]+):(?:\s+(.*)|\s*)$/)
    if (!m) continue
    data[m[1]] = parseYamlScalar(m[2] ?? '')
  }
  return data
}

function parseDateMs(dateStr: string): number {
  const ms = Date.parse(dateStr)
  return Number.isNaN(ms) ? 0 : ms
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
    const draft =
      fm.draft === true ||
      (typeof fm.draft === 'string' && fm.draft.toLowerCase() === 'true')
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

  return posts.sort((a, b) => {
    const diff = parseDateMs(b.date) - parseDateMs(a.date)
    if (diff !== 0) return diff
    return a.slug.localeCompare(b.slug)
  })
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
      const url = `${base}/writing/${p.slug}/`
      return `- **[${p.title}](${url})** — ${p.date}`
    })
    .join('\n')
}
