import { jpgFallback } from './media'

type Props = {
  src: string
  /** Extra class on the scene (is-entering / is-leaving for crossfade). */
  className?: string
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
