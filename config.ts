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

/** Curated featured repos (Innei-style Featured Work). */
export const opensource = {
  active: site.opensource.active,
  /** Short value props; fall back to GitHub description when missing. */
  blurbs: site.opensource.blurbs as Record<string, string>,
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
