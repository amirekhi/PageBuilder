'use client'

import { NodeMap, PageNode, NodeType } from './types'
import { NODE_REGISTRY } from './registry'
import { StyleProps, buildClassName, resolveColor, buildAlignMargin } from './styleMapper'
import { compileCustomCss, wrapperClassFor } from './customCss'

// ─── LocalStorage ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'page-builder:autosave'

export interface SavedPage {
  nodes:   NodeMap
  rootId:  string
  savedAt: string
  version: 1
}

export function saveToLocalStorage(nodes: NodeMap, rootId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const payload: SavedPage = { nodes, rootId, savedAt: new Date().toISOString(), version: 1 }
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

export function downloadJSON(nodes: NodeMap, rootId: string, filename = 'page.json'): void {
  const payload: SavedPage = { nodes, rootId, savedAt: new Date().toISOString(), version: 1 }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  triggerDownload(blob, filename)
}

export interface ImportResult {
  success: boolean
  nodes?:  NodeMap
  rootId?: string
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
    return { success: true, nodes: parsed.nodes, rootId: parsed.rootId }
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
// Walks the node tree exactly like PreviewRenderer does and produces a static
// HTML string. Styling uses the same Tailwind utility classes that the editor
// already generates, loaded at runtime via the official Tailwind CDN script
// so the file works in any browser with an internet connection — no build
// step, no Tailwind installation needed on the receiving end.
//
// Colors, gradients, and background images are written as real inline CSS
// (via resolveColor / raw gradient strings from styleMapper) rather than
// dynamic Tailwind classes, so they render identically to the live editor.
//
// Custom CSS: each node's own props.customCss (compiled via compileCustomCss
// from customCss.ts) plus the page-level global CSS are collected into one
// <style> block in the exported document's <head>, and every rendered
// element with custom CSS gets its wrapperClassFor(node.id) class added —
// same mechanism the live editor uses, so exported pages match exactly.

function esc(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inlineStyleStr(style: StyleProps | undefined): string {
  if (!style) return ''
  const s: string[] = []
  if (style.px  !== undefined) { s.push(`padding-left:${style.px*4}px`); s.push(`padding-right:${style.px*4}px`) }
  if (style.py  !== undefined) { s.push(`padding-top:${style.py*4}px`);  s.push(`padding-bottom:${style.py*4}px`) }
  if (style.pt  !== undefined) s.push(`padding-top:${style.pt*4}px`)
  if (style.pb  !== undefined) s.push(`padding-bottom:${style.pb*4}px`)
  if (style.pl  !== undefined) s.push(`padding-left:${style.pl*4}px`)
  if (style.pr  !== undefined) s.push(`padding-right:${style.pr*4}px`)
  if (style.mx  !== undefined) { s.push(`margin-left:${style.mx*4}px`);  s.push(`margin-right:${style.mx*4}px`) }
  if (style.my  !== undefined) { s.push(`margin-top:${style.my*4}px`);   s.push(`margin-bottom:${style.my*4}px`) }
  // mt/mb/ml/mr are all number | 'auto' now (vertical + horizontal
  // self-positioning) — routed through buildAlignMargin, the single source
  // of truth for all four, rather than multiplying a value that might be
  // the string 'auto' directly.
  const align = buildAlignMargin(style)
  if (align.marginTop    !== undefined) s.push(`margin-top:${typeof align.marginTop    === 'number' ? align.marginTop    + 'px' : align.marginTop}`)
  if (align.marginBottom !== undefined) s.push(`margin-bottom:${typeof align.marginBottom === 'number' ? align.marginBottom + 'px' : align.marginBottom}`)
  if (align.marginLeft   !== undefined) s.push(`margin-left:${typeof align.marginLeft  === 'number' ? align.marginLeft  + 'px' : align.marginLeft}`)
  if (align.marginRight  !== undefined) s.push(`margin-right:${typeof align.marginRight === 'number' ? align.marginRight + 'px' : align.marginRight}`)
  if (style.gap !== undefined) s.push(`gap:${style.gap*4}px`)
  if (typeof style.width     === 'number') s.push(`width:${style.width}px`)
  if (typeof style.maxWidth  === 'number') s.push(`max-width:${style.maxWidth}px`)
  if (typeof style.minHeight === 'number') s.push(`min-height:${style.minHeight}px`)
  if (typeof style.height    === 'number') s.push(`height:${style.height}px`)
  if (style.opacity !== undefined) s.push(`opacity:${style.opacity/100}`)
  if (style.aspectRatio && style.aspectRatio !== 'auto') s.push(`aspect-ratio:${style.aspectRatio}`)

  const bg = resolveColor(style.bgColor)
  if (bg) s.push(`background-color:${bg}`)
  const fg = resolveColor(style.textColor)
  if (fg) s.push(`color:${fg}`)
  const bd = resolveColor(style.borderColor)
  if (bd) s.push(`border-color:${bd}`)

  return s.join(';')
}

function attrs(style: StyleProps | undefined, extra = ''): string {
  const cls = buildClassName(style ?? {}, extra).trim()
  const inl = inlineStyleStr(style)
  return `${cls ? ` class="${cls}"` : ''}${inl ? ` style="${inl}"` : ''}`
}

// Appends this node's Custom CSS wrapper class (if it has one) to whatever
// class string a case is already about to render — same rule
// withCustomCss() applies in nodeComponents.tsx for the live editor, kept
// as a small local helper here so every case below can reuse it inline.
function withCustomCss(node: PageNode, cls: string): string {
  return node.props.customCss ? `${cls} ${wrapperClassFor(node.id)}`.trim() : cls
}

function renderNode(nodeId: string, nodes: NodeMap, depth = 0): string {
  const node = nodes[nodeId]
  if (!node) return ''
  const pad = '  '.repeat(depth)
  const kids = node.children.map(c => renderNode(c, nodes, depth + 1)).join('\n')
  const s = node.props.style as StyleProps | undefined

  switch (node.type as NodeType) {

    case 'section': {
      const extraInline: string[] = []
      if (s?.bgImage) {
        extraInline.push(`background-image:url(${s.bgImage})`)
        extraInline.push(`background-size:${s.bgSize ?? 'cover'}`)
        extraInline.push(`background-position:${s.bgPos ?? 'center'}`)
        extraInline.push('background-repeat:no-repeat')
      } else if (s?.bgGradient) {
        extraInline.push(`background-image:${s.bgGradient}`)
      }
      const baseInline = inlineStyleStr(s)
      const combined   = [baseInline, ...extraInline].filter(Boolean).join(';')
      const baseClass  = buildClassName(s ?? {}, withCustomCss(node, 'w-full relative'))
      const overlay    = s?.bgOverlay && s.bgOverlay > 0
        ? `\n${pad}  <div style="position:absolute;inset:0;background:rgba(0,0,0,${s.bgOverlay/100});pointer-events:none;z-index:0" aria-hidden="true"></div>`
        : ''
      const hasBackground = !!(s?.bgImage || s?.bgGradient)
      const innerOpen  = hasBackground ? `\n${pad}  <div style="position:relative;z-index:1;width:100%">` : ''
      const innerClose = hasBackground ? `\n${pad}  </div>` : ''
      return `${pad}<section class="${baseClass}"${combined ? ` style="${combined}"` : ''}>${overlay}${innerOpen}\n${kids}${innerClose}\n${pad}</section>`
    }

    case 'columns':
      return `${pad}<div${attrs(s, withCustomCss(node, 'w-full flex flex-row'))}>\n${kids}\n${pad}</div>`

    case 'column':
      return `${pad}<div${attrs(s, withCustomCss(node, 'flex-1 min-w-0'))}>\n${kids}\n${pad}</div>`

    case 'text':
      return `${pad}<p${attrs(s, withCustomCss(node, ''))}>${(node.props.content as string) ?? ''}</p>`

    case 'heading': {
      const tag = (node.props.tag as string) || 'h2'
      return `${pad}<${tag}${attrs(s, withCustomCss(node, ''))}>${(node.props.content as string) ?? ''}</${tag}>`
    }

    case 'image': {
      const src = (node.props.src as string) ?? ''
      const alt = (node.props.alt as string) ?? ''
      const hasFixed = typeof s?.width === 'number'
      const wStyle = hasFixed ? `width:${s!.width}px;height:auto;` : 'width:100%;height:auto;'
      const fitStyle = s?.objectFit ? `object-fit:${s.objectFit};` : 'object-fit:cover;'
      const base = inlineStyleStr(s)
      const combined = [wStyle, fitStyle, base].filter(Boolean).join('')
      const cls = buildClassName(s ?? {}, withCustomCss(node, hasFixed ? 'block' : 'max-w-full block'))
      return `${pad}<img src="${esc(src)}" alt="${esc(alt)}" class="${cls}" style="${combined}" />`
    }

    case 'button': {
      const label   = (node.props.label as string) ?? 'Button'
      const href    = (node.props.href as string) ?? '#'
      const variant = (node.props.variant as string) ?? 'solid'
      const vc =
        variant === 'outline' ? 'border-2 border-violet-600 text-violet-600 hover:bg-violet-50' :
        variant === 'ghost'   ? 'text-violet-600 hover:bg-violet-50' :
        'bg-violet-600 text-white hover:bg-violet-700'
      const cls = withCustomCss(node, `inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-medium transition-colors text-sm ${vc}`)
      return `${pad}<a href="${esc(href)}" class="${cls}">${esc(label)}</a>`
    }

    case 'spacer':
      return `${pad}<div class="${withCustomCss(node, '')}".trim() style="height:${(node.props.height as number) ?? 40}px"></div>`

    case 'divider':
      return `${pad}<hr${attrs(s, withCustomCss(node, 'w-full'))} />`

    case 'badge': {
      const label   = (node.props.label as string) ?? 'Badge'
      const variant = (node.props.variant as string) ?? 'soft'
      const vc =
        variant === 'solid'   ? 'bg-violet-600 text-white' :
        variant === 'outline' ? 'border border-violet-300 text-violet-700' :
        'bg-violet-100 text-violet-700'
      const cls = withCustomCss(node, `inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${vc}`)
      return `${pad}<span class="${cls}">${esc(label)}</span>`
    }

    case 'list': {
      const items      = (node.props.items as string[]) ?? []
      const markerType = (node.props.markerType as string) ?? 'bullet'
      const markers: Record<string, string> = { bullet: '•', check: '✓', arrow: '→' }
      const lis = items.map((text, i) => {
        const marker = markerType === 'number' ? `${i+1}.` : (markers[markerType] ?? '•')
        return `${pad}  <li class="flex items-start gap-2.5"><span class="shrink-0 text-violet-600 font-medium leading-6">${marker}</span><span class="leading-6">${esc(text)}</span></li>`
      }).join('\n')
      return `${pad}<ul${attrs(s, withCustomCss(node, 'space-y-2 list-none'))}>\n${lis}\n${pad}</ul>`
    }

    case 'avatar': {
      const src      = (node.props.src as string) ?? ''
      const initials = (node.props.initials as string) ?? '?'
      const size     = (node.props.size as number) ?? 56
      const cls = withCustomCss(node, 'rounded-full object-cover shrink-0')
      if (src) {
        return `${pad}<img src="${esc(src)}" alt="" class="${cls}" style="width:${size}px;height:${size}px" />`
      }
      const clsFallback = withCustomCss(node, 'rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-semibold shrink-0 select-none')
      return `${pad}<div class="${clsFallback}" style="width:${size}px;height:${size}px;font-size:${Math.round(size*0.36)}px">${esc(initials)}</div>`
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
      return `${pad}<div${attrs(s, withCustomCss(node, 'flex flex-col gap-4'))}>
${pad}  <p class="text-lg leading-relaxed text-neutral-700">"${esc(quote)}"</p>
${pad}  <div class="flex items-center gap-3">
${pad}    ${avatar}
${pad}    <div class="min-w-0"><p class="text-sm font-semibold text-neutral-800 truncate">${esc(name)}</p><p class="text-xs text-neutral-400 truncate">${esc(role)}</p></div>
${pad}  </div>
${pad}</div>`
    }

    case 'video': {
      const raw   = (node.props.url as string) ?? ''
      const ratio = (s?.aspectRatio && s.aspectRatio !== 'auto') ? s.aspectRatio : '16/9'
      const ytMatch    = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{6,})/)
      const vimeoMatch = raw.match(/vimeo\.com\/(\d+)/)
      const embed      = ytMatch
        ? `https://www.youtube.com/embed/${ytMatch[1]}`
        : vimeoMatch
          ? `https://player.vimeo.com/video/${vimeoMatch[1]}`
          : raw
      if (!embed) return `${pad}<div style="aspect-ratio:${ratio};background:#f3f4f6;display:flex;align-items:center;justify-content:center"><span style="color:#9ca3af;font-size:0.75rem">No video URL set</span></div>`
      return `${pad}<div${attrs(s, withCustomCss(node, ''))} style="${inlineStyleStr(s)};aspect-ratio:${ratio};overflow:hidden"><iframe src="${esc(embed)}" style="width:100%;height:100%;border:0" allowfullscreen></iframe></div>`
    }

    case 'accordion': {
      const items = (node.props.items as { q: string; a: string }[]) ?? []
      const rows = items.map(item => `${pad}  <details class="border-b border-neutral-200 py-3">
${pad}    <summary class="cursor-pointer text-sm font-medium text-neutral-800 list-none flex justify-between items-center">${esc(item.q)}<span>+</span></summary>
${pad}    <p class="pt-2 text-sm text-neutral-500 leading-relaxed">${esc(item.a)}</p>
${pad}  </details>`).join('\n')
      return `${pad}<div${attrs(s, withCustomCss(node, 'w-full border-t border-neutral-200'))}>\n${rows}\n${pad}</div>`
    }

    default:
      return ''
  }
}

// Collects every node's compiled custom CSS plus the page-level global CSS
// into one string, ready to drop into a <style> tag.
function collectCustomCss(nodes: NodeMap, globalCustomCss: string): string {
  const parts: string[] = []
  if (globalCustomCss?.trim()) parts.push(globalCustomCss)
  for (const id in nodes) {
    const compiled = compileCustomCss(id, nodes[id].props.customCss as string | undefined)
    if (compiled) parts.push(compiled)
  }
  return parts.join('\n\n')
}

export function exportToHtml(nodes: NodeMap, rootId: string, title = 'Exported Page', globalCustomCss = ''): string {
  const body = renderNode(rootId, nodes, 1)
  const customCss = collectCustomCss(nodes, globalCustomCss)
  const customCssBlock = customCss ? `\n  <style>\n${customCss}\n  </style>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <!--
    Styling uses Tailwind utility classes loaded at runtime via the CDN.
    No build step needed — just open this file in any browser.
    For production use, replace with a compiled Tailwind stylesheet.
  -->
  <script src="https://cdn.tailwindcss.com"></script>${customCssBlock}
</head>
<body>
${body}
</body>
</html>`
}

export function downloadHtml(nodes: NodeMap, rootId: string, filename = 'page.html', title?: string, globalCustomCss = ''): void {
  const blob = new Blob([exportToHtml(nodes, rootId, title, globalCustomCss)], { type: 'text/html' })
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