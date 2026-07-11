import { describe, it, expect, beforeEach } from 'vitest'
import { resolveStyleForBreakpoint, hasOverrideAt, clearNodeStyleOverride, patchNodeStyle } from '../builder/responsive'
import { useBuilderStore } from '../builder/store'
import { PageNode } from '../builder/types'

function makeNode(overrides: Partial<PageNode['props']> = {}): PageNode {
  return {
    id: 'n1', type: 'text', parentId: null, children: [],
    props: { style: { fontSize: 'base', textColor: 'neutral-700' }, ...overrides },
  }
}

describe('resolveStyleForBreakpoint', () => {
  it('desktop returns just the base style', () => {
    const node = makeNode()
    expect(resolveStyleForBreakpoint(node, 'desktop')).toEqual({ fontSize: 'base', textColor: 'neutral-700' })
  })

  it('tablet merges styleTablet on top of base', () => {
    const node = makeNode({ styleTablet: { fontSize: 'sm' } })
    expect(resolveStyleForBreakpoint(node, 'tablet')).toEqual({ fontSize: 'sm', textColor: 'neutral-700' })
  })

  it('mobile merges base -> tablet -> mobile in that cascade order', () => {
    const node = makeNode({
      styleTablet: { fontSize: 'sm', textAlign: 'center' },
      styleMobile: { fontSize: 'xs' },
    })
    expect(resolveStyleForBreakpoint(node, 'mobile')).toEqual({
      fontSize: 'xs',        // mobile wins over tablet
      textAlign: 'center',   // inherited from tablet, untouched by mobile
      textColor: 'neutral-700', // inherited from base, untouched by either
    })
  })

  it('falls back cleanly when styleTablet/styleMobile are entirely absent', () => {
    const node = makeNode()
    expect(resolveStyleForBreakpoint(node, 'mobile')).toEqual({ fontSize: 'base', textColor: 'neutral-700' })
  })
})

describe('hasOverrideAt', () => {
  it('desktop is never considered an override', () => {
    const node = makeNode({ styleTablet: { fontSize: 'sm' } })
    expect(hasOverrideAt(node, 'desktop')).toBe(false)
  })

  it('true when the breakpoint bucket has at least one key', () => {
    const node = makeNode({ styleTablet: { fontSize: 'sm' } })
    expect(hasOverrideAt(node, 'tablet')).toBe(true)
    expect(hasOverrideAt(node, 'mobile')).toBe(false)
  })

  it('false when the bucket exists but is empty', () => {
    const node = makeNode({ styleMobile: {} })
    expect(hasOverrideAt(node, 'mobile')).toBe(false)
  })
})

describe('clearNodeStyleOverride', () => {
  it('clears styleTablet to an empty object', () => {
    let captured: Record<string, unknown> | null = null
    const node = makeNode({ styleTablet: { fontSize: 'sm' } })
    clearNodeStyleOverride(node, props => { captured = props }, 'tablet')
    expect(captured).toEqual({ styleTablet: {} })
  })

  it('clears styleMobile to an empty object', () => {
    let captured: Record<string, unknown> | null = null
    const node = makeNode({ styleMobile: { fontSize: 'xs' } })
    clearNodeStyleOverride(node, props => { captured = props }, 'mobile')
    expect(captured).toEqual({ styleMobile: {} })
  })

  it('does nothing for desktop (no bucket to clear)', () => {
    let called = false
    const node = makeNode()
    clearNodeStyleOverride(node, () => { called = true }, 'desktop' as any)
    expect(called).toBe(false)
  })
})

describe('patchNodeStyle (writes to whichever breakpoint is being EDITED)', () => {
  beforeEach(() => {
    useBuilderStore.setState({ editingBreakpoint: 'desktop' })
  })

  it('writes into props.style when editingBreakpoint is desktop', () => {
    useBuilderStore.setState({ editingBreakpoint: 'desktop' })
    let captured: Record<string, unknown> | null = null
    const node = makeNode()
    patchNodeStyle(node, props => { captured = props }, { fontSize: 'lg' })
    expect(captured).toEqual({ style: { fontSize: 'lg', textColor: 'neutral-700' } })
  })

  it('writes into props.styleTablet when editingBreakpoint is tablet, merging with any existing tablet overrides', () => {
    useBuilderStore.setState({ editingBreakpoint: 'tablet' })
    let captured: Record<string, unknown> | null = null
    const node = makeNode({ styleTablet: { textAlign: 'center' } })
    patchNodeStyle(node, props => { captured = props }, { fontSize: 'sm' })
    expect(captured).toEqual({ styleTablet: { textAlign: 'center', fontSize: 'sm' } })
  })

  it('writes into props.styleMobile when editingBreakpoint is mobile', () => {
    useBuilderStore.setState({ editingBreakpoint: 'mobile' })
    let captured: Record<string, unknown> | null = null
    const node = makeNode()
    patchNodeStyle(node, props => { captured = props }, { fontSize: 'xs' })
    expect(captured).toEqual({ styleMobile: { fontSize: 'xs' } })
  })

  it('reads editingBreakpoint fresh from the store at call time, not at import time', () => {
    const node = makeNode()
    useBuilderStore.setState({ editingBreakpoint: 'mobile' })
    let captured: Record<string, unknown> | null = null
    patchNodeStyle(node, props => { captured = props }, { fontSize: 'xs' })
    expect(captured).toEqual({ styleMobile: { fontSize: 'xs' } })

    useBuilderStore.setState({ editingBreakpoint: 'desktop' })
    patchNodeStyle(node, props => { captured = props }, { fontSize: 'lg' })
    expect(captured).toEqual({ style: { fontSize: 'lg', textColor: 'neutral-700' } })
  })
})