type Props = {
  id: string
}

/** Placeholder for moods without assets yet (workshop / transit / ridge). */
export default function MoodStub({ id }: Props) {
  return (
    <div className="mood-scene mood-stub" data-stub-id={id} aria-hidden="true">
      <div className="hero-shell-empty" />
    </div>
  )
}
