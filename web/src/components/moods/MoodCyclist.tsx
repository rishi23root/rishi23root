import type { MoodLayers } from './types'

type Props = {
  layers: MoodLayers
  reduceMotion: boolean
}

/**
 * Windy cyclist — layered PNG/JPG + CSS only (no GSAP).
 * - Clouds + exact source shadow plate: one-way drift, shared timeline (locked).
 * - Shadows are never flattened or regenerated — use `layers.shadows` as-is.
 * - Grass + base (cyclist in plate): brief one-shot sway, not continuous loops.
 */
export default function MoodCyclist({ layers, reduceMotion }: Props) {
  const still = reduceMotion || !layers.clouds

  if (still) {
    // Prefer composed still if present; else base (+ static shadow plate if any)
    const src = layers.base
    return (
      <div className="mood-scene mood-cyclist is-still">
        <div className="mood-layer mood-still">
          <img src={src} alt="" decoding="async" draggable={false} />
        </div>
        {layers.shadows ? (
          <div className="mood-layer mood-shadows is-static">
            <img
              src={layers.shadows}
              alt=""
              decoding="async"
              draggable={false}
            />
          </div>
        ) : null}
        {layers.clouds ? (
          <div className="mood-layer mood-clouds is-static">
            <img src={layers.clouds} alt="" decoding="async" draggable={false} />
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="mood-scene mood-cyclist is-animated">
      {/* Base plate includes cyclist — brief bob via CSS class */}
      <div className="mood-layer mood-base mood-cyclist-pulse">
        <img
          src={layers.base}
          alt=""
          decoding="async"
          fetchPriority="high"
          draggable={false}
        />
      </div>

      {/* Soft grass shimmer — brief pulse only */}
      <div
        className="mood-layer mood-grass-displace mood-grass-pulse"
        aria-hidden="true"
      >
        <img src={layers.base} alt="" decoding="async" draggable={false} />
      </div>

      <div
        className="mood-layer mood-grass-hatch mood-grass-pulse"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 540 960"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="grassHatch"
              width="10"
              height="14"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-18)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="14"
                stroke="rgba(28,52,24,0.42)"
                strokeWidth="1.15"
              />
              <line
                x1="5"
                y1="0"
                x2="5"
                y2="14"
                stroke="rgba(28,52,24,0.22)"
                strokeWidth="0.9"
              />
            </pattern>
            <pattern
              id="grassHatch2"
              width="12"
              height="16"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(12)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="16"
                stroke="rgba(20,40,18,0.28)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect className="hatch-a" width="540" height="960" fill="url(#grassHatch)" />
          <rect
            className="hatch-b"
            width="540"
            height="960"
            fill="url(#grassHatch2)"
            opacity="0.7"
          />
        </svg>
      </div>

      {/* Exact source shadow plate — locked to cloud one-way drift */}
      {layers.shadows ? (
        <div className="mood-layer mood-shadows mood-wind-locked">
          <img src={layers.shadows} alt="" decoding="async" draggable={false} />
        </div>
      ) : null}

      {layers.clouds ? (
        <div className="mood-layer mood-clouds mood-wind-locked">
          <img src={layers.clouds} alt="" decoding="async" draggable={false} />
        </div>
      ) : null}
    </div>
  )
}
