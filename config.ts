export const github = {
  name: 'rishi23root',
}

/** Curated featured repos (Innei-style Featured Work). */
export const opensource = {
  active: [
    'monkeytypegame/monkeytype',
    'saeeddhqan/Maryam',
    'rishi23root/opencv_wrap',
    'rishi23root/ASCII_video',
    'rishi23root/git-commit-drawing',
    'rishi23root/class_automations',
  ],
  /** Short value props; fall back to GitHub description when missing. */
  blurbs: {
    'monkeytypegame/monkeytype':
      'Minimal, highly customizable typing test',
    'saeeddhqan/Maryam': 'Open-source OSINT framework',
    'rishi23root/opencv_wrap':
      'Thin OpenCV wrappers for everyday CV scripts',
    'rishi23root/ASCII_video': 'Turn video into ASCII art',
    'rishi23root/git-commit-drawing':
      'Draw on your GitHub contribution graph',
    'rishi23root/class_automations':
      'Python/bash automations for repetitive class workflows',
  } as Record<string, string>,
}

/** `$ whoami` role line (not Innei’s copy). */
export const shortBio = 'freelancer · SaaS · security · automation'

/** Second line under whoami. */
export const fullDescription =
  'I build SaaS products, automate the boring parts, and keep security in the loop.'

/** `$ echo $STACK` — plain text, not badges. */
export const stackLine = 'TypeScript · Python · Node.js · React · Bash'

export const timeZone = 'Asia/Kolkata'
