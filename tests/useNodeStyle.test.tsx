// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNodeStyle } from '../builder/responsive'
import { useBuilderStore } from '../builder/store'
import { PageNode } from '../builder/types'

function makeNode(overrides: Partial<PageNode['props']> = {}): PageNode {
  return {
    id: 'n1', type: 'text', parentId: null, children: [],
    props: { style: { fontSize: 'base' }, ...overrides },
  }
}

beforeEach(() => {
  useBuilderStore.setState({ mode: 'edit', editingBreakpoint: 'desktop', previewWidth: 'desktop' })
})

describe('useNodeStyle', () => {
  it('returns {} for a null node without throwing (unconditional hook call support)', () => {
    const { result } = renderHook(() => useNodeStyle(null))
    expect(result.current).toEqual({})
  })

  it('in edit mode, resolves against editingBreakpoint', () => {
    const node = makeNode({ styleTablet: { fontSize: 'sm' } })
    useBuilderStore.setState({ mode: 'edit', editingBreakpoint: 'tablet' })
    const { result } = renderHook(() => useNodeStyle(node))
    expect(result.current.fontSize).toBe('sm')
  })

  it('in preview mode, resolves against previewWidth instead of editingBreakpoint', () => {
    const node = makeNode({ styleMobile: { fontSize: 'xs' } })
    useBuilderStore.setState({ mode: 'preview', editingBreakpoint: 'desktop', previewWidth: 'mobile' })
    const { result } = renderHook(() => useNodeStyle(node))
    expect(result.current.fontSize).toBe('xs')
  })

  it('re-renders with updated style when previewWidth changes while already in preview mode', () => {
    const node = makeNode({ styleTablet: { fontSize: 'sm' }, styleMobile: { fontSize: 'xs' } })
    useBuilderStore.setState({ mode: 'preview', previewWidth: 'tablet' })
    const { result } = renderHook(() => useNodeStyle(node))
    expect(result.current.fontSize).toBe('sm')

    act(() => { useBuilderStore.setState({ previewWidth: 'mobile' }) })
    expect(result.current.fontSize).toBe('xs')
  })
})