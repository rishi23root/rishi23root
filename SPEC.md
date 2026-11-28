# SPEC: mobile hamburger menu for the site header

Status: approved by Rishi through the T3 manager brief (2026-11-28). Open
questions at the end; defaults chosen so the build can go ahead.

## Problem

At phone widths (Rishi's phone: ~412px CSS) the header row
`@rishi23root  Home  Projects  Writing  [theme]  @` is wider than the
viewport, so the last icon is cut off and the page scrolls sideways.
Header markup: `web/src/components/SiteChrome.astro` (used by
`web/src/layouts/BaseLayout.astro` for inner pages and by
`web/src/pages/index.astro` for home). Styles: `.chrome*`, `.nav`,
`.theme-toggle`, `.socials-menu*` in `web/src/styles/global.css`.

## Behaviour

### Breakpoint
- `max-width: 40rem` (640px), the site's existing phone breakpoint. Above it
  nothing changes: same markup order, same CSS, same bounding boxes.

### With JavaScript (the normal case), at ≤ 40rem
- Row: wordmark on the left, a **menu button** on the right. Nothing else on
  the row.
- Menu button: a real `<button type="button">`, hamburger icon (3 lines; turns
  into an × while open), `aria-label="Menu"`, `aria-expanded="false|true"`,
  `aria-controls` pointing at the panel's `id`. Tap target at least
  **44×44 CSS px**. Visible focus ring like the other chrome controls
  (`2px solid var(--accent)`).
- Panel: the existing `.chrome-end` (nav + theme toggle + `@` socials menu),
  shown as a **slide-down overlay** directly under the header row, full
  content width, `var(--bg)` background, a hairline `var(--border)` and a soft
  shadow. It is positioned absolutely, so opening it **does not move page
  content** (no layout shift).
  - Home / Projects / Writing stacked, each row ≥ 44px tall, current page
    keeps `aria-current="page"` and its underline/colour.
  - A last row with the theme toggle and the `@` socials trigger, each
    ≥ 44×44. The socials dropdown still works from inside the panel and stays
    inside the viewport.
- Closed panel is not focusable and not announced (`hidden` or
  `visibility: hidden` + `inert`); open panel is in the tab order right after
  the button.
- Open: tap/click the button, or Enter/Space on it. Focus stays on the button
  (disclosure pattern); the next Tab goes to the first link.
- Close, and set `aria-expanded="false"`:
  - the button again;
  - **Escape** anywhere: focus returns to the button. If the socials dropdown
    is open, the first Escape closes only that (innermost first);
  - a click/tap **outside** the header and panel;
  - **focus leaving** the header (Tab past the last control or Shift+Tab
    before the button): no focus trap, it is a non-modal disclosure;
  - following a nav link (page navigates anyway);
  - viewport growing past 40rem (panel state resets, desktop layout shows).
- The theme toggle inside the panel does **not** close the panel.
- Motion: ~160–200ms opacity + translateY slide; none under
  `prefers-reduced-motion: reduce`.

### Without JavaScript, at ≤ 40rem
- The menu button is not shown (it only appears when `<html>` has class `js`,
  set by the existing inline head script before first paint, so there is no
  flash or shift for JS users).
- Fallback layout: wordmark on row 1; nav links and icons on row 2, wrapping,
  all visible, no sideways scroll. (The theme toggle needs JS in any case.)

### Themes and pages
- Works in light and dark; the panel uses theme tokens only.
- Works on home (`/`, chrome inside `.home-text`), inner pages
  (`.chrome-bar`), posts, and the 404 "lost" page (its light-on-dark override
  covers the menu button too).
- Stays above the sticky post TOC/rail and below the command palette
  (`.kbar`).

## Out of scope
- Desktop/tablet (> 40rem) layout and the command palette.
- PR #91's other fixes (skip link, focus rings, inline code wrap, previews,
  Excalidraw pill). This spec supersedes only #91's ≤ 30rem header-wrap block.

## Done when
1. At 320, 375, 412 px, light and dark, every route has
   `document.documentElement.scrollWidth === innerWidth` with the menu closed
   and open.
2. Menu button ≥ 44×44 and fully inside the viewport; `aria-expanded`,
   `aria-controls` correct in both states.
3. Escape, outside click, focus-out and the button each close it; Escape
   returns focus to the button; the theme toggle does not close it.
4. Opening does not change the top of `main` (no layout shift).
5. With JS disabled at 375px: no menu button, all links and icons visible, no
   sideways scroll.
6. At 1280px the header looks and measures the same as on master.
7. `npm run check`, `npm test`, `npm run build:web` pass.

## Open questions (defaults in use)
1. Breakpoint 40rem (640px) vs #91's 30rem (480px). Default 40rem: more margin
   for larger text settings; the row only just fits at 481px.
2. Overlay panel vs pushing content down. Default overlay (no layout shift).
3. Should the `@` socials links be listed flat inside the panel instead of
   the nested `@` dropdown? Default: keep the `@` dropdown (one source,
   less change).
4. Focus trap vs close-on-focus-out. Default: no trap (non-modal), focus
   returns to the button on Escape.
