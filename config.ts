/** GitHub username — single source for API calls + whoami line. */
export const github = {
  name: 'rishi23root',
}

/** Same handle used in social profile URLs. */
export const socialHandle = github.name

/** Mail + socials (bottom text links). */
export const contact = {
  email: 'hi@rishi23root.in',
  socials: {
    x: `https://x.com/${socialHandle}`,
    linkedin: `https://www.linkedin.com/in/${socialHandle}`,
    github: `https://github.com/${socialHandle}`,
    pypi: `https://pypi.org/user/${socialHandle}`,
  },
}

/** Curated featured repos (Innei-style Featured Work). */
export const opensource = {
  active: [
    'saeeddhqan/Maryam',
    'EpicGames/PixelStreamingInfrastructure',
    'rishi23root/opencv_wrap',
    'rishi23root/pyblink',
    'rishi23root/resume-editor',
    'rishi23root/selenium-automations',
  ],
  /** Short value props; fall back to GitHub description when missing. */
  blurbs: {
    'saeeddhqan/Maryam': 'Open-source OSINT framework',
    'EpicGames/PixelStreamingInfrastructure':
      'Epic Games Unreal Pixel Streaming servers and frontend',
    'rishi23root/opencv_wrap':
      'Thin OpenCV wrappers for everyday CV scripts',
    'rishi23root/pyblink':
      'Blink-counter automation to ease eye strain',
    'rishi23root/resume-editor':
      'Web app for crafting professional resumes fast',
    'rishi23root/selenium-automations':
      'Selenium scripts for repetitive browser workflows',
  } as Record<string, string>,
}

/** Centered Innei-style motto lines (「 samp 」). */
export const mottos = ['timshel', 'fac quod debes']

/** `$ whoami` role line. */
export const shortBio = 'freelancer · SaaS · security · automation'

/** Second line under whoami. */
export const fullDescription =
  'I build SaaS products, automate the boring parts, and keep security in the loop.'

/** `$ echo $STACK` — plain text companion to Toolbox. */
export const stackLine =
  'TypeScript · Python · Node.js · React · React Native'

/** How many starred repos to show under Recently liked. */
export const recentLikedCount = 8
