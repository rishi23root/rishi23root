/**
 * Dev-only middleware serving `web/draft-assets/` (e.g. `draft-template` test
 * images) without putting draft assets inside `web/public/`, so they never ship
 * in production `web/dist/`.
 */
import { createReadStream, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const draftAssetsDir = fileURLToPath(new URL('../draft-assets', import.meta.url))

const MIME_TYPES = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
}

export function draftAssets() {
  return {
    name: 'draft-assets-dev',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use((req, res, next) => {
          if ((req.method !== 'GET' && req.method !== 'HEAD') || !req.url) return next()
          let pathname
          try {
            pathname = decodeURIComponent(req.url.split(/[?#]/, 1)[0] ?? '')
          } catch {
            return next()
          }
          if (!pathname.startsWith('/') || pathname === '/') return next()

          const file = path.normalize(path.join(draftAssetsDir, pathname))
          const inside = path.relative(draftAssetsDir, file)
          if (!inside || inside === '..' || inside.startsWith(`..${path.sep}`) || path.isAbsolute(inside)) {
            return next()
          }

          let stat
          try {
            stat = statSync(file)
          } catch {
            return next()
          }
          if (!stat.isFile()) return next()

          const mime = MIME_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
          res.statusCode = 200
          res.setHeader('Content-Type', mime)
          res.setHeader('Content-Length', stat.size)
          if (req.method === 'HEAD') {
            res.end()
            return
          }
          createReadStream(file).pipe(res)
        })
      },
    },
  }
}
