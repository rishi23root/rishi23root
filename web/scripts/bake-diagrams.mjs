/**
 * Render every `web/diagrams/*.json` scene to SVG with Excalidraw's
 * `exportToSvg`. The register() call has to happen before the package import:
 * a static import would run first and die on the JSON/CSS loads.
 */
import { register } from 'node:module'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const diagramsDir = path.join(webRoot, 'diagrams')
const outDir = path.join(webRoot, '.generated', 'diagrams')

mkdirSync(outDir, { recursive: true })

const scenes = existsSync(diagramsDir)
  ? readdirSync(diagramsDir).filter((name) => name.endsWith('.json'))
  : []
const expectedSvgs = new Set(scenes.map((name) => name.replace(/\.json$/, '.svg')))

for (const existing of readdirSync(outDir)) {
  if (existing.endsWith('.svg') && !expectedSvgs.has(existing)) {
    unlinkSync(path.join(outDir, existing))
    console.log(`removed stale ${existing}`)
  }
}

const scriptMtime = statSync(fileURLToPath(import.meta.url)).mtimeMs
const staleScenes = scenes.filter((name) => {
  const svgPath = path.join(outDir, name.replace(/\.json$/, '.svg'))
  if (!existsSync(svgPath)) return true
  const srcMtime = Math.max(statSync(path.join(diagramsDir, name)).mtimeMs, scriptMtime)
  return statSync(svgPath).mtimeMs < srcMtime
})

if (staleScenes.length === 0) {
  process.exit(0)
}

const { JSDOM } = await import('jsdom')
await register('./excalidraw-loader.mjs', import.meta.url)

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'https://rishi23root.in/',
  pretendToBeVisual: true,
})
const { window } = dom

// Node 26 already defines `navigator` as a getter-only global. defineProperty
// replaces it on 20 and 26; a plain assignment throws on 26.
function installGlobal(name, value) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true })
}

installGlobal('window', window)
installGlobal('self', window)
installGlobal('top', window.top)
installGlobal('parent', window.parent)
installGlobal('location', window.location)
installGlobal('document', window.document)
installGlobal('DOMParser', window.DOMParser)
installGlobal('XMLSerializer', window.XMLSerializer)
installGlobal('SVGElement', window.SVGElement)
installGlobal('SVGSVGElement', window.SVGSVGElement)
installGlobal('HTMLElement', window.HTMLElement)
installGlobal('navigator', window.navigator)
// The prod bundle reads these as free globals, not as `window.*`.
installGlobal('devicePixelRatio', window.devicePixelRatio || 1)
installGlobal('requestAnimationFrame', window.requestAnimationFrame.bind(window))
installGlobal('cancelAnimationFrame', window.cancelAnimationFrame.bind(window))
installGlobal('getComputedStyle', window.getComputedStyle.bind(window))
for (const name of [
  'Element',
  'Node',
  'DocumentFragment',
  'HTMLCanvasElement',
  'HTMLImageElement',
  'HTMLBRElement',
  'HTMLInputElement',
  'HTMLTextAreaElement',
  'HTMLSelectElement',
  'Image',
  'MutationObserver',
  'ResizeObserver',
  'DOMRect',
  'Range',
]) {
  if (typeof window[name] !== 'undefined') installGlobal(name, window[name])
}

// jsdom's canvas getContext returns null unless the native `canvas` package is
// installed. SVG export does not read pixels. measureText only has to return a
// width so text elements are not dropped. No native canvas module.
const scratchCanvas = window.document.createElement('canvas')
const canvas2d = new Proxy(
  {},
  {
    get: (_target, prop) => {
      if (prop === 'canvas') return scratchCanvas
      if (prop === 'measureText') {
        return (text) => ({
          width: String(text ?? '').length * 8,
          actualBoundingBoxAscent: 12,
          actualBoundingBoxDescent: 3,
        })
      }
      if (typeof prop === 'symbol') return undefined
      return () => {}
    },
    has: () => true,
  },
)
window.HTMLCanvasElement.prototype.getContext = function getContext() {
  return canvas2d
}

// Font registration does `new FontFace(...)` even when glyphs are not inlined.
// A stub keeps the family name on the SVG text; the page's @font-face rules paint it.
class BakeFontFace {
  constructor(family, source, descriptors = {}) {
    this.family = family
    this.source = source
    this.status = 'loaded'
    this.display = descriptors.display ?? 'swap'
    this.style = descriptors.style ?? 'normal'
    this.weight = descriptors.weight ?? '400'
  }
  load() {
    return Promise.resolve(this)
  }
}
installGlobal('FontFace', BakeFontFace)
const fontFaces = new Set()
Object.defineProperty(window.document, 'fonts', {
  configurable: true,
  value: {
    add: (face) => fontFaces.add(face),
    has: (face) => fontFaces.has(face),
    delete: (face) => fontFaces.delete(face),
    check: () => true,
    load: () => Promise.resolve([]),
    ready: Promise.resolve(),
    forEach: (cb) => fontFaces.forEach(cb),
    [Symbol.iterator]: () => fontFaces[Symbol.iterator](),
  },
})

const { exportToSvg } = await import('@excalidraw/excalidraw')

for (const name of staleScenes) {
  const scenePath = path.join(diagramsDir, name)
  const scene = JSON.parse(readFileSync(scenePath, 'utf8'))
  try {
    const svg = await exportToSvg({
      elements: scene.elements ?? [],
      appState: {
        ...(scene.appState ?? {}),
        exportBackground: false,
        exportWithDarkMode: false,
        viewBackgroundColor: 'transparent',
      },
      files: scene.files ?? null,
      exportPadding: 16,
      skipInliningFonts: true,
    })
    const markup = svg.outerHTML
    if (!markup || !markup.includes('<svg')) {
      throw new Error('exportToSvg returned no SVG')
    }
    const outName = name.replace(/\.json$/, '.svg')
    writeFileSync(path.join(outDir, outName), markup)
    console.log(`baked ${outName}`)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to bake ${name}: ${detail}`, { cause: err })
  }
}
