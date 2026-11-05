import siteJson from '../../../content/site.json'

export const site = siteJson

export type Site = typeof siteJson

/** GitHub profile photo by URL only — never commit a binary avatar. */
export function githubAvatarUrl(size = 160): string {
  return `https://github.com/${site.github.name}.png?size=${size}`
}

export function publishedPostsFilter<T extends { data: { draft?: boolean } }>(
  entry: T,
): boolean {
  return entry.data.draft !== true
}
