import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from 'react'
import { createPortal } from 'react-dom'
import type { ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types'

type Props = {
  /** Public URL to an Excalidraw scene JSON (e.g. `/diagrams/foo.json`). */
  src: string
  /** Inline board height; number → px. Default 500. */
  height?: number | string
  className?: string
}

type SceneDoc = ExcalidrawInitialDataState & { type?: string; version?: number; source?: string }

const MIN_ZOOM = 0.1
const MAX_ZOOM = 4
const ZOOM_STEP = 1.25

/**
 * Scene JSON → static SVG via Excalidraw's `exportToSvg`, rendered once per page
 * view. The library is imported client-side only, so SSR never resolves it and
 * no editor canvas or editor CSS ships. Dark mode is a CSS filter on the SVG.
 */
async function renderSceneSvg(src: string): Promise<string> {
  const [{ exportToSvg }, res] = await Promise.all([import('@excalidraw/excalidraw'), fetch(src)])
  if (!res.ok) throw new Error(`Could not load diagram (${res.status})`)
  const scene = (await res.json()) as SceneDoc
  const svg = await exportToSvg({
    elements: (scene.elements ?? []) as Parameters<typeof exportToSvg>[0]['elements'],
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
  await loadSceneFonts(svg)
  return svg.outerHTML
}

/** Fonts declared in global.css (`/fonts/excalidraw/`). Others fall back to system fonts. */
const HOSTED_FONTS = new Set(['Excalifont', 'Virgil'])

/** Wait for the hosted fonts the scene uses so text doesn't swap after fade-in. */
async function loadSceneFonts(svg: SVGSVGElement) {
  const loads: Promise<unknown>[] = []
  svg.querySelectorAll('text').forEach((node) => {
    const family = node.getAttribute('font-family')?.split(',')[0]?.trim().replace(/["']/g, '')
    if (family && HOSTED_FONTS.has(family)) loads.push(document.fonts.load(`20px "${family}"`, node.textContent || ' '))
  })
  await Promise.race([Promise.allSettled(loads), new Promise((r) => setTimeout(r, 2500))])
}

type Size = { w: number; h: number }

function readSvgSize(svgMarkup: string): Size {
  const vb = /viewBox="([\d.\-\s]+)"/.exec(svgMarkup)?.[1]?.trim().split(/\s+/).map(Number)
  if (vb && vb.length === 4) return { w: vb[2], h: vb[3] }
  const w = Number(/width="([\d.]+)"/.exec(svgMarkup)?.[1] ?? 0)
  const h = Number(/height="([\d.]+)"/.exec(svgMarkup)?.[1] ?? 0)
  return { w, h }
}

const icon = {
  zoomOut: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M8.5 11h5M16 16l4 4" /></svg>
  ),
  zoomIn: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M8.5 11h5M11 8.5v5M16 16l4 4" /></svg>
  ),
  reset: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 1 0 2.05-4.95" /><path d="M5 4.5V8h3.5" /></svg>
  ),
  expand: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" /></svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
  ),
}

type ViewerProps = {
  svg: string
  size: Size
  label: string
  onOpen?: () => void
  onClose?: () => void
  closeRef?: Ref<HTMLButtonElement>
  /** Keep the pill pinned (e.g. while this board's modal is open). */
  hold?: boolean
}

const UNPIN_DELAY = 1200

/** Pan/zoom viewport over the SVG, with a hover/focus-revealed control pill. */
function SvgViewer({ svg, size, label, onOpen, onClose, closeRef, hold = false }: ViewerProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [frame, setFrame] = useState<Size>({ w: 0, h: 0 })
  const [zoom, setZoom] = useState<number | null>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const drag = useRef<{ id: number; x: number; y: number; px: number; py: number } | null>(null)
  const [pinned, setPinned] = useState(false)
  const hovering = useRef(false)
  const unpinTimer = useRef<number | undefined>(undefined)

  const cancelUnpin = () => window.clearTimeout(unpinTimer.current)
  const scheduleUnpin = () => {
    cancelUnpin()
    unpinTimer.current = window.setTimeout(() => setPinned(false), UNPIN_DELAY)
  }

  useEffect(() => {
    if (hold) cancelUnpin()
    else if (pinned && !hovering.current) scheduleUnpin()
  }, [hold])

  useEffect(() => cancelUnpin, [])

  useLayoutEffect(() => {
    const el = frameRef.current
    if (!el) return
    const measure = () => setFrame({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const fit =
    size.w && size.h && frame.w && frame.h ? Math.min(frame.w / size.w, frame.h / size.h, 1) : 1
  const scale = zoom ?? fit

  const setScale = (next: number) => setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)))
  const reset = () => {
    setZoom(null)
    setPan({ x: 0, y: 0 })
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('.excal-pill')) return
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    setPan({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y })
  }
  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null
  }

  const stage: CSSProperties = {
    width: `${size.w}px`,
    height: `${size.h}px`,
    transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
  }

  return (
    <div
      ref={frameRef}
      className={pinned ? 'excal-viewport is-pinned' : 'excal-viewport'}
      role="group"
      aria-label={label}
      onPointerEnter={() => {
        hovering.current = true
        cancelUnpin()
      }}
      onPointerLeave={() => {
        hovering.current = false
        if (pinned && !hold) scheduleUnpin()
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className="excal-stage" style={stage} role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} />
      <div
        className="excal-pill"
        role="toolbar"
        aria-label="Diagram controls"
        onClickCapture={() => {
          cancelUnpin()
          setPinned(true)
        }}
      >
        <button type="button" aria-label="Zoom out" onClick={() => setScale(scale / ZOOM_STEP)}>
          {icon.zoomOut}
        </button>
        <span className="excal-pill-zoom" aria-live="polite">
          {Math.round(scale * 100)}%
        </span>
        <button type="button" aria-label="Zoom in" onClick={() => setScale(scale * ZOOM_STEP)}>
          {icon.zoomIn}
        </button>
        <span className="excal-pill-sep" aria-hidden="true" />
        <button type="button" aria-label="Reset view" onClick={reset}>
          {icon.reset}
        </button>
        <span className="excal-pill-sep" aria-hidden="true" />
        {onOpen ? (
          <button type="button" aria-label="Expand" onClick={onOpen}>
            {icon.expand}
          </button>
        ) : null}
        {onClose ? (
          <button type="button" aria-label="Close" onClick={onClose} ref={closeRef}>
            {icon.close}
          </button>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Excalidraw diagram for Writing posts. Hydrate with `client:visible` (via the
 * Astro wrapper); renders the scene to SVG, fades it in, and opens a larger
 * copy in a modal that closes on backdrop click, Escape, or Close.
 */
export default function ExcalidrawBoard({ src, height = 500, className }: Props) {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const openerRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let cancelled = false
    setSvg(null)
    setError(null)
    renderSceneSvg(src).then(
      (markup) => !cancelled && setSvg(markup),
      (e) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load diagram'),
    )
    return () => {
      cancelled = true
    }
  }, [src])

  const open = useCallback(() => {
    openerRef.current = document.activeElement as HTMLElement | null
    setExpanded(true)
  }, [])
  const close = useCallback(() => setExpanded(false), [])

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      openerRef.current?.focus()
    }
  }, [expanded, close])

  const size = svg ? readSvgSize(svg) : { w: 0, h: 0 }
  const heightCss = typeof height === 'number' ? `${height}px` : height
  const label = `Diagram: ${src.split('/').pop()?.replace(/\.json$/, '').replace(/[-_]/g, ' ') ?? 'whiteboard'}`

  return (
    <figure
      className={['excal-board', svg ? 'is-ready' : '', className].filter(Boolean).join(' ')}
      style={{ '--excal-h': heightCss } as CSSProperties}
      data-excal-src={src}
    >
      <div className="excal-board-frame">
        <div className="excal-board-placeholder" aria-hidden={Boolean(svg)}>
          {error ? <span role="alert">{error}</span> : <span>Whiteboard</span>}
        </div>
        {svg ? <SvgViewer svg={svg} size={size} label={label} onOpen={open} hold={expanded} /> : null}
      </div>
      {expanded && svg
        ? createPortal(
            <div
              className="excal-modal"
              onPointerDown={(e) => {
                if (e.target === e.currentTarget) close()
              }}
            >
              <div className="excal-modal-board" role="dialog" aria-modal="true" aria-label={label}>
                <SvgViewer svg={svg} size={size} label={label} onClose={close} closeRef={closeRef} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </figure>
  )
}
