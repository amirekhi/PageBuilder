'use client'

import { StyleProps } from './styleMapper'
import { useBuilderStore, PreviewWidth } from './store'
import { PageNode } from './types'

// Alias kept for readability in this file's own code — but it IS
// PreviewWidth, not a separate type. Reusing the same declared type
// everywhere avoids the "two structurally-identical-but-distinct types"
// class of indexing errors.
export type Breakpoint = PreviewWidth

// Cascades desktop → tablet → mobile, same mental model as a min-width media
// query stack: each breakpoint only needs to specify what's DIFFERENT from
// the one above it. Anything not overridden falls through automatically.
export function resolveStyleForBreakpoint(node: PageNode, breakpoint: Breakpoint): StyleProps {
  const base   = (node.props.style as StyleProps) ?? {}
  const tablet = (node.props.styleTablet as Partial<StyleProps>) ?? {}
  const mobile = (node.props.styleMobile as Partial<StyleProps>) ?? {}

  if (breakpoint === 'desktop') return base
  if (breakpoint === 'tablet')  return { ...base, ...tablet }
  return { ...base, ...tablet, ...mobile }
}

// The one hook every Editor/Preview component and every panel uses instead
// of reading node.props.style directly. Reactive — re-renders when the
// relevant breakpoint changes.
//
// IMPORTANT: which breakpoint counts as "active" depends on mode:
//   - In edit mode, the user is authoring styles for `editingBreakpoint`
//     (set via the Desktop/Tablet/Mobile switcher next to Edit/Preview).
//   - In preview mode, the user is looking at a specific rendered width via
//     `previewWidth` (the switcher inside Preview mode) — this can be
//     changed freely without leaving Preview, and previewWidth and
//     editingBreakpoint are NOT kept in lockstep once you're already inside
//     Preview (only synced once, at the moment you switch into it — see
//     TopBar's handleSetMode). If this hook always read editingBreakpoint,
//     clicking Mobile inside Preview would resize the canvas but keep
//     resolving desktop/whatever-was-last-edited styles — which is exactly
//     the bug this fixes.
//
// Accepts `node: PageNode | null` so panels that may or may not have a
// selected node (e.g. ControlPanel's StyleTab) can call this hook
// unconditionally before any early return, keeping the hook call itself
// unconditional per the rules of hooks.
export function useNodeStyle(node: PageNode | null): StyleProps {
  const mode              = useBuilderStore(s => s.mode)
  const editingBreakpoint = useBuilderStore(s => s.editingBreakpoint)
  const previewWidth      = useBuilderStore(s => s.previewWidth)
  const activeBreakpoint  = mode === 'preview' ? previewWidth : editingBreakpoint

  if (!node) return {}
  return resolveStyleForBreakpoint(node, activeBreakpoint)
}

// Writes a style patch into whichever breakpoint bucket is currently being
// EDITED (always editingBreakpoint, regardless of mode — there's no such
// thing as "writing" while in read-only Preview mode; the edit panels that
// call this are only ever rendered in edit mode anyway).
export function patchNodeStyle(
  node: PageNode,
  onChange: (props: Record<string, unknown>) => void,
  partial: Partial<StyleProps>,
) {
  const breakpoint = useBuilderStore.getState().editingBreakpoint

  if (breakpoint === 'desktop') {
    const current = (node.props.style as StyleProps) ?? {}
    onChange({ style: { ...current, ...partial } })
    return
  }
  if (breakpoint === 'tablet') {
    const current = (node.props.styleTablet as Partial<StyleProps>) ?? {}
    onChange({ styleTablet: { ...current, ...partial } })
    return
  }
  const current = (node.props.styleMobile as Partial<StyleProps>) ?? {}
  onChange({ styleMobile: { ...current, ...partial } })
}

// Lets a user clear all overrides for one node at the current breakpoint,
// falling back to whatever the breakpoint above it resolves to.
export function clearNodeStyleOverride(
  node: PageNode,
  onChange: (props: Record<string, unknown>) => void,
  breakpoint: Breakpoint,
) {
  if (breakpoint === 'tablet') onChange({ styleTablet: {} })
  if (breakpoint === 'mobile') onChange({ styleMobile: {} })
}

// Does this node have ANY override set at the given breakpoint? Used to
// show a visual indicator in the panel ("this differs from desktop").
export function hasOverrideAt(node: PageNode, breakpoint: Breakpoint): boolean {
  if (breakpoint === 'tablet') return Object.keys((node.props.styleTablet as object) ?? {}).length > 0
  if (breakpoint === 'mobile') return Object.keys((node.props.styleMobile as object) ?? {}).length > 0
  return false
}