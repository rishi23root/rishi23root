import { useCallback, useEffect, useRef } from 'react'

type Props = {
  src: string
  /** Extra class on the scene (is-entering / is-leaving for crossfade). */
  className?: string
  /** Fires once, when the still has loaded or failed. */
  onReady?: () => void
}

/** Static mood plate — WebP only (universal support for target browsers). */
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

  return (
    <div className={`mood-still-scene ${className}`.trim()}>
      <div className="mood-layer">
        <img
          ref={imgRef}
          src={src}
          alt=""
          width={720}
          height={1280}
          decoding="async"
          fetchPriority="high"
          draggable={false}
        />
      </div>
    </div>
  )
}
