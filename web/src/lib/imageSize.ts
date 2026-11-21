import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, join, normalize, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export type ImageSize = { width: number; height: number }

function findDir(dirName: string): string | undefined {
  // `astro build` bundles pages under `dist/`, so a URL relative to
  // `import.meta.url` no longer points at `web/`. Mirror ExcalidrawBoard's
  // candidate resolution so both dev and bundled builds resolve `web/public`.
  const candidates = [
    resolve(process.cwd(), dirName),
    resolve(process.cwd(), 'web', dirName),
    fileURLToPath(new URL(`../../${dirName}`, import.meta.url)),
  ]
  return candidates.find((dir) => existsSync(dir))
}

function resolveInside(baseDir: string, rel: string): string | undefined {
  const file = normalize(join(baseDir, rel))
  const inside = relative(baseDir, file)
  if (!inside || inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside)) return
  if (!existsSync(file)) return
  return file
}

/**
 * Width/height for a root-relative file under web/public, so post images
 * can reserve their box before the bytes arrive. Remote URLs are skipped.
 */
export function publicImageSize(src: string | undefined | null): ImageSize | undefined {
  if (!src) return
  const raw = src.trim()
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('://')) return
  let rel: string
  try {
    rel = decodeURIComponent(raw.split(/[?#]/, 1)[0] ?? '')
  } catch {
    return
  }
  if (!rel || rel === '/') return

  const publicDir = findDir('public')
  let file = publicDir ? resolveInside(publicDir, rel) : undefined
  if (!file && process.env.NODE_ENV !== 'production') {
    const draftDir = findDir('draft-assets')
    if (draftDir) file = resolveInside(draftDir, rel)
  }
  if (!file) return

  try {
    const size = sniff(readFileSync(file))
    return size && size.width > 0 && size.height > 0 ? size : undefined
  } catch {
    return
  }
}

function sniff(buf: Buffer): ImageSize | undefined {
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
  }
  if (buf.length >= 10 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) }
  }
  if (buf.length >= 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return webp(buf)
  }
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    return jpeg(buf)
  }
  return
}

function webp(buf: Buffer): ImageSize | undefined {
  const kind = buf.toString('ascii', 12, 16)
  if (kind === 'VP8X' && buf.length >= 30) {
    const width = (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1
    const height = (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1
    return { width, height }
  }
  // VP8 payload: 3-byte frame tag, then 0x9d 0x01 0x2a, then 14-bit size.
  if (kind === 'VP8 ' && buf.length >= 30 && buf[23] === 0x9d && buf[24] === 0x01 && buf[25] === 0x2a) {
    return {
      width: buf[26] | ((buf[27] & 0x3f) << 8),
      height: buf[28] | ((buf[29] & 0x3f) << 8),
    }
  }
  if (kind === 'VP8L' && buf.length >= 25 && buf[20] === 0x2f) {
    const bits = buf[21] | (buf[22] << 8) | (buf[23] << 16) | (buf[24] << 24)
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  return
}

function jpeg(buf: Buffer): ImageSize | undefined {
  let i = 2
  while (i < buf.length) {
    if (buf[i] !== 0xff) return
    while (i < buf.length && buf[i] === 0xff) i++
    if (i >= buf.length) return
    const marker = buf[i]
    i++
    if (marker === 0xd8 || marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue
    }
    if (marker === 0xd9 || marker === 0xda) return
    if (i + 2 > buf.length) return
    const len = buf.readUInt16BE(i)
    if (len < 2 || i + len > buf.length) return
    const sof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    if (sof) {
      if (len < 7 || i + 7 > buf.length) return
      return { height: buf.readUInt16BE(i + 3), width: buf.readUInt16BE(i + 5) }
    }
    i += len
  }
  return
}
