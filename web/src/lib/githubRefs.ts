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

/** Repo and PR links in a post's MDX source, ignoring fenced code. */
export function findGithubRefs(source: string): GithubRef[] {
  const text = source.replace(/^```[\s\S]*?^```/gm, '')
  const seen = new Map<string, GithubRef>()
  for (const [url] of text.matchAll(/https?:\/\/(?:www\.)?github\.com\/[^\s)"'<>\]]+/g)) {
    const ref = parseGithubUrl(url)
    if (ref) seen.set(refKey(ref), ref)
  }
  return [...seen.values()]
}
