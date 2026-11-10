type Props = {
  src: string
  /** Soft fade-in when true (off under reduced motion). */
  fade?: boolean
}

/** Static mood plate — single image, optional quiet fade. */
export default function MoodStill({ src, fade = true }: Props) {
  return (
    <div className={`mood-scene mood-still-scene${fade ? ' is-fade' : ''}`}>
      <div className="mood-layer mood-still">
        <img src={src} alt="" decoding="async" fetchPriority="high" draggable={false} />
      </div>
    </div>
  )
}
