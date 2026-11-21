/**
 * Writing post interactivity: body-image load fade, reading-progress / back-to-top
 * button, SVG table-of-contents rail with spring-animated active mark, smooth
 * heading navigation, and share / copy-link action.
 */

type TocMetrics = {
  line: number
  curveR: number
  curveH: number
  space4: number
  subDurOpen: number
  subDurClose: number
  subDelayClose: number
}

type RailOpenKind = {
  closing: boolean
  switching: boolean
}

type TocRailController = {
  markCurrent: (link: HTMLAnchorElement | null) => void
  onRailOpen: (kind: RailOpenKind) => void
  rebuild: (frameTime?: number) => void
}

type SpringState = {
  x: number
  v: number
}

type TocRange = {
  link: HTMLAnchorElement
  start: number
  end: number
}

type TocItemNodes = {
  a: HTMLAnchorElement
  sub: HTMLElement | null
  h3s: HTMLAnchorElement[]
}

const SIMPLE_CALC_RE = /^\s*[+-]?[\d.]+(?:px|rem)(\s+[+-]\s+[\d.]+(?:px|rem))*\s*$/i
const CALC_TERM_RE = /([+-]?)\s*([\d.]+)(px|rem)/gi

function parseCssTime(raw: string, fallback: number): number {
  const trimmed = raw.trim()
  const n = parseFloat(trimmed)
  if (!trimmed || !Number.isFinite(n)) return fallback
  if (/ms$/i.test(trimmed)) return n
  if (/s$/i.test(trimmed)) return n * 1000
  return n
}

function parseCssPx(raw: string, rootPx: number, probeHost: HTMLElement): number {
  const trimmed = raw.trim()
  if (!trimmed || trimmed === '0') return 0
  if (/^-?[\d.]+px$/i.test(trimmed)) return parseFloat(trimmed)
  if (/^-?[\d.]+rem$/i.test(trimmed)) return parseFloat(trimmed) * rootPx
  const calcMatch = trimmed.match(/^calc\(([^()]+)\)$/i)
  if (calcMatch && SIMPLE_CALC_RE.test(calcMatch[1])) {
    let sum = 0
    for (const match of calcMatch[1].matchAll(CALC_TERM_RE)) {
      const sign = match[1] === '-' ? -1 : 1
      const value = parseFloat(match[2])
      const unit = match[3].toLowerCase()
      sum += sign * (unit === 'rem' ? value * rootPx : value)
    }
    return sum
  }
  // Fallback for arbitrary CSS length expressions, mounted outside the ResizeObserver-watched toc.
  const tmp = document.createElement('div')
  tmp.style.cssText =
    'position:absolute;visibility:hidden;pointer-events:none;box-sizing:content-box;margin:0;padding:0;border:0;width:' +
    trimmed
  probeHost.appendChild(tmp)
  const px = tmp.getBoundingClientRect().width
  tmp.remove()
  return px
}

function readTocMetrics(toc: HTMLElement): TocMetrics {
  const cs = getComputedStyle(toc)
  const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const probeHost = toc.parentElement && toc.parentElement !== toc ? toc.parentElement : document.body
  return {
    line: parseCssPx(cs.getPropertyValue('--toc-line'), rootPx, probeHost) || 1,
    curveR: parseCssPx(cs.getPropertyValue('--toc-curve-r'), rootPx, probeHost) || 8,
    curveH: parseCssPx(cs.getPropertyValue('--toc-curve-h'), rootPx, probeHost) || 13,
    space4: parseCssPx(cs.getPropertyValue('--space-4'), rootPx, probeHost) || 16,
    subDurOpen: parseCssTime(cs.getPropertyValue('--toc-sub-dur-open'), 520),
    subDurClose: parseCssTime(cs.getPropertyValue('--toc-sub-dur-close'), 620),
    subDelayClose: parseCssTime(cs.getPropertyValue('--toc-sub-delay-close'), 120),
  }
}

function snap(v: number, line: number, dpr: number): number {
  if (Math.round(line * dpr) % 2 === 1) {
    return (Math.round(v * dpr - 0.5) + 0.5) / dpr
  }
  return Math.round(v * dpr) / dpr
}

function fmt(v: number): number {
  return Math.round(v * 100) / 100
}

class PathPen {
  d = ''
  len = 0
  x = 0
  y = 0

  move(x: number, y: number) {
    this.d += `M${fmt(x)} ${fmt(y)}`
    this.x = x
    this.y = y
  }

  line(x: number, y: number) {
    const dx = x - this.x
    const dy = y - this.y
    const l = Math.hypot(dx, dy)
    if (l < 0.01) return
    this.d += `L${fmt(x)} ${fmt(y)}`
    this.len += l
    this.x = x
    this.y = y
  }

  cubic(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number) {
    const x0 = this.x
    const y0 = this.y
    const n = 16
    let len = 0
    let px = x0
    let py = y0
    for (let i = 1; i <= n; i++) {
      const tt = i / n
      const u = 1 - tt
      const bx = u * u * u * x0 + 3 * u * u * tt * c1x + 3 * u * tt * tt * c2x + tt * tt * tt * x
      const by = u * u * u * y0 + 3 * u * u * tt * c1y + 3 * u * tt * tt * c2y + tt * tt * tt * y
      len += Math.hypot(bx - px, by - py)
      px = bx
      py = by
    }
    this.d += `C${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(x)} ${fmt(y)}`
    this.len += len
    this.x = x
    this.y = y
  }

  gotoSpine(xs: number, y: number) {
    if (!this.d) this.move(xs, y)
    else this.line(xs, y)
  }
}

function blurIfFocused(el: HTMLElement) {
  const active = document.activeElement
  if (active instanceof HTMLElement && el.contains(active)) {
    active.blur()
  }
}

function initPostPage(root: HTMLElement) {
  // Fade each body image in once it has decoded. Cover images stay visible
  // immediately so the LCP element is never delayed by JS. Already-complete
  // (cached or broken) images get .is-loaded right away with no orphan listeners.
  root.querySelectorAll<HTMLImageElement>('.post-body img').forEach((img) => {
    if (img.complete) {
      img.classList.add('is-loaded')
      return
    }
    const show = () => {
      img.classList.add('is-loaded')
      img.removeEventListener('load', show)
      img.removeEventListener('error', show)
    }
    img.addEventListener('load', show, { once: true })
    img.addEventListener('error', show, { once: true })
  })

  const btn = document.getElementById('postProgress') as HTMLButtonElement | null
  const bar = btn?.querySelector<SVGCircleElement>('.post-progress-bar') ?? null
  const pct = btn?.querySelector<HTMLElement>('.post-progress-pct') ?? null
  const ring = 2 * Math.PI * 14 // circumference; r=14 in the SVG
  if (bar) bar.style.strokeDasharray = String(ring)

  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-toc]'))
  const tocEntries = links
    .map((link) => {
      const id = link.getAttribute('data-toc')
      const heading = id ? document.getElementById(id) : null
      return heading ? { link, heading } : null
    })
    .filter((entry): entry is { link: HTMLAnchorElement; heading: HTMLElement } => entry !== null)

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const toc = document.querySelector<HTMLElement>('.post-toc')
  const subs = Array.from(document.querySelectorAll<HTMLElement>('[data-toc-sub]'))

  let metrics: TocMetrics | null = toc ? readTocMetrics(toc) : null

  function isTocVisible(): boolean {
    return Boolean(toc && toc.offsetParent !== null)
  }

  // Each link's group: an H3's nested list, or the list an H2 owns.
  function groupOf(a: HTMLAnchorElement | null): HTMLElement | null {
    if (!a) return null
    return (
      a.closest<HTMLElement>('[data-toc-sub]') ||
      (a.parentElement ? a.parentElement.querySelector<HTMLElement>(':scope > [data-toc-sub]') : null)
    )
  }

  // Traveling rail mark: one SVG path for the quiet track, a second
  // stroke on the same path whose dash start/length spring between
  // the active item's range so the highlight slides around the bends.
  function initTocRail(tocEl: HTMLElement): TocRailController | null {
    const svg = tocEl.querySelector<SVGSVGElement>('.toc-rail-svg')
    const track = tocEl.querySelector<SVGPathElement>('.toc-rail-track')
    const mark = tocEl.querySelector<SVGPathElement>('.toc-rail-mark')
    if (!svg || !track || !mark) return null

    const tocItems: TocItemNodes[] = []
    tocEl.querySelectorAll<HTMLLIElement>(':scope > ul > li.toc-depth-2').forEach((li) => {
      const a = li.querySelector<HTMLAnchorElement>(':scope > a')
      if (!a) return
      const sub = li.querySelector<HTMLElement>(':scope > [data-toc-sub]')
      const h3s = sub
        ? Array.from(sub.querySelectorAll<HTMLAnchorElement>(':scope > ul > li.toc-depth-3 > a'))
        : []
      tocItems.push({ a, sub, h3s })
    })

    const K = 170
    const C = 20
    const fromS: SpringState = { x: 0, v: 0 }
    const toS: SpringState = { x: 0, v: 0 }
    let targetFrom = 0
    let targetTo = 0
    let totalLen = 0
    let ranges: TocRange[] = []
    let currentLink: HTMLAnchorElement | null = null
    let running = false
    let lastT = 0
    let layoutUntil = 0
    let roPending = false
    let lastRebuildFrame = -1
    let lastW = -1
    let lastH = -1
    let lastPathD = ''

    function applyDash() {
      const a = fromS.x
      const b = toS.x
      const start = Math.min(a, b)
      const len = Math.abs(b - a)
      const gap = Math.max(totalLen * 2, 1)
      mark!.setAttribute('stroke-dasharray', `${fmt(len)} ${fmt(gap)}`)
      mark!.setAttribute('stroke-dashoffset', String(-fmt(start)))
    }

    function snapDash() {
      fromS.x = targetFrom
      fromS.v = 0
      toS.x = targetTo
      toS.v = 0
      applyDash()
    }

    function settled(s: SpringState, target: number): boolean {
      return Math.abs(s.x - target) < 0.2 && Math.abs(s.v) < 2
    }

    function stepSpring(s: SpringState, target: number, dt: number) {
      const clampedDt = dt > 0.064 ? 0.064 : dt
      const acc = K * (target - s.x) - C * s.v
      s.v += acc * clampedDt
      s.x += s.v * clampedDt
    }

    function tick(now: number) {
      if (!isTocVisible()) {
        running = false
        return
      }
      if (now < layoutUntil) rebuild(now)
      const dt = lastT ? (now - lastT) / 1000 : 1 / 60
      lastT = now
      if (motion.matches) {
        snapDash()
        running = false
        return
      }
      stepSpring(fromS, targetFrom, dt)
      stepSpring(toS, targetTo, dt)
      applyDash()
      const done = settled(fromS, targetFrom) && settled(toS, targetTo)
      if (done && now >= layoutUntil) {
        snapDash()
        running = false
        return
      }
      requestAnimationFrame(tick)
    }

    function startLoop() {
      if (running || !isTocVisible()) return
      running = true
      lastT = 0
      requestAnimationFrame(tick)
    }

    function setTargets(instant: boolean) {
      let range: TocRange | null = null
      if (currentLink) {
        for (let i = 0; i < ranges.length; i++) {
          if (ranges[i].link === currentLink) {
            range = ranges[i]
            break
          }
        }
      }
      if (range) {
        targetFrom = range.start
        targetTo = range.end
      } else {
        const mid = (fromS.x + toS.x) / 2
        targetFrom = mid
        targetTo = mid
      }
      if (instant || motion.matches || (!range && totalLen === 0)) {
        snapDash()
        return
      }
      startLoop()
    }

    function rebuild(frameTime?: number) {
      if (!isTocVisible()) return
      if (frameTime !== undefined && frameTime === lastRebuildFrame) return
      lastRebuildFrame = frameTime ?? -1

      // Phase 1: Batch all DOM reads before any SVG or DOM writes.
      const origin = tocEl.getBoundingClientRect()
      const w = tocEl.clientWidth
      const h = tocEl.clientHeight
      if (w === 0 && h === 0) return
      const dpr = window.devicePixelRatio || 1

      const measured: Array<{
        a: HTMLAnchorElement
        aRect: DOMRect
        subRect: DOMRect | null
        h3Rects: Array<{ link: HTMLAnchorElement; rect: DOMRect }>
      }> = []

      for (const item of tocItems) {
        const aRect = item.a.getBoundingClientRect()
        let subRect: DOMRect | null = null
        let h3Rects: Array<{ link: HTMLAnchorElement; rect: DOMRect }> = []
        if (item.sub) {
          subRect = item.sub.getBoundingClientRect()
          if (subRect.bottom - subRect.top >= 0.75) {
            h3Rects = item.h3s.map((link) => ({
              link,
              rect: link.getBoundingClientRect(),
            }))
          }
        }
        measured.push({ a: item.a, aRect, subRect, h3Rects })
      }

      // Phase 2: Pure path geometry computation (zero DOM access).
      const m = metrics ?? (metrics = readTocMetrics(tocEl))
      const { line, curveR, curveH, space4 } = m

      let xs = snap(0, line, dpr)
      if (measured.length > 0) {
        xs = snap(measured[0].aRect.left - origin.left + line / 2, line, dpr)
      }
      const xi = snap(xs + space4 - line, line, dpr)

      const pen = new PathPen()
      ranges = []

      const addRange = (link: HTMLAnchorElement, start: number, end: number) => {
        ranges.push({ link, start, end: Math.max(start, end) })
      }

      for (const item of measured) {
        const yTop = item.aRect.top - origin.top
        const yBot = item.aRect.bottom - origin.top
        const start = pen.len
        pen.gotoSpine(xs, yTop)
        // If a sub is already diverting from yBot, the H2 segment
        // still owns the spine through the heading itself.
        pen.line(xs, yBot)
        addRange(item.a, start, pen.len)

        if (!item.subRect) continue
        const sTop = item.subRect.top - origin.top
        const sBot = item.subRect.bottom - origin.top
        const sH = sBot - sTop
        if (sH < 0.75) continue

        // The 8023011 CSS rail is a ╰╮ pair (two 8px quarters in a
        // ~15px-tall, 15px-wide box after a short ~5px ╰ drop). At
        // 1px that rasterizes as one tight hook — the thin-* curve.
        // Drawing those two quarters in SVG reads as "2 curved"; a
        // single cubic with the same endpoints keeps the thin shape.
        const minFull = 2 * (curveH + curveR)
        const scale = Math.min(1, sH / Math.max(minFull, 1))
        let r = curveR * scale
        let ch = curveH * scale
        if (sH < 2) {
          r = 0
          ch = sH / 2
        }
        const drop = Math.max(0, ch - r)
        const hookRise = Math.max(0, ch + r - line - drop)
        // 0.55 keeps the ends vertical longer, like the thin hook,
        // without a mid shelf that would read as two corners.
        const handle = hookRise * 0.55
        const openStart = pen.len
        if (sTop > pen.y + 0.5) {
          pen.line(xs, sTop)
        }
        const yOpen0 = sTop + drop
        const indentTop = yOpen0 + hookRise
        let indentBot = sBot - drop - hookRise
        if (indentBot < indentTop) indentBot = indentTop
        // First H3 owns the opening curve.
        if (yOpen0 > pen.y + 0.25) pen.line(xs, yOpen0)
        if (hookRise > 0.25) {
          pen.cubic(xs, yOpen0 + handle, xi, indentTop - handle, xi, indentTop)
        } else if (indentTop > pen.y + 0.25) {
          pen.line(xi, indentTop)
        }

        // Map each H3 to a slice of the indent, clamped to the
        // visible window so a mid-close still has a shrinking path.
        const slots = item.h3Rects.map(({ link, rect }) => ({
          link,
          top: Math.max(indentTop, Math.min(indentBot, rect.top - origin.top)),
          bot: Math.max(indentTop, Math.min(indentBot, rect.bottom - origin.top)),
        }))
        if (slots.length) {
          slots[0].top = indentTop
          slots[slots.length - 1].bot = indentBot
        }
        let lastRangeAt = -1
        for (let j = 0; j < slots.length; j++) {
          const slotStart = j === 0 ? openStart : pen.len
          if (slots[j].bot > pen.y + 0.25) pen.line(xi, slots[j].bot)
          addRange(slots[j].link, slotStart, pen.len)
          lastRangeAt = ranges.length - 1
        }
        if (!slots.length && indentBot > pen.y + 0.25) {
          pen.line(xi, indentBot)
        }
        // Closing curve is a quiet return to the next H2 spine, like
        // the old ╭. The last H3's mark also covers this hook so it
        // has a full-height active stroke (the indent alone is only
        // a sliver — the hook lives in the last item's box).
        const yClose1 = sBot - drop
        if (hookRise > 0.25 && yClose1 > indentBot + 0.25) {
          pen.cubic(xi, indentBot + handle, xs, yClose1 - handle, xs, yClose1)
        }
        if (sBot > pen.y + 0.25) pen.line(xs, sBot)
        if (lastRangeAt >= 0) {
          ranges[lastRangeAt].end = Math.max(ranges[lastRangeAt].end, pen.len)
        }
      }

      // Phase 3: Batch all SVG & DOM writes after reads finish.
      if (w !== lastW || h !== lastH) {
        lastW = w
        lastH = h
        svg!.setAttribute('width', String(w))
        svg!.setAttribute('height', String(h))
        svg!.setAttribute('viewBox', `0 0 ${w} ${h}`)
      }
      if (pen.d !== lastPathD) {
        lastPathD = pen.d
        track!.setAttribute('d', pen.d)
        mark!.setAttribute('d', pen.d)
      }
      totalLen = pen.len
      tocEl.classList.add('is-rail-svg')
      setTargets(false)
    }

    function markCurrent(link: HTMLAnchorElement | null) {
      currentLink = link
      if (!isTocVisible()) return
      setTargets(false)
    }

    function onRailOpen(kind: RailOpenKind) {
      if (!isTocVisible()) return
      let wait = 0
      if (!motion.matches) {
        const m = metrics ?? (metrics = readTocMetrics(tocEl))
        if (kind.closing) wait = m.subDurClose
        else if (kind.switching) wait = Math.max(m.subDurOpen, m.subDurClose)
        else wait = m.subDurOpen
        wait += 48
      }
      layoutUntil = performance.now() + wait
      rebuild()
      startLoop()
    }

    const ro = new ResizeObserver(() => {
      if (roPending || !isTocVisible()) return
      roPending = true
      requestAnimationFrame((now) => {
        roPending = false
        rebuild(now)
      })
    })
    ro.observe(tocEl)
    subs.forEach((s) => {
      ro.observe(s)
    })

    if (motion.addEventListener) {
      motion.addEventListener('change', () => {
        if (!isTocVisible()) return
        rebuild()
        setTargets(true)
      })
    }

    if (isTocVisible()) {
      rebuild()
      setTargets(true)
    }

    return { markCurrent, onRailOpen, rebuild }
  }

  let openSub: HTMLElement | null = null
  let closeTimer = 0

  function applyOpen(sub: HTMLElement | null) {
    if (sub === openSub) return
    const prev = openSub
    openSub = sub
    subs.forEach((s) => {
      const on = s === sub
      s.classList.toggle('is-open', on)
      s.inert = !on
    })
    rail?.onRailOpen({ closing: !sub && Boolean(prev), switching: Boolean(sub && prev) })
  }

  function clearCloseTimer() {
    if (closeTimer) {
      window.clearTimeout(closeTimer)
      closeTimer = 0
    }
  }

  function setOpen(sub: HTMLElement | null) {
    if (sub === openSub) {
      clearCloseTimer()
      return
    }
    // A close is already scheduled and we still want no sub:
    // don't restart the delay on every scroll tick.
    if (!sub && closeTimer) return
    clearCloseTimer()
    // Delay collapse only when leaving a sub for no sub, so a
    // quick scroll-through doesn't flicker. Switching sections
    // or opening starts immediately; reduced motion snaps.
    if (!sub && openSub && !motion.matches) {
      const delay = metrics?.subDelayClose ?? 120
      closeTimer = window.setTimeout(() => {
        closeTimer = 0
        applyOpen(null)
      }, delay)
      return
    }
    applyOpen(sub)
  }

  // Collapse only once JS can reopen them; without JS every H3 stays listed.
  if (toc && subs.length) {
    subs.forEach((s) => {
      s.inert = true
    })
    toc.classList.add('is-collapsible')
  }

  let pinned: HTMLAnchorElement | null = null // link chosen by a rail click, held while its heading is still on screen
  let pinnedY = 0
  let animating = false
  let progressShowRaf = 0
  let progressVisible = false
  let lastProgress = -1
  let lastCurrent: HTMLAnchorElement | null | undefined = undefined

  // Keep the control in flow so Share / All writing / Home never reflow.
  // Only opacity/transform fade; inert via aria-hidden + tabindex + CSS
  // pointer-events. Instant when reduce-motion.
  function setProgressVisible(show: boolean) {
    if (!btn) return
    if (show === progressVisible) return
    progressVisible = show
    if (progressShowRaf) {
      cancelAnimationFrame(progressShowRaf)
      progressShowRaf = 0
    }
    if (show) {
      btn.removeAttribute('aria-hidden')
      btn.removeAttribute('tabindex')
      if (motion.matches) {
        btn.classList.add('is-visible')
        return
      }
      btn.classList.remove('is-visible')
      progressShowRaf = requestAnimationFrame(() => {
        progressShowRaf = requestAnimationFrame(() => {
          progressShowRaf = 0
          btn.classList.add('is-visible')
        })
      })
      return
    }
    // Never leave focus on an aria-hidden="true" element.
    blurIfFocused(btn)
    btn.classList.remove('is-visible')
    btn.setAttribute('aria-hidden', 'true')
    btn.setAttribute('tabindex', '-1')
  }

  function setCurrent(current: HTMLAnchorElement | null) {
    if (current === lastCurrent) return
    lastCurrent = current
    for (const a of links) {
      if (a === current) a.setAttribute('aria-current', 'location')
      else a.removeAttribute('aria-current')
    }
    setOpen(groupOf(current))
    rail?.markCurrent(current)
  }

  function sync() {
    // Phase 1: DOM reads.
    const scrollY = window.scrollY
    const vh = window.innerHeight
    const r = root.getBoundingClientRect()
    const top = scrollY + r.top
    const start = top - 96
    const end = top + root.offsetHeight - vh * 0.4
    let p = Math.min(100, Math.max(0, Math.round(((scrollY - start) / Math.max(1, end - start)) * 100)))
    // At the absolute top of the page, always treat progress as 0%.
    if (scrollY < 8) p = 0

    const tocVisible = isTocVisible()
    let shouldUpdateToc = false
    let current: HTMLAnchorElement | null = null
    if (!animating && tocVisible && tocEntries.length > 0) {
      shouldUpdateToc = true
      if (pinned && Math.abs(scrollY - pinnedY) < 4) {
        current = pinned
      } else {
        pinned = null
        const marker = vh * 0.28
        for (const entry of tocEntries) {
          if (entry.heading.getBoundingClientRect().top <= marker) {
            current = entry.link
          }
        }
      }
    } else if (!tocVisible) {
      pinned = null
    }

    // Phase 2: DOM writes (skipped when unchanged).
    if (p !== lastProgress) {
      lastProgress = p
      if (bar) bar.style.strokeDashoffset = String(ring * (1 - p / 100))
      if (pct) pct.textContent = `${p}%`
      // Hide the whole control at the top (0%); only show once the reader has scrolled.
      if (btn) {
        setProgressVisible(p > 0)
        btn.setAttribute('aria-label', `Reading progress ${p} percent. Back to top.`)
      }
    }

    if (shouldUpdateToc) {
      setCurrent(current)
    }
  }

  const rail = toc ? initTocRail(toc) : null

  let syncRaf = 0
  function scheduleSync() {
    if (syncRaf) return
    syncRaf = requestAnimationFrame(() => {
      syncRaf = 0
      sync()
    })
  }

  let resizeRaf = 0
  function scheduleResize() {
    if (resizeRaf) return
    resizeRaf = requestAnimationFrame((now) => {
      resizeRaf = 0
      if (toc) {
        metrics = readTocMetrics(toc)
        rail?.rebuild(now)
      }
      sync()
    })
  }

  sync()
  window.addEventListener('scroll', scheduleSync, { passive: true })
  window.addEventListener('resize', scheduleResize, { passive: true })

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      if (toc) {
        metrics = readTocMetrics(toc)
        rail?.rebuild()
      }
      sync()
    })
  }

  if (btn) {
    btn.addEventListener('click', () => {
      blurIfFocused(btn)
      window.scrollTo({ top: 0, behavior: motion.matches ? 'auto' : 'smooth' })
    })
  }

  // Rail clicks: eased scroll to the heading (instant with reduced motion).
  // The clicked item is marked current up front so the rail doesn't flicker
  // through every section on the way.
  let raf = 0
  function ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }
  function stop() {
    if (!animating) return
    cancelAnimationFrame(raf)
    animating = false
    pinned = null
    sync()
  }
  ;(['wheel', 'touchstart', 'keydown', 'mousedown'] as const).forEach((type) => {
    window.addEventListener(type, stop, { passive: true })
  })

  function scrollToHeading(a: HTMLAnchorElement, el: HTMLElement) {
    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
    const max = document.documentElement.scrollHeight - window.innerHeight
    const to = Math.max(0, Math.min(max, Math.round(window.scrollY + el.getBoundingClientRect().top - margin)))
    const from = window.scrollY
    const done = () => {
      animating = false
      pinned = a
      pinnedY = window.scrollY
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
      el.focus({ preventScroll: true })
    }
    cancelAnimationFrame(raf)
    setCurrent(a)
    const dist = Math.abs(to - from)
    if (motion.matches || dist < 2) {
      window.scrollTo(0, to)
      done()
      return
    }
    const dur = Math.min(800, 480 + dist * 0.08)
    let t0 = 0
    animating = true
    const step = (now: number) => {
      if (!t0) t0 = now
      const t = Math.min(1, (now - t0) / dur)
      window.scrollTo(0, from + (to - from) * ease(t))
      if (t < 1) raf = requestAnimationFrame(step)
      else done()
    }
    raf = requestAnimationFrame(step)
  }

  links.forEach((a) => {
    a.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const id = a.getAttribute('data-toc')
      const el = id ? document.getElementById(id) : null
      if (!el) return
      e.preventDefault()
      history.replaceState(history.state, '', `#${id}`)
      scrollToHeading(a, el)
    })
  })

  const share = document.getElementById('postShare')
  if (share) {
    const lbl = document.getElementById('postShareLabel')
    const status = document.getElementById('postShareStatus')
    let shareTimer = 0
    let shareStatusRaf = 0

    share.addEventListener('click', () => {
      const data = { title: document.title, url: location.href }
      if (navigator.share) {
        navigator.share(data).catch(() => {})
        return
      }
      if (!navigator.clipboard) return
      navigator.clipboard.writeText(location.href).then(
        () => {
          if (shareTimer) window.clearTimeout(shareTimer)
          if (shareStatusRaf) {
            cancelAnimationFrame(shareStatusRaf)
            shareStatusRaf = 0
          }
          share.classList.add('is-open')
          if (lbl) lbl.textContent = 'Link copied'
          if (status) {
            if (status.textContent === 'Link copied') {
              status.textContent = ''
              shareStatusRaf = requestAnimationFrame(() => {
                shareStatusRaf = 0
                status.textContent = 'Link copied'
              })
            } else {
              status.textContent = 'Link copied'
            }
          }
          shareTimer = window.setTimeout(() => {
            shareTimer = 0
            if (shareStatusRaf) {
              cancelAnimationFrame(shareStatusRaf)
              shareStatusRaf = 0
            }
            share.classList.remove('is-open')
            if (lbl) lbl.textContent = 'Share'
            if (status) status.textContent = ''
          }, 1800)
        },
        () => {},
      )
    })
  }
}

const root = document.querySelector<HTMLElement>('[data-longform]')
if (root) {
  initPostPage(root)
}
