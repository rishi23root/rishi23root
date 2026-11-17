/**
 * Classic `node:module` `register()` hooks so `@excalidraw/excalidraw`
 * can be imported from Node 20 and Node 26.
 *
 * The package imports `open-color/open-color.json` without an import
 * attribute, which Node rejects, and it imports CSS, which Node cannot load.
 * It also imports extensionless paths such as `roughjs/bin/rough`, and named
 * exports from CommonJS packages that only publish a real ESM build on the
 * non-standard `module` field (Node ignores that field).
 * Runs only inside the diagram bake process.
 */
import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HAS_EXT = /\.(?:js|mjs|cjs|json|css|node|wasm)$/

/** Bare package name, or null for relative, absolute, and subpath imports. */
function barePackageName(specifier) {
  if (!specifier || /^(?:\.|\/|\\|[a-z]+:)/i.test(specifier)) return null
  const parts = specifier.split('/')
  const name = specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
  return specifier === name ? name : null
}

/**
 * Node resolves packages with no `exports` map through `main`, which is often
 * CommonJS that its named-export detector cannot see. Bundlers follow `module`.
 * Only packages whose CJS build hides named exports get this treatment; a blanket
 * redirect pulls ESM builds that use directory imports Node cannot load.
 */
const MODULE_FIELD_PACKAGES = new Set(['@excalidraw/laser-pointer'])

function moduleFieldResolution(specifier, context) {
  const name = barePackageName(specifier)
  if (!name || !MODULE_FIELD_PACKAGES.has(name) || !context.parentURL) return null
  let pkgPath
  try {
    pkgPath = createRequire(context.parentURL).resolve(`${name}/package.json`)
  } catch {
    return null
  }
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  if (!pkg.module || pkg.exports) return null
  const esmPath = path.resolve(path.dirname(pkgPath), pkg.module)
  if (!existsSync(esmPath)) return null
  return { url: pathToFileURL(esmPath).href, shortCircuit: true, format: 'module' }
}

export async function resolve(specifier, context, nextResolve) {
  const viaModuleField = moduleFieldResolution(specifier, context)
  if (viaModuleField) return viaModuleField
  try {
    return await nextResolve(specifier, context)
  } catch (err) {
    if (err?.code !== 'ERR_MODULE_NOT_FOUND' || HAS_EXT.test(specifier)) throw err
    return nextResolve(`${specifier}.js`, context)
  }
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.json')) {
    const text = readFileSync(fileURLToPath(url), 'utf8')
    return { format: 'module', source: 'export default ' + text, shortCircuit: true }
  }
  if (url.endsWith('.css')) {
    return { format: 'module', source: 'export default {}', shortCircuit: true }
  }
  return nextLoad(url, context)
}
