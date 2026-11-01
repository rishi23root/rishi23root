export const github = {
  name: 'rishi23root',
}

/** Shared handle for social profile URLs. */
export const socialHandle = 'rishi23root'

/** Mail + socials (identity icons + footer). */
export const contact = {
  email: 'rishabhjainfinal@gmail.com',
  socials: {
    x: `https://x.com/${socialHandle}`,
    linkedin: `https://www.linkedin.com/in/${socialHandle}`,
    github: `https://github.com/${socialHandle}`,
    pypi: `https://pypi.org/user/${socialHandle}`,
    // Stack Overflow profiles need user id + slug; slug alone 404s
    stackoverflow: 'https://stackoverflow.com/users/11915284/rishi23root',
  },
}

/** Curated featured repos (Innei-style Featured Work). */
export const opensource = {
  active: [
    'saeeddhqan/Maryam',
    'rishi23root/opencv_wrap',
    'rishi23root/pyblink',
    'rishi23root/resume-editor',
    'rishi23root/selenium-automations',
    'rishi23root/class_automations',
  ],
  /** Short value props; fall back to GitHub description when missing. */
  blurbs: {
    'saeeddhqan/Maryam': 'Open-source OSINT framework',
    'rishi23root/opencv_wrap':
      'Thin OpenCV wrappers for everyday CV scripts',
    'rishi23root/pyblink':
      'Blink-counter automation to ease eye strain',
    'rishi23root/resume-editor':
      'Web app for crafting professional resumes fast',
    'rishi23root/selenium-automations':
      'Selenium scripts for repetitive browser workflows',
    'rishi23root/class_automations':
      'Python/bash automations for repetitive class workflows',
  } as Record<string, string>,
}

/** `$ whoami` role line. */
export const shortBio = 'freelancer · SaaS · security · automation'

/** Second line under whoami. */
export const fullDescription =
  'I build SaaS products, automate the boring parts, and keep security in the loop.'

/** `$ echo $STACK` — plain text companion to the Stacks badge row. */
export const stackLine = 'TypeScript · Python · Node.js · React · Bash'

/** How many starred repos to show under Recently liked. */
export const recentLikedCount = 8

export const timeZone = 'Asia/Kolkata'
