import assert from 'node:assert'
import { createRequire } from 'node:module'
import { safeJson } from '../src/lib/safeJson'
import { findGithubRefs, parseGithubUrl, refKey } from '../src/lib/githubRefs'
import { excerpt } from '../src/lib/github'
import { publicImageSize, sniff } from '../src/lib/imageSize'
import { rehypePublicImageSize } from '../src/lib/rehypePublicImageSize'
import { score } from '../src/components/command-palette/palette'
import { createMoodBag } from '../src/components/moods/cycle'
import { initSocialsMenu } from '../src/scripts/socials-menu'

// 7. safeJson escapes `<` against </script> breakout and handles undefined
const escaped = safeJson({ html: '</script><!--x' })
assert.ok(!escaped.includes('<'))
assert.deepStrictEqual(JSON.parse(escaped), { html: '</script><!--x' })
assert.strictEqual(safeJson(undefined), 'null')

// 8. githubRefs strips fences, inline code, comments, and trailing punctuation
const refs = findGithubRefs(
  [
    '<!-- https://github.com/a/ignored-html -->',
    '{/* https://github.com/a/ignored-mdx */}',
    '```ts\nhttps://github.com/a/ignored-fence\n```',
    '~~~\nhttps://github.com/a/ignored-tilde\n~~~',
    'Inline `https://github.com/a/ignored-inline` stays out.',
    'Use `<!-- recent_posts_inject -->` from https://github.com/rishi23root/rishi23root and `<!-- toolbox_inject -->`.',
    'See https://github.com/rishi23root/pyblink. and https://github.com/rishi23root/rishi23root/pull/21/files).',
    'Ignored https://github.com/orgs/something',
  ].join('\n'),
)
assert.deepStrictEqual(refs.map(refKey), ['rishi23root/rishi23root', 'rishi23root/pyblink', 'rishi23root/rishi23root#21'])
assert.strictEqual(parseGithubUrl('https://github.com/features/actions'), null)

// 9. github.ts excerpt skips dividers/blockquotes, preserves generics in backticks, truncates spaceless strings
assert.strictEqual(
  excerpt('---\n\n> [!NOTE]\n> Meta\n\nReturn `Promise<RepoData | null>` from cache.'),
  'Return Promise<RepoData | null> from cache.',
)
const spaceless = 'a'.repeat(200)
assert.strictEqual(excerpt(spaceless, 50), 'a'.repeat(50) + '…')

// 10. imageSize & rehypePublicImageSize: real PNG/WebP, padded JPEG, traversal guard, MDX & HAST attributes
assert.deepStrictEqual(publicImageSize('/og-default.png?v=1#top'), { width: 1200, height: 630 })
assert.deepStrictEqual(publicImageSize('/mood/cyclist.webp'), { width: 720, height: 1280 })
assert.strictEqual(publicImageSize('/../package.json'), undefined)
assert.strictEqual(publicImageSize('/%2e%2e/package.json'), undefined)
assert.strictEqual(publicImageSize('/%ZZ'), undefined)
const paddedJpeg = Buffer.from([
  0xff, 0xd8, // SOI
  0xff, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, // APP0 with repeated 0xFF padding
  0xff, 0xc0, 0x00, 0x0b, 0x08, 0x01, 0xe0, 0x02, 0x80, 0x03, 0x01, 0x11, 0x00, // SOF0 640x480
  0xff, 0xd9,
])
assert.deepStrictEqual(sniff(paddedJpeg), { width: 640, height: 480 })

const mdxTree = {
  type: 'root',
  children: [
    {
      type: 'mdxJsxFlowElement',
      name: 'img',
      attributes: [{ type: 'mdxJsxAttribute', name: 'src', value: '/og-default.png' }],
    },
    {
      type: 'mdxJsxFlowElement',
      name: 'img',
      attributes: [
        { type: 'mdxJsxAttribute', name: 'src', value: '/og-default.png' },
        {
          type: 'mdxJsxAttribute',
          name: 'width',
          value: { type: 'mdxJsxAttributeValueExpression', value: '400' },
        },
      ],
    },
    {
      type: 'element',
      tagName: 'img',
      properties: { src: '/og-default.png' },
    },
  ],
}
rehypePublicImageSize()(mdxTree)
assert.deepStrictEqual(mdxTree.children[0].attributes, [
  { type: 'mdxJsxAttribute', name: 'src', value: '/og-default.png' },
  { type: 'mdxJsxAttribute', name: 'width', value: '1200' },
  { type: 'mdxJsxAttribute', name: 'height', value: '630' },
])
assert.strictEqual(mdxTree.children[1].attributes?.length, 2)
assert.deepStrictEqual(mdxTree.children[2].properties, {
  src: '/og-default.png',
  width: 1200,
  height: 630,
})

// 11. palette.ts score ranks prefix > late substring (>50 chars) > subsequence > miss
const longTitle = 'a'.repeat(60) + 'target'
assert.strictEqual(score('target item', 'target'), 100)
assert.ok(score(longTitle, 'target') > 50)
assert.strictEqual(score('writing', 'wtg'), 20)
assert.strictEqual(score('home', 'zzz'), 0)

// 12. cycle.ts createMoodBag visits all items and obeys avoidFirst on wrap-around
const bag = createMoodBag('test-bag')
const ids = ['a', 'b', 'c']
const first = bag.advance(ids, null)
assert.strictEqual(first.index, 0)
assert.ok(bag.sameSet(first.order, ids))
const wrapped = bag.advance(ids, { order: ids, index: 2 })
assert.strictEqual(wrapped.index, 0)
assert.notStrictEqual(wrapped.order[0], 'c')

// 13. socials-menu.ts DOM state machine (pin, null-relatedTarget focusout, panel mousedown, Escape)
const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom') as {
  JSDOM: new (html: string, opts?: { url?: string }) => { window: Window & typeof globalThis & { close(): void } }
}
const dom = new JSDOM(
  `<div data-socials-menu>
    <button class="socials-menu-trigger" type="button" aria-expanded="false"><span>@</span></button>
    <div class="socials-menu-panel" role="menu" hidden>
      <a role="menuitem" href="mailto:test@example.com">Email</a>
      <a role="menuitem" href="https://github.com/rishi23root">GitHub</a>
    </div>
  </div>`,
  { url: 'https://rishi23root.in/' },
)
dom.window.matchMedia = (query: string) => ({ matches: query.includes('reduce') }) as unknown as MediaQueryList
const prevGlobals = {
  window: globalThis.window,
  document: globalThis.document,
  Node: globalThis.Node,
  HTMLElement: globalThis.HTMLElement,
}
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  Node: dom.window.Node,
  HTMLElement: dom.window.HTMLElement,
})
try {
  const menuRoot = dom.window.document.querySelector<HTMLElement>('[data-socials-menu]')!
  const trigger = menuRoot.querySelector<HTMLButtonElement>('.socials-menu-trigger')!
  const panel = menuRoot.querySelector<HTMLElement>('.socials-menu-panel')!
  const firstItem = panel.querySelector<HTMLAnchorElement>('[role="menuitem"]')!
  initSocialsMenu(menuRoot)

  trigger.click()
  assert.strictEqual(trigger.getAttribute('aria-expanded'), 'true')
  assert.ok(trigger.hasAttribute('data-pinned'))
  assert.strictEqual(panel.hidden, false)
  assert.strictEqual(dom.window.document.activeElement, firstItem)

  menuRoot.dispatchEvent(new dom.window.FocusEvent('focusout', { bubbles: true, relatedTarget: null }))
  assert.strictEqual(trigger.getAttribute('aria-expanded'), 'true')
  assert.strictEqual(panel.inert, false)

  const panelDown = new dom.window.MouseEvent('mousedown', { bubbles: true, cancelable: true })
  panel.dispatchEvent(panelDown)
  assert.strictEqual(panelDown.defaultPrevented, true)

  trigger.click()
  assert.strictEqual(trigger.getAttribute('aria-expanded'), 'false')
  assert.ok(!trigger.hasAttribute('data-pinned'))

  trigger.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
  assert.strictEqual(trigger.getAttribute('aria-expanded'), 'true')
  dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
  assert.strictEqual(trigger.getAttribute('aria-expanded'), 'false')
  assert.strictEqual(dom.window.document.activeElement, trigger)
} finally {
  dom.window.close()
  Object.assign(globalThis, prevGlobals)
}

console.log('web.test.ts: all assertions passed')
