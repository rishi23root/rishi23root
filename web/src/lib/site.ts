import siteJson from '../../../content/site.json'

export const site = siteJson

export type Site = typeof siteJson

export function publishedPostsFilter<T extends { data: { draft?: boolean } }>(
  entry: T,
): boolean {
  return entry.data.draft !== true
}
