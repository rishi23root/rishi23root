# Factory (agent-skills) in this repo

The skills come from [rishi23root/agent-skills](https://github.com/rishi23root/agent-skills),
linked, not copied, so they follow that checkout.

## Install (once per machine/checkout)

```
node /home/rishi/projects/agent-skills/scripts/install.mjs --project /home/rishi/projects/rishi23root
```

This makes one symlink per skill in `.claude/skills/` and `.agents/skills/`,
pointing at `/home/rishi/projects/agent-skills/skills/<name>`. Both folders are
gitignored. Check the machine with
`node /home/rishi/projects/agent-skills/scripts/setup.mjs --project .`.

## Update

```
git -C /home/rishi/projects/agent-skills pull --ff-only && \
node /home/rishi/projects/agent-skills/scripts/install.mjs --project /home/rishi/projects/rishi23root
```

- **Touches:** the skills' content (instant through the links), links for any
  new skills, and each skill's machine-local `local.md` inside agent-skills.
- **Does not touch:** anything tracked in this repo, `.factory/profile.md`
  (this repo's config; `docs/agents/factory.md` links to it), `.factory/ledger.md`,
  `.factory/previews/`. The installer refuses to overwrite files it did not create.
- A skill removed upstream leaves a dangling link; remove it with
  `install.mjs --project … --remove` and re-run install.

Remove: `node /home/rishi/projects/agent-skills/scripts/install.mjs --project /home/rishi/projects/rishi23root --remove`.

## Local state (not in git)

- `.factory/ledger.md`: the manager's ledger for feature-size runs
- `.factory/previews/<task>/`: screenshots for owner review
