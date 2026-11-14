import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { ExcalidrawImperativeAPI, ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types'

type Theme = 'light' | 'dark'

type Props = {
  /** Public URL to an Excalidraw scene JSON (e.g. `/diagrams/foo.json`). */
  src: string
  /** Board height; number → px. Default 500. */
  height?: number | string
  className?: string
}

function readSiteTheme(): Theme {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

function useSiteTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(readSiteTheme)
  useEffect(() => {
    const root = document.documentElement
    const sync = () => setTheme(readSiteTheme())
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])
  return theme
}

type SceneDoc = ExcalidrawInitialDataState & {
  type?: string
  version?: number
  source?: string
}

/**
 * Live Excalidraw board for Writing posts: view + zen mode, theme-aware,
 * fits content on load. Hydrate with `client:visible` (via Astro wrapper).
 */
export default function ExcalidrawBoard({ src, height = 500, className }: Props) {
  const theme = useSiteTheme()
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const [Excalidraw, setExcalidraw] = useState<typeof import('@excalidraw/excalidraw').Excalidraw | null>(
    null,
  )
  const [scene, setScene] = useState<SceneDoc | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Client-only, so SSR never resolves the package. The CSS is imported by file
        // path: the package exports `index.css` only under dev/prod conditions, which
        // some resolvers don't pass, and its fonts load relative to this file.
        const [mod] = await Promise.all([
          import('@excalidraw/excalidraw'),
          import('../../node_modules/@excalidraw/excalidraw/dist/prod/index.css'),
        ])
        if (!cancelled) setExcalidraw(() => mod.Excalidraw)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load whiteboard')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setScene(null)
    setError(null)
    ;(async () => {
      try {
        const res = await fetch(src)
        if (!res.ok) throw new Error(`Could not load diagram (${res.status})`)
        const data = (await res.json()) as SceneDoc
        if (!cancelled) setScene(data)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load diagram')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [src])

  const fit = useCallback((api: ExcalidrawImperativeAPI) => {
    // Defer one frame so the canvas has a real size.
    requestAnimationFrame(() => {
      api.scrollToContent(undefined, { fitToContent: true })
    })
  }, [])

  const onApi = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      apiRef.current = api
      fit(api)
    },
    [fit],
  )

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [expanded])

  useEffect(() => {
    if (expanded && apiRef.current) fit(apiRef.current)
  }, [expanded, fit])

  const heightCss = typeof height === 'number' ? `${height}px` : height
  const ready = Boolean(Excalidraw && scene && !error)
  const style = { '--excal-h': heightCss } as CSSProperties
  const Board = Excalidraw

  const board =
    ready && Board ? (
      <Board
        key={`${src}-${expanded ? 'full' : 'inline'}`}
        excalidrawAPI={onApi}
        initialData={{
          elements: scene!.elements ?? [],
          appState: {
            ...(scene!.appState ?? {}),
            viewBackgroundColor: 'transparent',
          },
          files: scene!.files ?? {},
          scrollToContent: true,
        }}
        viewModeEnabled
        zenModeEnabled
        theme={theme}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: false,
            clearCanvas: false,
            export: false,
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: false,
            saveAsImage: false,
          },
        }}
      />
    ) : null

  return (
    <figure
      className={['excal-board', className, expanded ? 'is-expanded' : ''].filter(Boolean).join(' ')}
      style={style}
      data-excal-src={src}
    >
      <div className="excal-board-frame" role="group" aria-label="Whiteboard">
        {!ready && !error ? (
          <div className="excal-board-placeholder" aria-busy="true">
            <span>Whiteboard</span>
          </div>
        ) : null}
        {error ? (
          <div className="excal-board-placeholder excal-board-error" role="alert">
            {error}
          </div>
        ) : null}
        {ready && !expanded ? <div className="excal-board-canvas">{board}</div> : null}
        {ready && !expanded ? (
          <button
            type="button"
            className="excal-board-expand"
            aria-label="Expand whiteboard"
            aria-expanded={false}
            onPointerDown={(e) => {
              e.stopPropagation()
              setExpanded(true)
            }}
          >
            Expand
          </button>
        ) : null}
      </div>
      {expanded && typeof document !== 'undefined'
        ? createPortal(
            <div className="excal-board-modal" role="dialog" aria-modal="true" aria-label="Expanded whiteboard">
              <button
                type="button"
                className="excal-board-expand excal-board-expand-close"
                aria-label="Close expanded whiteboard"
                aria-expanded={true}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  setExpanded(false)
                }}
              >
                Close
              </button>
              <div className="excal-board-modal-canvas">{board}</div>
            </div>,
            document.body,
          )
        : null}
    </figure>
  )
}
