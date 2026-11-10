type Props = {
  src: string
  /** Soft fade-in when true (off under reduced motion). */
  fade?: boolean
}

function jpgFallback(src: string): string | null {
  if (!src.endsWith('.webp')) return null
  return src.slice(0, -5) + '.jpg'
}

/** Static mood plate — WebP primary, optional JPG sibling fallback. */
export default function MoodStill({ src, fade = false }: Props) {
  const fallback = jpgFallback(src)

  return (
    <div className={`mood-scene mood-still-scene${fade ? ' is-fade' : ''}`}>
      <div className="mood-layer mood-still">
        {fallback ? (
          <picture>
            <source srcSet={src} type="image/webp" />
            <img
              src={fallback}
              alt=""
              decoding="async"
              fetchPriority="high"
              draggable={false}
            />
          </picture>
        ) : (
          <img
            src={src}
            alt=""
            decoding="async"
            fetchPriority="high"
            draggable={false}
          />
        )}
      </div>
    </div>
  )
}
