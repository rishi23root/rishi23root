export const github = {
  name: 'rishi23root',
}

/** Mail + X shown in the identity row and footer. */
export const contact = {
  email: 'rishabhjainfinal@gmail.com',
  xUrl: 'https://x.com/rishi23jain',
  xHandle: 'rishi23jain',
}

/** Curated featured repos (Innei-style Featured Work). */
export const opensource = {
  active: [
    'monkeytypegame/monkeytype',
    'rishi23root/opencv_wrap',
    'rishi23root/pyblink',
    'rishi23root/resume-editor',
    'rishi23root/selenium-automations',
    'rishi23root/class_automations',
  ],
  /** Short value props; fall back to GitHub description when missing. */
  blurbs: {
    'monkeytypegame/monkeytype':
      'Minimal, highly customizable typing test',
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
