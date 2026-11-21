import site from './content/site.json'

/** GitHub username — single source for API calls + whoami line. */
export const github = {
  name: site.github.name,
}

/** Same handle used in social profile URLs. */
export const socialHandle = github.name

/** Canonical site URL (landing + blog). */
export const siteUrl = site.siteUrl

/** Mail + socials (bottom text links). */
export const contact = site.contact

type SiteProject = {
  title: string
  blurb?: string
  url: string
  order?: number
  repo?: string
  featured?: boolean
  tags?: string[]
}

const featuredProjects = [...((site.projects ?? []) as SiteProject[])]
  .filter(
    (p): p is SiteProject & { repo: string } =>
      Boolean(p.repo) && p.featured !== false,
  )
  .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))

const opensourceBlurbs: Record<string, string> = {}
for (const project of featuredProjects) {
  if (project.blurb) opensourceBlurbs[project.repo] = project.blurb
}

/** Curated featured repos (Innei-style Featured Work), derived from site.projects. */
export const opensource = {
  active: featuredProjects.map((p) => p.repo),
  /** Short value props; fall back to GitHub description when missing. */
  blurbs: opensourceBlurbs,
}

/** Centered Innei-style motto lines (「 samp 」). */
export const mottos = site.mottos

/** `$ whoami` role line. */
export const shortBio = site.shortBio

/** Second line under whoami. */
export const fullDescription = site.fullDescription

/** `$ echo $STACK` — plain text companion to Toolbox. */
export const stackLine = site.stackLine

/** How many starred repos to show under Recently liked. */
export const recentLikedCount = site.recentLikedCount
