/**
 * Bake diagram SVGs before `astro dev` and `astro build` render pages.
 * The bake runs in its own process so the JSON/CSS load hook never applies
 * to Astro's own module loads.
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('./bake-diagrams.mjs', import.meta.url))

function bakeDiagrams() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], { stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Excalidraw diagram bake failed (exit ${code ?? 'signal'})`))
    })
  })
}

export function excalidrawBake() {
  return {
    name: 'excalidraw-bake',
    hooks: {
      'astro:config:setup': async ({ command }) => {
        if (command !== 'dev' && command !== 'build') return
        await bakeDiagrams()
      },
    },
  }
}
