/** github.com URL parsing shared by the build and the hover-preview script. */

export type GithubRef =
  | { kind: 'repo'; owner: string; repo: string }
  | { kind: 'pr'; owner: string; repo: string; number: number }

const RESERVED_OWNERS = new Set([
  'orgs', 'settings', 'features', 'sponsors', 'topics', 'marketplace', 'apps',
  'about', 'pricing', 'login', 'join', 'explore', 'notifications', 'collections',
])

export function refKey(ref: GithubRef): string {
  return ref.kind === 'pr' ? `${ref.owner}/${ref.repo}#${ref.number}`.toLowerCase() : `${ref.owner}/${ref.repo}`.toLowerCase()
}

export function githubUrl(ref: GithubRef): string {
  const base = `https://github.com/${ref.owner}/${ref.repo}`
  return ref.kind === 'pr' ? `${base}/pull/${ref.number}` : base
}

/** Parse a github.com repo or pull request URL; anything else returns null. */
export function parseGithubUrl(href: string): GithubRef | null {
  const m = /^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/pull\/(\d+)(?:\/(?:files|commits))?)?\/?(?:[?#].*)?$/.exec(href)
  if (!m || RESERVED_OWNERS.has(m[1].toLowerCase())) return null
  return m[3] ? { kind: 'pr', owner: m[1], repo: m[2], number: Number(m[3]) } : { kind: 'repo', owner: m[1], repo: m[2] }
}

function stripFencedCode(source: string): string {
  const out: string[] = []
  let fence: { char: string; len: number } | null = null
  for (const line of source.split('\n')) {
    if (fence) {
      const close = /^[ \t]*(`{3,}|~{3,})[ \t]*\r?$/.exec(line)
      if (close && close[1][0] === fence.char && close[1].length >= fence.len) fence = null
      continue
    }
    const open = /^[ \t]*(`{3,}|~{3,})(.*)$/.exec(line)
    if (open && (open[1][0] === '~' || !open[2].includes('`'))) {
      fence = { char: open[1][0], len: open[1].length }
      continue
    }
    out.push(line)
  }
  return out.join('\n')
}

/** Repo and PR links in a post's MDX source, ignoring fenced and inline code. */
export function findGithubRefs(source: string): GithubRef[] {
  const text = stripFencedCode(source).replace(/(?<!`)(`+)(?!`)(?:(?!\r?\n[ \t]*\r?\n)[\s\S])*?(?<!`)\1(?!`)/g, '')
  const seen = new Map<string, GithubRef>()
  for (const [raw] of text.matchAll(/https?:\/\/(?:www\.)?github\.com\/[^\s)"'<>\]]+/g)) {
    const url = raw.replace(/[.,;:!?)]+$/, '')
    const ref = parseGithubUrl(url)
    if (ref) seen.set(refKey(ref), ref)
  }
  return [...seen.values()]
}
