import { useCallback, useEffect, useRef } from 'react'
import { jpgFallback } from './media'

type Props = {
  src: string
  /** Extra class on the scene (is-entering / is-leaving for crossfade). */
  className?: string
  /** Fires once, when the still has loaded or failed. */
  onReady?: () => void
}

/** Static mood plate — WebP primary, optional JPG sibling fallback. */
export default function MoodStill({ src, className = '', onReady }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const fired = useRef(false)

  const ready = useCallback(() => {
    if (fired.current) return
    fired.current = true
    onReady?.()
  }, [onReady])

  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    if (img.complete && img.naturalWidth > 0) {
      ready()
      return
    }
    img.addEventListener('load', ready)
    img.addEventListener('error', ready)
    return () => {
      img.removeEventListener('load', ready)
      img.removeEventListener('error', ready)
    }
  }, [src, ready])

  const fallback = jpgFallback(src)
  const img = (
    <img
      ref={imgRef}
      src={fallback ?? src}
      alt=""
      decoding="async"
      fetchPriority="high"
      draggable={false}
    />
  )

  return (
    <div className={`mood-scene mood-still-scene ${className}`.trim()}>
      <div className="mood-layer">
        {fallback ? (
          <picture>
            <source srcSet={src} type="image/webp" />
            {img}
          </picture>
        ) : (
          img
        )}
      </div>
    </div>
  )
}
