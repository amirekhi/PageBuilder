'use client'

// The agent's ONLY way to change the page. Pure: (nodes, ops) -> new nodes.
// No store access, so it is trivially testable and cannot half-apply: runAgent
// calls this on a deep clone and commits the result to the store in one write.
//
// Every value is validated against catalog.ts, every tree edit respects the
// container rules (tabs->tabpane, carousel->slide), and a final normalize()
// pass repairs anything structurally off (dangling children, empty tabs,
// grids too small for their children).

import type { NodeMap, PageNode, NodeType } from '../types'
import type { SeoSettings } from '../store'
import { NODE_REGISTRY } from '../registry'
import { computeGridOccupancy } from '../gridLayout'
import {
  STYLE_SPEC, PROP_SPECS, FONT_MAP, TEMPLATE_KEYS, ANIM_EFFECTS, ANIM_EASINGS, ANIM_TRIGGERS,
  type StyleKind, type PropKind,
} from './catalog'
import {
  cleanHtml, cleanText, cleanHref, cleanImage, cleanVideo, cleanFieldName, cleanColor, cleanGradient,
} from './sanitize'

// ─── Op types ───────────────────────────────────────────────────────────────
export type Breakpoint = 'desktop' | 'tablet' | 'mobile'
type Bag = Record<string, unknown>

export type FillValue =
  | string
  | string[]
  | { q: string; a: string }[]
  | { quote?: string; name?: string; role?: string }
  | null

export type AgentOp =
  | { op: 'add'; ref: string; type: NodeType; parent: string; index?: number; props?: Bag; style?: Bag; styleTablet?: Bag; styleMobile?: Bag }
  | { op: 'update'; id: string; props?: Bag; style?: Bag; breakpoint?: Breakpoint }
  | { op: 'delete'; id: string }
  | { op: 'move'; id: string; parent: string; index?: number }
  | { op: 'template'; key: string; ref?: string; parent?: string; index?: number; fill?: FillValue[] }
  | { op: 'clear' }
  | { op: 'seo'; title?: string; description?: string; keywords?: string }
  | { op: 'say'; text: string }

export interface ApplyContext {
  locale: 'en' | 'fa'
  buildTemplate: (key: string) => { nodes: NodeMap; rootChildId: string } | null
}

export interface ApplyResult {
  nodes: NodeMap
  refs: Record<string, string>
  applied: number
  errors: string[]
  seo?: Partial<SeoSettings>
}

// ─── Value cleaning ─────────────────────────────────────────────────────────
function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim())) return Number(v)
  return undefined
}
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)))

function cleanStyleValue(kind: StyleKind, v: unknown): unknown {
  switch (kind.t) {
    case 'int': { const n = num(v); return n === undefined ? undefined : clamp(n, kind.min, kind.max) }
    case 'intSet': { const n = num(v); return n !== undefined && kind.values.includes(n) ? n : undefined }
    case 'enum': return typeof v === 'string' && kind.values.includes(v) ? v : undefined
    case 'numOrEnum': {
      if (typeof v === 'string' && kind.values.includes(v)) return v
      const n = num(v)
      return n === undefined ? undefined : clamp(n, kind.min, kind.max)
    }
    case 'bool': return typeof v === 'boolean' ? v : undefined
    case 'color': return cleanColor(v)
    case 'gradient': return cleanGradient(v)
    case 'image': return cleanImage(v) || undefined
    case 'font': return typeof v === 'string' ? FONT_MAP[v] : undefined
  }
}

// `null` means "clear this key" -> represented as undefined, pruned by mergeStyle.
export function cleanStyle(raw: unknown): Bag {
  const out: Bag = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [k, v] of Object.entries(raw as Bag)) {
    const spec = STYLE_SPEC[k]
    if (!spec) continue
    if (v === null) { out[k] = undefined; continue }
    const c = cleanStyleValue(spec, v)
    if (c !== undefined) out[k] = c
  }
  return out
}

export function mergeStyle(existing: Bag, patch: Bag): Bag {
  const next: Bag = { ...existing, ...patch }
  for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k]
  return next
}

function cleanPropValue(kind: PropKind, v: unknown): unknown {
  switch (kind.t) {
    case 'html': return cleanHtml(v, kind.max ?? 2000)
    case 'text': return cleanText(v, kind.max)
    case 'href': return cleanHref(v)
    case 'image': return cleanImage(v)
    case 'video': return cleanVideo(v)
    case 'bool': return typeof v === 'boolean' ? v : undefined
    case 'int': { const n = num(v); return n === undefined ? undefined : clamp(n, kind.min, kind.max) }
    case 'enum': return typeof v === 'string' && kind.values.includes(v) ? v : undefined
    case 'strList': {
      if (!Array.isArray(v)) return undefined
      const items = v.map(x => cleanText(x, kind.maxLen)).filter(Boolean).slice(0, kind.maxItems)
      return items.length ? items : undefined
    }
    case 'qaList': {
      if (!Array.isArray(v)) return undefined
      const items = v
        .map(x => (x && typeof x === 'object' ? { q: cleanText((x as Bag).q, 160), a: cleanText((x as Bag).a, 600) } : null))
        .filter((x): x is { q: string; a: string } => !!x && !!x.q)
        .slice(0, kind.maxItems)
      return items.length ? items : undefined
    }
    case 'fieldName': return cleanFieldName(v) || undefined
    case 'forced': return kind.value
  }
}

function cleanAnimation(v: unknown): Bag | undefined {
  if (!v || typeof v !== 'object') return undefined
  const a = v as Bag
  const out: Bag = {}
  if (typeof a.effect === 'string' && (ANIM_EFFECTS as readonly string[]).includes(a.effect)) out.effect = a.effect
  if (typeof a.easing === 'string' && (ANIM_EASINGS as readonly string[]).includes(a.easing)) out.easing = a.easing
  if (typeof a.trigger === 'string' && (ANIM_TRIGGERS as readonly string[]).includes(a.trigger)) out.trigger = a.trigger
  const d = num(a.duration); if (d !== undefined) out.duration = clamp(d, 100, 2000)
  const dl = num(a.delay); if (dl !== undefined) out.delay = clamp(dl, 0, 2000)
  if (typeof a.once === 'boolean') out.once = a.once
  return Object.keys(out).length ? out : undefined
}

export function cleanProps(type: NodeType, raw: unknown): Bag {
  const out: Bag = {}
  if (!raw || typeof raw !== 'object') return out
  const spec = PROP_SPECS[type] ?? {}
  for (const [k, v] of Object.entries(raw as Bag)) {
    if (k === 'animation') {
      const anim = cleanAnimation(v)
      if (anim) out.animation = anim
      continue
    }
    const kind = spec[k]
    if (!kind) continue
    const c = cleanPropValue(kind, v)
    if (c !== undefined) out[k] = c
  }
  return out
}

// ─── Template text slots ────────────────────────────────────────────────────
// A "slot" is a text-bearing node inside an inserted template, in document
// order. The model fills them by index (template op's `fill`). The same
// function builds the slot catalog sent to the model (outline.ts), so the
// indexes it sees are exactly the ones applied here.
export const SLOT_TYPES = new Set<NodeType>(['heading', 'text', 'button', 'badge', 'list', 'accordion', 'quote'])
export interface Slot { id: string; type: NodeType }

export function collectSlots(nodes: NodeMap, startId: string): Slot[] {
  const out: Slot[] = []
  const walk = (id: string) => {
    const n = nodes[id]
    if (!n) return
    if (SLOT_TYPES.has(n.type)) out.push({ id, type: n.type })
    n.children.forEach(walk)
  }
  walk(startId)
  return out
}

function applySlot(node: PageNode, val: FillValue): string | null {
  switch (node.type) {
    case 'heading': case 'text':
      if (typeof val !== 'string') return 'expected string'
      Object.assign(node.props, cleanProps(node.type, { content: val })); return null
    case 'button': case 'badge':
      if (typeof val !== 'string') return 'expected string'
      Object.assign(node.props, cleanProps(node.type, { label: val })); return null
    case 'list':
      if (!Array.isArray(val)) return 'expected string[]'
      Object.assign(node.props, cleanProps('list', { items: val })); return null
    case 'accordion':
      if (!Array.isArray(val)) return 'expected [{q,a}]'
      Object.assign(node.props, cleanProps('accordion', { items: val })); return null
    case 'quote':
      if (!val || typeof val !== 'object' || Array.isArray(val)) return 'expected {quote,name,role}'
      Object.assign(node.props, cleanProps('quote', val)); return null
    default: return 'slot type not fillable'
  }
}

// ─── Tree helpers ───────────────────────────────────────────────────────────
function containError(parent: PageNode, childType: NodeType): string | null {
  if (!NODE_REGISTRY[parent.type]?.isContainer) return `${parent.type} cannot contain children`
  if (parent.type === 'tabs' && childType !== 'tabpane') return 'tabs may only contain tabpane'
  if (parent.type === 'carousel' && childType !== 'slide') return 'carousel may only contain slide'
  if (childType === 'tabpane' && parent.type !== 'tabs') return 'tabpane must be inside tabs'
  if (childType === 'slide' && parent.type !== 'carousel') return 'slide must be inside carousel'
  return null
}

function dropSubtree(nodes: NodeMap, id: string) {
  const n = nodes[id]
  if (!n) return
  for (const c of [...n.children]) dropSubtree(nodes, c)
  const p = n.parentId ? nodes[n.parentId] : null
  if (p) p.children = p.children.filter(c => c !== id)
  delete nodes[id]
}

const clampIndex = (i: unknown, len: number) => {
  const n = typeof i === 'number' && Number.isFinite(i) ? Math.round(i) : len
  return Math.min(Math.max(0, n), len)
}

const REF_RE = /^[A-Za-z0-9_-]{1,40}$/

// ─── The applier ────────────────────────────────────────────────────────────
export function applyOps(
  baseNodes: NodeMap,
  rootId: string,
  ops: AgentOp[],
  ctx: ApplyContext,
  prevRefs: Record<string, string> = {},
): ApplyResult {
  const nodes: NodeMap = JSON.parse(JSON.stringify(baseNodes))
  const refs: Record<string, string> = { ...prevRefs }
  for (const [k, v] of Object.entries(refs)) if (!nodes[v]) delete refs[k]

  const errors: string[] = []
  let applied = 0
  let seo: Partial<SeoSettings> | undefined

  const resolve = (r: unknown): string | null => {
    if (typeof r !== 'string') return null
    if (r === 'root') return rootId
    if (refs[r]) return refs[r]
    return nodes[r] ? r : null
  }
  const newId = () => {
    let id: string
    do { id = `node_${Math.random().toString(36).slice(2, 8)}` } while (nodes[id])
    return id
  }

  ops.forEach((op, i) => {
    try {
      switch (op.op) {
        case 'add': {
          if (typeof op.ref !== 'string' || !REF_RE.test(op.ref) || op.ref === 'root') throw new Error(`invalid ref "${String(op.ref)}"`)
          if (refs[op.ref] || nodes[op.ref]) throw new Error(`duplicate ref "${op.ref}"`)
          const def = NODE_REGISTRY[op.type]
          if (!def) throw new Error(`unknown type "${String(op.type)}"`)
          const parentId = resolve(op.parent)
          if (!parentId) throw new Error(`unknown parent "${String(op.parent)}"`)
          const parent = nodes[parentId]
          const ce = containError(parent, op.type)
          if (ce) throw new Error(ce)

          // createExtras is deliberately NOT used: the agent adds every child
          // explicitly, so Columns/Tabs/Form never come with unwanted defaults.
          const base = JSON.parse(JSON.stringify(def.defaultProps)) as Bag
          const style = mergeStyle((base.style as Bag) ?? {}, cleanStyle(op.style))
          const props: Bag = { ...base, ...cleanProps(op.type, op.props), style }
          const tab = mergeStyle({}, cleanStyle(op.styleTablet))
          const mob = mergeStyle({}, cleanStyle(op.styleMobile))
          if (Object.keys(tab).length) props.styleTablet = tab
          if (Object.keys(mob).length) props.styleMobile = mob

          const id = newId()
          nodes[id] = { id, type: op.type, props, children: [], parentId }
          parent.children.splice(clampIndex(op.index, parent.children.length), 0, id)
          refs[op.ref] = id
          applied++
          break
        }

        case 'update': {
          const id = resolve(op.id)
          if (!id) throw new Error(`unknown node "${String(op.id)}"`)
          const node = nodes[id]
          if (op.props) Object.assign(node.props, cleanProps(node.type, op.props))
          if (op.style) {
            const key = op.breakpoint === 'tablet' ? 'styleTablet' : op.breakpoint === 'mobile' ? 'styleMobile' : 'style'
            node.props[key] = mergeStyle((node.props[key] as Bag) ?? {}, cleanStyle(op.style))
          }
          applied++
          break
        }

        case 'delete': {
          const id = resolve(op.id)
          if (!id) throw new Error(`unknown node "${String(op.id)}"`)
          if (id === rootId) throw new Error('cannot delete root (use clear)')
          dropSubtree(nodes, id)
          applied++
          break
        }

        case 'move': {
          const id = resolve(op.id)
          const parentId = resolve(op.parent)
          if (!id || id === rootId) throw new Error(`cannot move "${String(op.id)}"`)
          if (!parentId) throw new Error(`unknown parent "${String(op.parent)}"`)
          for (let c: string | null = parentId; c; c = nodes[c]?.parentId ?? null) {
            if (c === id) throw new Error('cannot move a node into itself')
          }
          const node = nodes[id]
          const parent = nodes[parentId]
          const ce = containError(parent, node.type)
          if (ce) throw new Error(ce)
          const old = node.parentId ? nodes[node.parentId] : null
          const oldIdx = old ? old.children.indexOf(id) : -1
          if (old) old.children.splice(oldIdx, 1)
          let idx = clampIndex(op.index, parent.children.length)
          if (old === parent && oldIdx >= 0 && idx > oldIdx) idx -= 1
          parent.children.splice(idx, 0, id)
          node.parentId = parentId
          applied++
          break
        }

        case 'template': {
          if (!(TEMPLATE_KEYS as readonly string[]).includes(op.key)) throw new Error(`unknown template "${String(op.key)}"`)
          const parentId = resolve(op.parent ?? 'root')
          if (!parentId) throw new Error(`unknown parent "${String(op.parent)}"`)
          const parent = nodes[parentId]
          const ce = containError(parent, 'section')
          if (ce) throw new Error(ce)
          if (op.ref && (!REF_RE.test(op.ref) || refs[op.ref] || nodes[op.ref])) throw new Error(`invalid or duplicate ref "${op.ref}"`)
          const built = ctx.buildTemplate(op.key)
          if (!built) throw new Error(`template "${op.key}" unavailable`)

          Object.values(built.nodes).forEach(n => { nodes[n.id] = n })
          nodes[built.rootChildId].parentId = parentId
          parent.children.splice(clampIndex(op.index, parent.children.length), 0, built.rootChildId)
          if (op.ref) refs[op.ref] = built.rootChildId

          if (Array.isArray(op.fill)) {
            const slots = collectSlots(nodes, built.rootChildId)
            op.fill.forEach((val, si) => {
              if (val === null || val === undefined) return
              const slot = slots[si]
              if (!slot) { errors.push(`op ${i}: fill[${si}] has no matching slot`); return }
              const err = applySlot(nodes[slot.id], val)
              if (err) errors.push(`op ${i}: fill[${si}] ${err}`)
            })
          }
          applied++
          break
        }

        case 'clear': {
          for (const c of [...nodes[rootId].children]) dropSubtree(nodes, c)
          applied++
          break
        }

        case 'seo': {
          seo = { ...seo }
          if (op.title) seo.title = cleanText(op.title, 70)
          if (op.description) seo.description = cleanText(op.description, 170)
          if (op.keywords) seo.keywords = cleanText(op.keywords, 200)
          applied++
          break
        }

        case 'say': break
        default: throw new Error(`unknown op "${String((op as Bag).op)}"`)
      }
    } catch (e) {
      errors.push(`op ${i} (${(op as Bag)?.op ?? '?'}): ${(e as Error).message}`)
    }
  })

  normalize(nodes, rootId)
  for (const [k, v] of Object.entries(refs)) if (!nodes[v]) delete refs[k]
  return { nodes, refs, applied, errors, seo }
}

// ─── Post-pass repairs ──────────────────────────────────────────────────────
export function normalize(nodes: NodeMap, rootId: string) {
  // dangling children
  for (const n of Object.values(nodes)) n.children = n.children.filter(c => nodes[c])

  // reachability + parentId
  const reachable = new Set<string>()
  const walk = (id: string, parent: string | null) => {
    if (reachable.has(id)) return
    reachable.add(id)
    nodes[id].parentId = parent
    nodes[id].children.forEach(c => walk(c, id))
  }
  walk(rootId, null)
  for (const id of Object.keys(nodes)) if (!reachable.has(id)) delete nodes[id]

  // empty tabs / carousels render nothing useful in Preview
  let changed = true
  while (changed) {
    changed = false
    for (const n of Object.values(nodes)) {
      if ((n.type === 'tabs' || n.type === 'carousel') && n.children.length === 0 && n.id !== rootId) {
        dropSubtree(nodes, n.id); changed = true; break
      }
    }
  }

  // Grids drop children that don't fit (see computeGridOccupancy) — grow rows
  // until everyone is placed, so nothing silently disappears.
  for (const n of Object.values(nodes)) {
    if (n.type !== 'grid' || n.children.length === 0) continue
    const style = (n.props.style as Bag) ?? {}
    const cols = typeof style.gridCols === 'number' ? style.gridCols : 3
    let rows = typeof style.gridRows === 'number' ? style.gridRows : 2
    while (rows < 12 && computeGridOccupancy(n.children, nodes, cols, rows).originByCell.size < n.children.length) rows++
    if (rows !== style.gridRows) n.props.style = { ...style, gridRows: rows }
  }
}
