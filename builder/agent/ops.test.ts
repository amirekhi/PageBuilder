// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import type { NodeMap } from '../types'
import { applyOps, type AgentOp, type ApplyContext } from './ops'

const ROOT = 'root'
const empty = (): NodeMap => ({
  [ROOT]: { id: ROOT, type: 'section', props: { style: {} }, children: [], parentId: null },
})
const ctx: ApplyContext = { locale: 'en', buildTemplate: () => null }
const run = (ops: AgentOp[], nodes = empty()) => applyOps(nodes, ROOT, ops, ctx)

describe('applyOps', () => {
  it('builds a nested tree and resolves refs', () => {
    const r = run([
      { op: 'add', ref: 's', type: 'section', parent: 'root' },
      { op: 'add', ref: 'h', type: 'heading', parent: 's', props: { content: 'Hello', tag: 'h1' } },
    ])
    expect(r.errors).toEqual([])
    const sectionId = r.refs.s
    expect(r.nodes[ROOT].children).toEqual([sectionId])
    expect(r.nodes[sectionId].children).toEqual([r.refs.h])
    expect(r.nodes[r.refs.h].props.content).toBe('Hello')
    expect(r.nodes[r.refs.h].parentId).toBe(sectionId)
  })

  it('does not mutate the input nodes', () => {
    const base = empty()
    run([{ op: 'add', ref: 's', type: 'section', parent: 'root' }], base)
    expect(base[ROOT].children).toEqual([])
  })

  it('enforces container rules', () => {
    const r = run([
      { op: 'add', ref: 's', type: 'section', parent: 'root' },
      { op: 'add', ref: 'p', type: 'tabpane', parent: 's' },
      { op: 'add', ref: 't', type: 'tabs', parent: 's' },
      { op: 'add', ref: 'x', type: 'text', parent: 't' },
    ])
    expect(r.refs.p).toBeUndefined()
    expect(r.refs.x).toBeUndefined()
    expect(r.errors.length).toBe(2)
  })

  it('strips scripts and forbidden props', () => {
    const r = run([
      { op: 'add', ref: 't', type: 'text', parent: 'root',
        props: { content: 'Hi <img src=x onerror=alert(1)><script>alert(1)</script><strong>ok</strong>', customJs: 'alert(1)', htmlId: 'x' } },
    ])
    const n = r.nodes[r.refs.t]
    expect(String(n.props.content)).not.toMatch(/script|onerror|<img/i)
    expect(String(n.props.content)).toContain('<strong>ok</strong>')
    expect(n.props.customJs).toBeUndefined()
    expect(n.props.htmlId).toBeUndefined()
  })

  it('forces form action to empty and blocks javascript: links', () => {
    const r = run([
      { op: 'add', ref: 'f', type: 'form', parent: 'root', props: { action: 'https://evil.example/steal' } },
      { op: 'add', ref: 'b', type: 'button', parent: 'root', props: { label: 'Go', href: 'javascript:alert(1)' } },
    ])
    expect(r.nodes[r.refs.f].props.action).toBe('')
    expect(r.nodes[r.refs.b].props.href).toBe('#')
  })

  it('replaces unknown Unsplash images with a known one', () => {
    const r = run([
      { op: 'add', ref: 'i', type: 'image', parent: 'root', props: { src: 'https://images.unsplash.com/photo-9999999999-fake?w=600' } },
    ])
    const src = String(r.nodes[r.refs.i].props.src)
    expect(src).toMatch(/^https:\/\/images\.unsplash\.com\/photo-/)
    expect(src).not.toContain('9999999999-fake')
  })

  it('writes breakpoint styles and clears keys with null', () => {
    const r1 = run([
      { op: 'add', ref: 'h', type: 'heading', parent: 'root', style: { fontSize: '5xl', bgColor: 'violet-600' } },
    ])
    const id = r1.refs.h
    const r2 = applyOps(r1.nodes, ROOT, [
      { op: 'update', id, style: { fontSize: '3xl' }, breakpoint: 'mobile' },
      { op: 'update', id, style: { bgColor: null } },
    ], ctx, r1.refs)
    const props = r2.nodes[id].props as Record<string, Record<string, unknown>>
    expect(props.styleMobile.fontSize).toBe('3xl')
    expect(props.style.fontSize).toBe('5xl')
    expect('bgColor' in props.style).toBe(false)
  })

  it('rejects invalid style values', () => {
    const r = run([
      { op: 'add', ref: 'h', type: 'heading', parent: 'root', style: { fontSize: '99xl', px: 9999, bgColor: 'url(javascript:x)' } },
    ])
    const style = r.nodes[r.refs.h].props.style as Record<string, unknown>
    expect(style.fontSize).toBe('3xl') // default kept, invalid value dropped
    expect(style.px).toBe(64)           // clamped
    expect(style.bgColor).toBeUndefined()
  })

  it('grows a grid so no child is dropped', () => {
    const ops: AgentOp[] = [
      { op: 'add', ref: 'g', type: 'grid', parent: 'root', style: { gridCols: 2, gridRows: 1 } },
      ...[1, 2, 3, 4, 5].map(i => ({ op: 'add', ref: `c${i}`, type: 'column', parent: 'g' }) as AgentOp),
    ]
    const r = run(ops)
    const style = r.nodes[r.refs.g].props.style as Record<string, number>
    expect(style.gridRows).toBeGreaterThanOrEqual(3)
  })

  it('refuses to delete root; clear empties it; delete removes subtree', () => {
    const r1 = run([
      { op: 'add', ref: 's', type: 'section', parent: 'root' },
      { op: 'add', ref: 't', type: 'text', parent: 's' },
    ])
    const r2 = applyOps(r1.nodes, ROOT, [{ op: 'delete', id: 'root' }], ctx, r1.refs)
    expect(r2.errors.length).toBe(1)
    const r3 = applyOps(r1.nodes, ROOT, [{ op: 'delete', id: 's' }], ctx, r1.refs)
    expect(Object.keys(r3.nodes)).toEqual([ROOT])
    const r4 = applyOps(r1.nodes, ROOT, [{ op: 'clear' }], ctx, r1.refs)
    expect(r4.nodes[ROOT].children).toEqual([])
  })

  it('prunes empty tabs and rejects duplicate refs', () => {
    const r = run([
      { op: 'add', ref: 'a', type: 'section', parent: 'root' },
      { op: 'add', ref: 'a', type: 'section', parent: 'root' },
      { op: 'add', ref: 't', type: 'tabs', parent: 'a' },
    ])
    expect(r.errors.length).toBe(1)
    expect(Object.values(r.nodes).some(n => n.type === 'tabs')).toBe(false)
  })
})
