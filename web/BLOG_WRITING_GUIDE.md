# Blog writing guide: rishi23root.in

These are the rules and guardrails for posts on Rishabh's personal site (handle **rishi23root**). They're adapted from the FlowForge blog setup (JSON blog schema, AEO checklist, long-form post layout) and rewritten for a personal blog written in MDX.

Posts live in `content/posts/<slug>.mdx`. The same files feed the site (`/writing/<slug>`), RSS, `llms.txt`, the sitemap and the "Writing" section of the GitHub profile README. Start from `content/posts/draft-template.mdx`, which is a draft and never ships.

## 1. Voice

- First person, as Rishabh: "I built…", "I'd do X again". Never "we" unless it's a real team.
- Plain and specific. Use real numbers, real commands and real trade-offs. Cut filler ("In today's fast-paced world…") and hype ("revolutionary", "game-changing").
- Short paragraphs of 2-4 sentences. One idea per paragraph.
- Write for a smart reader who is busy. Explain a term once, then use it.
- Opinions are welcome, but say what they're based on.

## 2. Article structure

Writing posts follow this section order. It's the story of the work as it actually happened, so a reader can see why the final answer is the final answer.

1. **Title**: the frontmatter `title` (rendered as the H1). Names the problem or answers a real question.
2. **TL;DR**: one or two sentences with the answer. A reader who stops here still gets the point.
3. **What problem I had**: the situation and why it hurt. Concrete: what broke, what it cost, what I needed.
4. **What I tried**: the options I looked at or attempted, briefly, in the order I tried them.
5. **What worked**: the approach I kept, and the reason it beat the others.
6. **What failed**: dead ends and mistakes, with what each one taught me. Be honest; this is often the most useful part.
7. **Architecture**: how the pieces fit together. A diagram (`<ExcalidrawBoard>`) or a short list of components and data flow.
8. **Code**: the smallest real snippets that show how it works. Link to the full files.
9. **Results**: what changed, with numbers where I have them (time, size, cost, errors). Say how I measured.
10. **What I recommend**: what I'd tell someone facing the same problem, including when *not* to do it this way.

Use the names as the `##` headings, in this order. A short qualifier after a colon is fine when it helps the rail (`## What failed: exporting PNGs`). Use `###` inside a section for sub-steps. If a section has nothing real in it (nothing failed, no numbers yet), drop it rather than pad it, and keep the rest in order. Short notes that aren't a build story can skip the structure and just answer first.

`content/posts/draft-template.mdx` has this skeleton ready to copy.

## 3. Formatting

1. **Title:** answers or names a real question. Under 90 characters (enforced). No clickbait.
2. **TL;DR / first paragraph:** answers the title in one or two sentences. You can repeat it in `<Callout tone="answer">`.
3. **Body:** `##` for sections and `###` for sub-steps. Never skip a level or use `#`, since the page already renders the H1 from `title`. Headings feed the "On this page" rail: use the section names from the structure above, and make any `###` inside them descriptive ("Why replay beats prompts", not "Step 2").
4. **Lists:** numbered for steps that happen in order, bullets for unordered points.
5. **Code:** fenced, with a language (` ```ts `). Keep snippets small enough to read; link out to the full code.
6. **Images:** meaningful `alt` text. Keep them in `web/public/writing/<slug>/`.
   **Diagrams:** `<ExcalidrawBoard src="/diagrams/<name>.json" />` for live, read-only Excalidraw scenes stored in `web/public/diagrams/` (see `AGENTS.md` → Excalidraw boards). The text around a board must still make sense without it.
7. **End:** the "What I recommend" section is the ending. No "thanks for reading" sign-off.

## 4. Frontmatter (validated at build)

| Field | Required | Rule |
| --- | --- | --- |
| `title` | yes | 1-90 chars |
| `date` | yes | `YYYY-MM-DD`, the publish date |
| `slug` | yes | kebab-case, **must equal the file name** (the build fails otherwise) |
| `summary` | yes | One sentence, ≤ 220 chars. Used for meta description, OG/Twitter, RSS, `llms.txt` and the README |
| `draft` | no | `true` hides the post from the build, RSS, sitemap, `llms.txt` and the README. Drafts still render in `npm run dev:web` |
| `author` | no | Defaults to `Rishabh` |
| `updated` | no | Set it when a published post materially changes (adds `dateModified`) |
| `tags` | no | 1-4 short lowercase tags |
| `primaryKeyword` / `secondaryKeywords` | no | The phrase someone would actually search for. Don't stuff keywords |
| `seoTitle` | no | Overrides `<title>` only. Keep the H1 human |
| `cover` / `image` | no | Cover under the header / OG image. Falls back to cover, then `/og-default.png` |
| `faq` | no | `- q:` / `a:` pairs. Rendered on the page and as FAQPage JSON-LD |

## 5. FAQ rules

- Add an FAQ only when readers are likely to ask follow-up questions. Two to four items.
- Each answer stands alone in 1-2 sentences, so it can be quoted without the rest of the post.
- Don't repeat the first paragraph word for word.

## 6. Callouts

Use `<Callout>` in MDX. It's available without an import:

- `<Callout tone="answer">`: the short answer near the top.
- `<Callout>` (note): a useful aside.
- `<Callout tone="warning">`: data loss, security or cost gotchas.

Use at most two or three per post. If everything is a callout, nothing is.

## 7. Guardrails (never publish)

- Secrets of any kind: tokens, keys, passwords, `.env` values, internal URLs, signed links.
- Client or employer names, internal screenshots or numbers, unless you have written permission.
- Personal data about other people (emails, phone numbers, addresses).
- Claims you can't back up: benchmarks without a method, "fastest", "best".
- Copied text from other sites without a quote and a link. Credit sources.
- AI-generated text you haven't read, checked and rewritten in your own voice.
- Exploit details for unpatched vulnerabilities (security posts follow responsible disclosure).

## 8. Pre-publish checklist

- [ ] The title answers a real question. The TL;DR answers the title.
- [ ] Sections follow the article structure, in order (empty ones dropped, not padded).
- [ ] The summary is one sentence and reads well as a search snippet.
- [ ] `slug` matches the file name. `draft: false`. `date` is today.
- [ ] Headings are `##`/`###` only and read like an outline.
- [ ] Code blocks have a language. Images have alt text.
- [ ] The guardrails above are clear (no secrets or private data).
- [ ] `npm run build:web` passes, and you've read the post once on mobile width.
- [ ] If you're editing an older post, set `updated`.
