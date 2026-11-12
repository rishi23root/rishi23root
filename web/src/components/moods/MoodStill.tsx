type Props = {
  src: string
  /** Extra class on the scene (is-entering / is-leaving for crossfade). */
  className?: string
}

function jpgFallback(src: string): string | null {
  if (!src.endsWith('.webp')) return null
  return src.slice(0, -5) + '.jpg'
}

/** Static mood plate — WebP primary, optional JPG sibling fallback. */
export default function MoodStill({ src, className = '' }: Props) {
  const fallback = jpgFallback(src)
  const img = (
    <img src={fallback ?? src} alt="" decoding="async" fetchPriority="high" draggable={false} />
  )

  return (
    <div className={`mood-scene mood-still-scene ${className}`.trim()}>
      <div className="mood-layer mood-still">
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
