type Props = {
  id: string
}

/** Empty plate for a mood that has no image yet. */
export default function MoodStub({ id }: Props) {
  return (
    <div className="mood-scene mood-stub" data-stub-id={id} aria-hidden="true">
      <div className="hero-shell-empty" />
    </div>
  )
}
