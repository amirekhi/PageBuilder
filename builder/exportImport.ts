import { NodeMap, PageNode, NodeType } from './types'
import {
  StyleProps, buildClassName, buildInlineStyle, buildOverlayStyle,
  buildSectionOuterStyle, buildSectionInnerStyle, setGlobalColorPalette,
} from './styleMapper'
import { compileCustomCss, compileHoverCss, wrapperClassFor } from './customCss'
import type { HoverStyleProps } from './customCss'
import { resolveStyleForBreakpoint, resolveAnimationForBreakpoint } from './responsive'
import { AnimationProps, EFFECT_KEYFRAME, STARTS_HIDDEN } from './animations'
import type { GlobalColor, GlobalTypographyStyle, SeoSettings } from './store'
import type { CSSProperties } from 'react'

// ─── LocalStorage ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'page-builder:autosave'

export interface SavedPage {
  nodes:   NodeMap
  rootId:  string
  savedAt: string
  version: 1 | 2
  // Added in version 2 — all optional so a version-1 save/JSON file (from
  // before global colors/typography/SEO existed) still imports fine; the
  // caller (TopBar.tsx) falls back to whatever the store already has for
  // any field that's missing. Genuinely needed, not just nice-to-have:
  // nodes can now store `global:<id>` color references (see
  // isGlobalColorRef in styleMapper.ts), so a save/export that omitted the
  // palette itself would silently break every bound color on reload.
  globalColors?:     GlobalColor[]
  globalTypography?: GlobalTypographyStyle[]
  globalCustomCss?:  string
  seo?:              SeoSettings
}

export interface SavedPageExtras {
  globalColors?:     GlobalColor[]
  globalTypography?: GlobalTypographyStyle[]
  globalCustomCss?:  string
  seo?:              SeoSettings
}

export function saveToLocalStorage(nodes: NodeMap, rootId: string, extra: SavedPageExtras = {}): boolean {
  if (typeof window === 'undefined') return false
  try {
    const payload: SavedPage = { nodes, rootId, savedAt: new Date().toISOString(), version: 2, ...extra }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    return true
  } catch { return false }
}

export function loadFromLocalStorage(): SavedPage | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedPage
    if (!parsed.nodes || !parsed.rootId) return null
    return parsed
  } catch { return null }
}

export function hasLocalStorageSave(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(STORAGE_KEY) !== null
}

export function clearLocalStorageSave(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}

// ─── JSON export / import ─────────────────────────────────────────────────────

export function downloadJSON(nodes: NodeMap, rootId: string, filename = 'page.json', extra: SavedPageExtras = {}): void {
  const payload: SavedPage = { nodes, rootId, savedAt: new Date().toISOString(), version: 2, ...extra }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  triggerDownload(blob, filename)
}

export interface ImportResult {
  success: boolean
  nodes?:  NodeMap
  rootId?: string
  globalColors?:     GlobalColor[]
  globalTypography?: GlobalTypographyStyle[]
  globalCustomCss?:  string
  seo?:              SeoSettings
  error?:  string
}

export function parseImportedJSON(text: string): ImportResult {
  try {
    const parsed = JSON.parse(text) as Partial<SavedPage>
    if (!parsed.nodes || typeof parsed.nodes !== 'object')
      return { success: false, error: 'File is missing a valid "nodes" object.' }
    if (!parsed.rootId || typeof parsed.rootId !== 'string')
      return { success: false, error: 'File is missing a valid "rootId".' }
    if (!parsed.nodes[parsed.rootId])
      return { success: false, error: 'rootId does not point to an existing node.' }
    return {
      success: true, nodes: parsed.nodes, rootId: parsed.rootId,
      globalColors: parsed.globalColors, globalTypography: parsed.globalTypography,
      globalCustomCss: parsed.globalCustomCss, seo: parsed.seo,
    }
  } catch {
    return { success: false, error: 'This file is not valid JSON.' }
  }
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsText(file)
  })
}

// ─── HTML export ──────────────────────────────────────────────────────────────
// Rewritten to REUSE the live style/animation pipeline instead of hand-
// duplicating it (which is exactly how this file drifted out of sync with
// Preview in the first place). Every color/spacing/typography/border/
// effect/visibility value is produced by the SAME buildInlineStyle /
// buildSectionOuterStyle / buildSectionInnerStyle functions styleMapper.ts
// already exports for the live editor — this file only adds the plumbing
// needed to turn "one resolved StyleProps object" into "real CSS a static
// file can render," three times per node (Desktop/Tablet/Mobile), instead
// of relying on React state to pick which one applies.
//
// STRATEGY: every node gets a stable class (wrapperClassFor(node.id), the
// same class Custom CSS / hover already use) with NO responsive-CSS
// properties applied as an inline style attribute — only real CSS rules:
//   .cc-<id> { ...desktop declarations... }
//   @media (max-width:768px) { .cc-<id> { ...tablet declarations... } }
//   @media (max-width:390px) { .cc-<id> { ...mobile declarations... } }
// Each media query carries the FULL resolved declaration set for that
// breakpoint (not a diff) — simpler and just as correct, since equal-
// specificity same-selector rules are resolved by source order, and mobile
// is emitted after tablet so it correctly wins at very narrow widths where
// both queries match. This also sidesteps the exact specificity problem
// hover's !important rules exist to solve (inline styles always beating
// classes) — since responsive values are never inline here, no !important
// is needed for them.
//
// buildClassName's literal Tailwind utility output (w-full, object-cover,
// italic, etc.) is the one thing still DESKTOP-only — reflecting the
// Desktop-resolved value at every width. These are a small, mostly
// cosmetic set (see styleMapper.ts's buildClassName), and giving them full
// responsive treatment would mean shipping literal `md:w-full` etc.
// Tailwind variants tuned to THIS app's own custom breakpoints (768/390)
// rather than Tailwind's defaults — a reasonable follow-up if it turns out
// to matter, flagged here rather than silently assumed.

function esc(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cls(...parts: (string | undefined | false)[]): string {
  return parts.filter(Boolean).join(' ').trim()
}

// CSS properties React lets you pass as a bare number WITHOUT appending
// 'px' (React's own unitless-property list, trimmed to whatever
// buildInlineStyle/buildSectionOuterStyle/buildSectionInnerStyle actually
// ever emit as numbers: opacity, fontWeight, lineHeight, flexGrow,
// flexShrink). Everything else numeric gets 'px' appended, matching what
// the browser would already be doing implicitly when React assigns these
// via the DOM style object — reactStyleToCssText below just makes that
// implicit behavior explicit real CSS text.
const UNITLESS_CSS_PROPS = new Set(['opacity', 'fontWeight', 'lineHeight', 'flexGrow', 'flexShrink', 'zIndex', 'order'])

function kebabCase(prop: string): string {
  return prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)
}

function reactStyleToCssText(style: CSSProperties): string {
  const decls: string[] = []
  for (const key in style) {
    const value = (style as Record<string, unknown>)[key]
    if (value === undefined || value === null || value === '') continue
    const cssKey = kebabCase(key)
    if (typeof value === 'number' && !UNITLESS_CSS_PROPS.has(key)) {
      decls.push(`${cssKey}:${value}px`)
    } else {
      decls.push(`${cssKey}:${value}`)
    }
  }
  return decls.join(';')
}

function emitResponsiveRule(selector: string, desktop: CSSProperties, tablet: CSSProperties, mobile: CSSProperties): string {
  const parts: string[] = []
  const d = reactStyleToCssText(desktop)
  if (d) parts.push(`${selector}{${d}}`)
  const t = reactStyleToCssText(tablet)
  if (t) parts.push(`@media (max-width:768px){${selector}{${t}}}`)
  const m = reactStyleToCssText(mobile)
  if (m) parts.push(`@media (max-width:390px){${selector}{${m}}}`)
  return parts.join('\n')
}

// ─── Animations ─────────────────────────────────────────────────────────────
// Per-breakpoint effect/duration/delay/easing, same resolveAnimationForBreakpoint
// responsive.ts already exports. `trigger`/`once` themselves are read from
// the DESKTOP resolution only — letting those two vary per breakpoint too
// would need meaningfully more runtime JS (separate observers per
// breakpoint, torn down/rebuilt on resize) for a case that's rare in
// practice (WHEN to play rarely differs by device; WHAT plays does). Noting
// this here rather than silently assuming it doesn't matter.
//
// Mechanism: a shared `pb-play` class, added by a small IntersectionObserver
// script (mirroring animations.ts's own useInView/useAnimationProps logic)
// or immediately on load for trigger:'onLoad'. CSS never plays anything on
// its own — `.cc-id.pb-play{...}` only matches once the script adds that
// class, exactly mirroring the live "shouldPlay" gate in useAnimationProps.

function buildAnimationCssForNode(nodeId: string, node: PageNode): string {
  const c = wrapperClassFor(nodeId)

  function ruleFor(a: AnimationProps): string {
    const effect = a.effect ?? 'none'
    if (effect === 'none') return ''
    const keyframe = EFFECT_KEYFRAME[effect]
    const duration = a.duration ?? 600
    const delay    = a.delay ?? 0
    const easing   = a.easing ?? 'ease-out'
    const hidden   = STARTS_HIDDEN.has(effect) ? `.${c}{opacity:0}` : ''
    const play     = `.${c}.pb-play{animation-name:${keyframe};animation-duration:${duration}ms;animation-delay:${delay}ms;animation-timing-function:${easing};animation-fill-mode:both}`
    return hidden + play
  }

  const d = ruleFor(resolveAnimationForBreakpoint(node, 'desktop'))
  const t = ruleFor(resolveAnimationForBreakpoint(node, 'tablet'))
  const m = ruleFor(resolveAnimationForBreakpoint(node, 'mobile'))

  const parts: string[] = []
  if (d) parts.push(d)
  if (t) parts.push(`@media (max-width:768px){${t}}`)
  if (m) parts.push(`@media (max-width:390px){${m}}`)
  return parts.join('\n')
}

function animAttrs(node: PageNode): string {
  const d = resolveAnimationForBreakpoint(node, 'desktop')
  const t = resolveAnimationForBreakpoint(node, 'tablet')
  const m = resolveAnimationForBreakpoint(node, 'mobile')
  const any = (d.effect ?? 'none') !== 'none' || (t.effect ?? 'none') !== 'none' || (m.effect ?? 'none') !== 'none'
  if (!any) return ''
  const trigger = d.trigger ?? 'onScroll'
  const once    = d.once ?? true
  return ` data-pb-animate="1" data-pb-trigger="${trigger}" data-pb-once="${once ? '1' : '0'}"`
}

const ANIMATE_SCRIPT = `<script>
(function(){
  var els = document.querySelectorAll('[data-pb-animate]');
  els.forEach(function(el){
    var trig = el.getAttribute('data-pb-trigger');
    var once = el.getAttribute('data-pb-once') === '1';
    if (trig === 'onLoad') { el.classList.add('pb-play'); return; }
    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) {
          entry.target.classList.add('pb-play');
          if (once) obs.unobserve(entry.target);
        } else if (!once) {
          entry.target.classList.remove('pb-play');
        }
      });
    }, { threshold: 0.15 });
    obs.observe(el);
  });
})();
</script>`

// ─── Per-node CSS (style + animation + hover + custom CSS) ────────────────

function collectStyleCss(nodes: NodeMap, rootId: string): string {
  const parts: string[] = []

  for (const id in nodes) {
    const node = nodes[id]
    const c = wrapperClassFor(id)

    if (node.type === 'section') {
      // Mirrors useRootAdjustedStyle in nodeComponents.tsx — the root
      // Section's own outer padding/gap is stripped (the page shell
      // already handles outer spacing), same rule at every breakpoint.
      const adjust = (s: StyleProps): StyleProps => id === rootId
        ? { ...s, px: undefined, py: undefined, pt: undefined, pb: undefined, pl: undefined, pr: undefined, gap: undefined }
        : s

      const dS = adjust(resolveStyleForBreakpoint(node, 'desktop'))
      const tS = adjust(resolveStyleForBreakpoint(node, 'tablet'))
      const mS = adjust(resolveStyleForBreakpoint(node, 'mobile'))

      // SectionPreview merges a minHeight:64 fallback on TOP of
      // buildSectionOuterStyle's own output — replicated here per
      // breakpoint, since minHeight itself can cascade too.
      const withMinHeight = (s: StyleProps): CSSProperties => ({
        ...buildSectionOuterStyle(s),
        minHeight: typeof s.minHeight === 'number' ? s.minHeight : 64,
      })
      parts.push(emitResponsiveRule(`.${c}`, withMinHeight(dS), withMinHeight(tS), withMinHeight(mS)))

      const innerCls = `${c}-in`
      parts.push(emitResponsiveRule(`.${innerCls}`, buildSectionInnerStyle(dS), buildSectionInnerStyle(tS), buildSectionInnerStyle(mS)))
    } else if (node.type !== 'avatar' && node.type !== 'spacer') {
      // Avatar/Spacer don't call useNodeStyle/buildInlineStyle in the live
      // renderer at all (they size themselves off node.props directly) —
      // so there's no base style CSS to emit for them here either; they
      // still get animation/hover/custom-CSS rules below same as anything
      // else, just no responsive style block.
      const dS = resolveStyleForBreakpoint(node, 'desktop')
      const tS = resolveStyleForBreakpoint(node, 'tablet')
      const mS = resolveStyleForBreakpoint(node, 'mobile')
      parts.push(emitResponsiveRule(`.${c}`, buildInlineStyle(dS), buildInlineStyle(tS), buildInlineStyle(mS)))
    }

    const animCss = buildAnimationCssForNode(id, node)
    if (animCss) parts.push(animCss)

    const hoverCss = compileHoverCss(id, node.props.styleHover as HoverStyleProps | undefined)
    if (hoverCss) parts.push(hoverCss)

    const customCss = compileCustomCss(id, node.props.customCss as string | undefined)
    if (customCss) parts.push(customCss)
  }

  return parts.filter(Boolean).join('\n\n')
}

// ─── HTML body ──────────────────────────────────────────────────────────────
// Every node always gets its wrapperClassFor class on its root element,
// unconditionally — including nodes with no custom CSS/hover/animation at
// all (an unused CSS class costs nothing) — rather than the old
// conditional withCustomCss() check, since now the class is also how base
// responsive styling attaches. Simpler and can never drift into "class
// exists in <style> but missing from the element" or vice versa.

function renderNode(nodeId: string, nodes: NodeMap, rootId: string, depth = 0): string {
  const node = nodes[nodeId]
  if (!node) return ''
  const pad  = '  '.repeat(depth)
  const kids = node.children.map(cid => renderNode(cid, nodes, rootId, depth + 1)).join('\n')
  const wrapCls = wrapperClassFor(nodeId)
  const anim = animAttrs(node)
  // Desktop-resolved style, used ONLY for buildClassName's literal
  // Tailwind-utility output — see the file-header comment for why that
  // part stays desktop-only while everything else is fully responsive.
  const ds = resolveStyleForBreakpoint(node, 'desktop')

  switch (node.type as NodeType) {

    case 'section': {
      const innerCls = `${wrapCls}-in`
      const tS = resolveStyleForBreakpoint(node, 'tablet')
      const mS = resolveStyleForBreakpoint(node, 'mobile')
      const hasBackgroundAny = !!(ds.bgImage || ds.bgGradient || tS.bgImage || tS.bgGradient || mS.bgImage || mS.bgGradient)
      const overlayStyle = buildOverlayStyle(ds.bgOverlay)
      const overlay = overlayStyle
        ? `\n${pad}  <div style="${reactStyleToCssText(overlayStyle)}" aria-hidden="true"></div>`
        : ''
      return `${pad}<section class="${cls(buildClassName(ds, 'w-full relative'), wrapCls)}"${anim}>${overlay}
${pad}  <div class="${cls('w-full', hasBackgroundAny ? 'relative z-10' : '', innerCls)}">
${kids}
${pad}  </div>
${pad}</section>`
    }

    case 'columns':
      return `${pad}<div class="${cls(buildClassName(ds, 'w-full flex flex-row'), wrapCls)}"${anim}>\n${kids}\n${pad}</div>`

    case 'column':
      return `${pad}<div class="${cls(buildClassName(ds, 'flex-1 min-w-0'), wrapCls)}"${anim}>\n${kids}\n${pad}</div>`

    case 'text':
      return `${pad}<p class="${cls(buildClassName(ds, ''), wrapCls)}"${anim}>${(node.props.content as string) ?? ''}</p>`

    case 'heading': {
      const tag = (node.props.tag as string) || 'h2'
      return `${pad}<${tag} class="${cls(buildClassName(ds, ''), wrapCls)}"${anim}>${(node.props.content as string) ?? ''}</${tag}>`
    }

    case 'image': {
      const src = (node.props.src as string) ?? ''
      const alt = (node.props.alt as string) ?? ''
      const hasFixed = typeof ds.width === 'number'
      const base = hasFixed ? 'block' : 'max-w-full block'
      return `${pad}<img src="${esc(src)}" alt="${esc(alt)}" class="${cls(buildClassName(ds, base), wrapCls)}"${anim} />`
    }

    case 'button': {
      const label   = (node.props.label as string) ?? 'Button'
      const href    = (node.props.href as string) ?? '#'
      const variant = (node.props.variant as string) ?? 'solid'
      const vc =
        variant === 'outline' ? 'border-2 border-violet-600 text-violet-600 hover:bg-violet-50' :
        variant === 'ghost'   ? 'text-violet-600 hover:bg-violet-50' :
        'bg-violet-600 text-white hover:bg-violet-700'
      return `${pad}<a href="${esc(href)}" class="${cls(`inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-medium transition-colors text-sm ${vc}`, wrapCls)}"${anim}>${esc(label)}</a>`
    }

    case 'spacer':
      return `${pad}<div class="${wrapCls}"${anim} style="height:${(node.props.height as number) ?? 40}px"></div>`

    case 'divider':
      return `${pad}<hr class="${cls(buildClassName(ds, 'w-full'), wrapCls)}"${anim} />`

    case 'badge': {
      const label   = (node.props.label as string) ?? 'Badge'
      const variant = (node.props.variant as string) ?? 'soft'
      const vc =
        variant === 'solid'   ? 'bg-violet-600 text-white' :
        variant === 'outline' ? 'border border-violet-300 text-violet-700' :
        'bg-violet-100 text-violet-700'
      return `${pad}<span class="${cls(`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${vc}`, wrapCls)}"${anim}>${esc(label)}</span>`
    }

    case 'list': {
      const items      = (node.props.items as string[]) ?? []
      const markerType = (node.props.markerType as string) ?? 'bullet'
      const markers: Record<string, string> = { bullet: '•', check: '✓', arrow: '→' }
      const lis = items.map((text, i) => {
        const marker = markerType === 'number' ? `${i + 1}.` : (markers[markerType] ?? '•')
        return `${pad}  <li class="flex items-start gap-2.5"><span class="shrink-0 text-violet-600 font-medium leading-6">${marker}</span><span class="leading-6">${esc(text)}</span></li>`
      }).join('\n')
      return `${pad}<ul class="${cls(buildClassName(ds, 'space-y-2 list-none'), wrapCls)}"${anim}>\n${lis}\n${pad}</ul>`
    }

    case 'avatar': {
      const src      = (node.props.src as string) ?? ''
      const initials = (node.props.initials as string) ?? '?'
      const size     = (node.props.size as number) ?? 56
      if (src) {
        return `${pad}<img src="${esc(src)}" alt="" class="${cls('rounded-full object-cover shrink-0', wrapCls)}"${anim} style="width:${size}px;height:${size}px" />`
      }
      return `${pad}<div class="${cls('rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-semibold shrink-0 select-none', wrapCls)}"${anim} style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.36)}px">${esc(initials)}</div>`
    }

    case 'quote': {
      const quote  = (node.props.quote as string) ?? ''
      const name   = (node.props.name as string) ?? ''
      const role   = (node.props.role as string) ?? ''
      const avSrc  = (node.props.avatarSrc as string) ?? ''
      const init   = name?.[0] ?? '?'
      const avatar = avSrc
        ? `<img src="${esc(avSrc)}" alt="" class="w-10 h-10 rounded-full object-cover shrink-0" />`
        : `<div class="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-semibold shrink-0">${esc(init)}</div>`
      return `${pad}<div class="${cls(buildClassName(ds, 'flex flex-col gap-4'), wrapCls)}"${anim}>
${pad}  <p class="text-lg leading-relaxed text-neutral-700">"${esc(quote)}"</p>
${pad}  <div class="flex items-center gap-3">
${pad}    ${avatar}
${pad}    <div class="min-w-0"><p class="text-sm font-semibold text-neutral-800 truncate">${esc(name)}</p><p class="text-xs text-neutral-400 truncate">${esc(role)}</p></div>
${pad}  </div>
${pad}</div>`
    }

    case 'video': {
      const raw = (node.props.url as string) ?? ''
      // Same 16/9 fallback VideoRender itself applies when no aspectRatio
      // is set — kept as an explicit inline exception (rather than routed
      // through the generic responsive mechanism) to match that exactly.
      const ratio = (ds.aspectRatio && ds.aspectRatio !== 'auto') ? ds.aspectRatio : '16/9'
      const ytMatch    = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{6,})/)
      const vimeoMatch = raw.match(/vimeo\.com\/(\d+)/)
      const embed =
        ytMatch ? `https://www.youtube.com/embed/${ytMatch[1]}` :
        vimeoMatch ? `https://player.vimeo.com/video/${vimeoMatch[1]}` :
        raw
      if (!embed) {
        return `${pad}<div class="${cls(buildClassName(ds, 'bg-neutral-100 border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center gap-1.5 text-neutral-400 text-sm'), wrapCls)}"${anim} style="aspect-ratio:${ratio};min-height:160px"><span style="font-size:1.25rem">▶</span><span style="font-size:0.75rem;font-weight:500">Paste a YouTube or Vimeo link</span></div>`
      }
      return `${pad}<div class="${cls(buildClassName(ds, 'overflow-hidden'), wrapCls)}"${anim} style="aspect-ratio:${ratio}"><iframe src="${esc(embed)}" style="width:100%;height:100%;border:0" allowfullscreen></iframe></div>`
    }

    case 'accordion': {
      const items = (node.props.items as { q: string; a: string }[]) ?? []
      const rows = items.map(item => `${pad}  <details class="border-b border-neutral-200 py-3">
${pad}    <summary class="cursor-pointer text-sm font-medium text-neutral-800 list-none flex justify-between items-center">${esc(item.q)}<span>+</span></summary>
${pad}    <p class="pt-2 text-sm text-neutral-500 leading-relaxed">${esc(item.a)}</p>
${pad}  </details>`).join('\n')
      return `${pad}<div class="${cls(buildClassName(ds, 'w-full border-t border-neutral-200'), wrapCls)}"${anim}>\n${rows}\n${pad}</div>`
    }

    default:
      return ''
  }
}

// ─── SEO → real <head> tags ─────────────────────────────────────────────────

function buildSeoHead(seo: SeoSettings): string {
  const lines: string[] = []
  if (seo.description) lines.push(`<meta name="description" content="${esc(seo.description)}" />`)
  if (seo.keywords)    lines.push(`<meta name="keywords" content="${esc(seo.keywords)}" />`)
  if (seo.noIndex)     lines.push(`<meta name="robots" content="noindex, nofollow" />`)
  if (seo.canonicalUrl) lines.push(`<link rel="canonical" href="${esc(seo.canonicalUrl)}" />`)
  if (seo.favicon)      lines.push(`<link rel="icon" href="${esc(seo.favicon)}" />`)

  const ogTitle = seo.ogTitle || seo.title
  const ogDesc  = seo.ogDescription || seo.description
  lines.push(`<meta property="og:type" content="website" />`)
  if (ogTitle) lines.push(`<meta property="og:title" content="${esc(ogTitle)}" />`)
  if (ogDesc)  lines.push(`<meta property="og:description" content="${esc(ogDesc)}" />`)
  if (seo.ogImage) lines.push(`<meta property="og:image" content="${esc(seo.ogImage)}" />`)
  if (ogTitle) lines.push(`<meta name="twitter:card" content="summary_large_image" />`)

  return lines.join('\n  ')
}

// ─── Assemble ─────────────────────────────────────────────────────────────

export interface ExportOptions {
  title?:           string
  globalCustomCss?: string
  globalColors?:    GlobalColor[]
  seo?:             SeoSettings
}

export function exportToHtml(nodes: NodeMap, rootId: string, opts: ExportOptions = {}): string {
  // Global colors are resolved to real hex HERE, at export time, via the
  // same module-level cache Renderer.tsx feeds live (see
  // setGlobalColorPalette in styleMapper.ts) — the exported file has no
  // store to read from later, so every `global:<id>` reference needs to be
  // baked into a literal value now, once, up front.
  setGlobalColorPalette(opts.globalColors ?? [])

  const body     = renderNode(rootId, nodes, rootId, 1)
  const styleCss = collectStyleCss(nodes, rootId)
  const globalCss = opts.globalCustomCss?.trim() ?? ''
  const styleBlock = [globalCss, styleCss].filter(Boolean).join('\n\n')
  const needsAnimateScript = body.includes('data-pb-animate')

  const seo = opts.seo ?? {}
  const pageTitle = seo.title || opts.title || 'Exported Page'
  const seoHead = buildSeoHead(seo)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(pageTitle)}</title>
  ${seoHead}
  <!--
    Layout/fit utility classes (w-full, object-cover, etc.) load via the
    Tailwind CDN. Every color, spacing, typography, border, effect,
    visibility, and responsive (Tablet/Mobile) value below is real CSS
    generated from the same style-resolution functions the live editor and
    Preview use (see styleMapper.ts / responsive.ts) — this file mirrors
    Preview directly instead of duplicating that logic by hand.
  -->
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
${styleBlock}
  </style>
</head>
<body>
${body}
${needsAnimateScript ? ANIMATE_SCRIPT : ''}
</body>
</html>`
}

export function downloadHtml(nodes: NodeMap, rootId: string, filename = 'page.html', opts: ExportOptions = {}): void {
  const blob = new Blob([exportToHtml(nodes, rootId, opts)], { type: 'text/html' })
  triggerDownload(blob, filename)
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}