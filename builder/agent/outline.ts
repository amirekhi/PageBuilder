'use client'

import type { NodeMap, PageNode } from '../types'
import type { Locale } from '../store'
import { SECTION_BUILDERS } from '../templates'
import { collectSlots } from './ops'

const strip = (s: string) => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

function nodeText(n: PageNode): string {
  const p = n.props
  switch (n.type) {
    case 'heading': case 'text': return strip(String(p.content ?? ''))
    case 'button': case 'badge': case 'tabpane': case 'formSubmit': return String(p.label ?? '')
    case 'quote': return strip(String(p.quote ?? ''))
    case 'image': return String(p.alt ?? '')
    case 'list': return Array.isArray(p.items) ? (p.items as string[]).join(' | ') : ''
    case 'accordion': return Array.isArray(p.items) ? (p.items as { q: string }[]).map(i => i.q).join(' | ') : ''
    default: return ''
  }
}

const HINT_KEYS = ['bgColor', 'bgGradient', 'textColor', 'fontSize', 'fontWeight', 'flexDir', 'gridCols', 'width']
function styleHint(n: PageNode): string {
  const s = (n.props.style as Record<string, unknown>) ?? {}
  const parts = HINT_KEYS.filter(k => s[k] !== undefined).map(k => `${k}=${cut(String(s[k]), 24)}`)
  return parts.length ? ` {${parts.join(' ')}}` : ''
}

// Compact, token-cheap view of the current page. Ids are what the model uses
// in update/delete/move ops.
export function buildOutline(nodes: NodeMap, rootId: string, selectedId: string | null): string {
  const root = nodes[rootId]
  if (!root || root.children.length === 0) return 'The page is EMPTY (root has no children).'

  const MAX = 500
  const lines: string[] = []
  let count = 0
  const total = Object.keys(nodes).length

  const walk = (id: string, depth: number) => {
    const n = nodes[id]
    if (!n || count >= MAX) return
    count++
    const text = nodeText(n)
    lines.push(
      `${'  '.repeat(depth)}${id === rootId ? 'root' : id} ${n.type}` +
      (text ? ` "${cut(text, 50)}"` : '') + styleHint(n) +
      (id === selectedId ? '  <- user has this selected' : ''),
    )
    n.children.forEach(c => walk(c, depth + 1))
  }
  walk(rootId, 0)
  if (total > count) lines.push(`… ${total - count} more nodes omitted`)
  return lines.join('\n')
}

// Text slots of every template, in the exact order applyOps' `fill` uses
// (both come from collectSlots). Built fresh from the real builders so it can
// never go stale when you edit templates.ts.
export function buildTemplateSlots(locale: Locale): string {
  return Object.entries(SECTION_BUILDERS).map(([key, build]) => {
    const { nodes, rootChildId } = build(locale)
    const slots = collectSlots(nodes, rootChildId).map((s, i) => {
      const n = nodes[s.id]
      switch (s.type) {
        case 'list': return `[${i} list(${(n.props.items as unknown[])?.length ?? 0})]`
        case 'accordion': return `[${i} accordion(${(n.props.items as unknown[])?.length ?? 0})]`
        case 'quote': return `[${i} quote]`
        default: return `[${i} ${s.type} "${cut(nodeText(n), 28)}"]`
      }
    })
    return `- ${key}: ${slots.join(' ')}`
  }).join('\n')
}
