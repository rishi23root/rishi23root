/**
 * Serialize data for an inline <script> tag, escaping `<` so embedded
 * strings (e.g. `</script>` or `<!--`) can never close the script element.
 */
export function safeJson(value: unknown): string {
  return (JSON.stringify(value) ?? 'null').replace(/</g, '\\u003c')
}
