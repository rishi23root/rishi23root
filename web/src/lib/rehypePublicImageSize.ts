import { publicImageSize } from './imageSize'

type Node = {
  type?: string
  tagName?: string
  name?: string
  properties?: Record<string, unknown>
  attributes?: { type?: string; name?: string; value?: unknown }[]
  children?: Node[]
}

/** Add width/height to local <img> tags so the layout reserves space. */
export function rehypePublicImageSize() {
  return (tree: Node) => {
    walk(tree, (node) => {
      if (!isImg(node)) return
      const src = getAttr(node, 'src')
      if (typeof src !== 'string') return
      if (hasPositive(getAttr(node, 'width')) && hasPositive(getAttr(node, 'height'))) return
      const size = publicImageSize(src)
      if (!size) return
      setAttr(node, 'width', size.width)
      setAttr(node, 'height', size.height)
    })
  }
}

function isImg(node: Node): boolean {
  if (node.tagName === 'img') return true
  return (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') && node.name === 'img'
}

function getAttr(node: Node, name: string): unknown {
  if (node.properties && name in node.properties) return node.properties[name]
  const attr = node.attributes?.find((a) => a && a.name === name)
  return attr?.value
}

function setAttr(node: Node, name: string, value: number) {
  if (node.properties) {
    node.properties[name] = value
    return
  }
  if (!node.attributes) node.attributes = []
  const attr = node.attributes.find((a) => a && a.name === name)
  if (attr) attr.value = value
  else node.attributes.push({ type: 'mdxJsxAttribute', name, value })
}

function hasPositive(value: unknown): boolean {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  return Number.isFinite(n) && n > 0
}

function walk(node: Node, visit: (node: Node) => void) {
  visit(node)
  node.children?.forEach((child) => walk(child, visit))
}
