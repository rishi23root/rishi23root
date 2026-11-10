export type MoodLayers = {
  base: string
  clouds?: string
  shadows?: string
  grass?: string
}

export type MoodSlot = {
  id: string
  animated?: boolean
  src?: string
  layers?: MoodLayers
  component?: string
  alt?: string
}
