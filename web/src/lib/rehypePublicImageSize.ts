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
      if (hasDimension(getAttr(node, 'width')) || hasDimension(getAttr(node, 'height'))) return
      const size = publicImageSize(src)
      if (!size) return
      setAttr(node, 'width', size.width)
      setAttr(node, 'height', size.height)
    })
  }
}

function isMdxJsx(node: Node): boolean {
  return node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement'
}

function isImg(node: Node): boolean {
  if (node.tagName === 'img') return true
  return isMdxJsx(node) && node.name === 'img'
}

function getAttr(node: Node, name: string): unknown {
  if (isMdxJsx(node)) {
    const attr = node.attributes?.find((a) => a && a.name === name)
    return attr?.value
  }
  return node.properties?.[name]
}

function setAttr(node: Node, name: string, value: number) {
  if (isMdxJsx(node)) {
    if (!node.attributes) node.attributes = []
    const str = String(value)
    const attr = node.attributes.find((a) => a && a.name === name)
    if (attr) attr.value = str
    else node.attributes.push({ type: 'mdxJsxAttribute', name, value: str })
    return
  }
  if (!node.properties) node.properties = {}
  node.properties[name] = value
}

function hasDimension(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'object' && value !== null) {
    return (value as { type?: unknown }).type === 'mdxJsxAttributeValueExpression'
  }
  return false
}

function walk(node: Node, visit: (node: Node) => void) {
  visit(node)
  node.children?.forEach((child) => walk(child, visit))
}
