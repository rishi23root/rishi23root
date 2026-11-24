import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DESKTOP_MQ } from '../src/components/moods/media.ts'

export function homeModulepreload() {
  return {
    name: 'home-modulepreload',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const outputDir = fileURLToPath(dir)
        const htmlPath = join(outputDir, 'index.html')
        let html = await readFile(htmlPath, 'utf8')
        const componentUrl = html.match(/component-url="([^"]*HeroMoodShell[^"]*)"/)?.[1]
        if (!componentUrl) throw new Error('Could not find the home HeroMoodShell bundle in index.html')

        const componentPath = resolve(outputDir, componentUrl.replace(/^\/+/, ''))
        const component = await readFile(componentPath, 'utf8')
        const imports = [...component.matchAll(/\bfrom["']([^"']+\.js)["']/g)]
          .map((match) => match[1])
          .filter((specifier) => specifier.startsWith('./'))
        const reactImport = imports.find((specifier) => /\/react\.[^/]+\.js$/.test(specifier))
        if (!reactImport) throw new Error('Could not find the React chunk imported by HeroMoodShell')

        const reactUrl = new URL(reactImport, `https://build.invalid${componentUrl}`).pathname
        // Astro requests renderer-url with component-url during hydration; preload the late component and React hop.
        const urls = [componentUrl, reactUrl]
        const script = `<script>(()=>{if(!matchMedia(${JSON.stringify(DESKTOP_MQ)}).matches)return;for(const href of ${JSON.stringify(urls)}){const link=document.createElement('link');link.rel='modulepreload';link.href=href;document.head.append(link)}})()</script>`
        if (!html.includes('<head>')) throw new Error('Could not find <head> in the built home page')
        html = html.replace('<head>', `<head>${script}`)
        await writeFile(htmlPath, html)
      },
    },
  }
}
