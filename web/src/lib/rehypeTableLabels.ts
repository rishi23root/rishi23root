type Node = {
  type?: string
  tagName?: string
  value?: string
  properties?: Record<string, unknown>
  children?: Node[]
}

/** Copy each column header onto its body cells as `data-label`, so narrow screens can stack rows. */
export function rehypeTableLabels() {
  return (tree: Node) => {
    walk(tree, (node) => {
      if (node.tagName !== 'table') return
      const headRow = find(node, 'thead', 'tr')
      if (!headRow) return
      const labels = cells(headRow).map((cell) => text(cell).trim())
      const body = node.children?.find((child) => child.tagName === 'tbody')
      body?.children?.forEach((row) => {
        if (row.tagName !== 'tr') return
        cells(row).forEach((cell, i) => {
          if (!labels[i]) return
          cell.properties = { ...cell.properties, dataLabel: labels[i] }
        })
      })
    })
  }
}

function cells(row: Node): Node[] {
  return row.children?.filter((child) => child.tagName === 'th' || child.tagName === 'td') ?? []
}

function find(node: Node, ...path: string[]): Node | undefined {
  let current: Node | undefined = node
  for (const tag of path) current = current?.children?.find((child) => child.tagName === tag)
  return current
}

function text(node: Node): string {
  if (node.type === 'text') return node.value ?? ''
  return node.children?.map(text).join('') ?? ''
}

function walk(node: Node, visit: (node: Node) => void) {
  visit(node)
  node.children?.forEach((child) => walk(child, visit))
}
