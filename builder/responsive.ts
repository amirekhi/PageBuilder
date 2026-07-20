'use client'

import { StyleProps } from './styleMapper'
import { useBuilderStore, PreviewWidth } from './store'
import { PageNode } from './types'
import { AnimationProps } from './animations'

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

// Removes any key whose value is `undefined` from an object. NOT the same
// as simply never writing that key — the bug this fixes is that plain
// object spread (`{ ...current, ...partial }`) keeps an explicit
// `key: undefined` as an OWN, ENUMERABLE property. resolveStyleForBreakpoint's
// cascade (`{ ...base, ...tablet }`) then sees tablet genuinely HAS a
// `bgColor` property of its own and copies that (undefined) over the base
// value — even though the intent of clearing a field at Tablet/Mobile is
// "stop overriding, fall back to whatever Desktop/the breakpoint above
// resolves to," not "force this specific property to nothing here."
// Pruning after every merge is what actually makes a cleared field fall
// through the cascade instead of silently blanking it at that breakpoint.
function pruneUndefined<T extends object>(obj: T): T {
  const next = { ...obj }
  for (const key in next) {
    if (next[key] === undefined) delete next[key]
  }
  return next
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
//
// Every branch prunes undefined keys out of the merged result before
// writing it back (see pruneUndefined above) — this is what makes
// "clearing" a field at Tablet/Mobile actually fall back to the breakpoint
// above it, instead of leaving a stray `key: undefined` that permanently
// masks the parent value in the cascade. Desktop is pruned too for the
// same reason hasOverrideAt below wants clean objects: harmless there
// (there's no further parent to fall back to) but keeps every breakpoint's
// stored props free of dead keys.
export function patchNodeStyle(
  node: PageNode,
  onChange: (props: Record<string, unknown>) => void,
  partial: Partial<StyleProps>,
) {
  const breakpoint = useBuilderStore.getState().editingBreakpoint

  if (breakpoint === 'desktop') {
    const current = (node.props.style as StyleProps) ?? {}
    onChange({ style: pruneUndefined({ ...current, ...partial }) })
    return
  }
  if (breakpoint === 'tablet') {
    const current = (node.props.styleTablet as Partial<StyleProps>) ?? {}
    onChange({ styleTablet: pruneUndefined({ ...current, ...partial }) })
    return
  }
  const current = (node.props.styleMobile as Partial<StyleProps>) ?? {}
  onChange({ styleMobile: pruneUndefined({ ...current, ...partial }) })
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
// show a visual indicator in the panel ("this differs from desktop"). Now
// reliable now that patchNodeStyle prunes undefined keys — before that fix,
// a field the user had cleared (rather than genuinely never touched) still
// left a key behind and made this incorrectly report an override.
export function hasOverrideAt(node: PageNode, breakpoint: Breakpoint): boolean {
  if (breakpoint === 'tablet') return Object.keys((node.props.styleTablet as object) ?? {}).length > 0
  if (breakpoint === 'mobile') return Object.keys((node.props.styleMobile as object) ?? {}).length > 0
  return false
}

// ─── Animation — same cascade pattern as style/styleTablet/styleMobile ────
// node.props.animation is the Desktop base; animationTablet/animationMobile
// are partial overrides layered on top the exact same way tablet/mobile
// style overrides are. Kept as separate functions (rather than making
// resolveStyleForBreakpoint/patchNodeStyle generic over both) because the
// two live at different places in props — style/styleTablet/styleMobile are
// StyleProps, animation/animationTablet/animationMobile are AnimationProps
// — and keeping them as parallel, independently-readable functions matches
// how every call site already treats them as two unrelated concerns.

export function resolveAnimationForBreakpoint(node: PageNode, breakpoint: Breakpoint): AnimationProps {
  const base   = (node.props.animation as AnimationProps) ?? {}
  const tablet = (node.props.animationTablet as Partial<AnimationProps>) ?? {}
  const mobile = (node.props.animationMobile as Partial<AnimationProps>) ?? {}

  if (breakpoint === 'desktop') return base
  if (breakpoint === 'tablet')  return { ...base, ...tablet }
  return { ...base, ...tablet, ...mobile }
}

// Same mode-aware breakpoint selection as useNodeStyle (edit mode reads
// editingBreakpoint; preview mode reads previewWidth) — see the comment on
// useNodeStyle above for why these can diverge inside Preview.
export function useNodeAnimation(node: PageNode | null): AnimationProps {
  const mode              = useBuilderStore(s => s.mode)
  const editingBreakpoint = useBuilderStore(s => s.editingBreakpoint)
  const previewWidth      = useBuilderStore(s => s.previewWidth)
  const activeBreakpoint  = mode === 'preview' ? previewWidth : editingBreakpoint

  if (!node) return {}
  return resolveAnimationForBreakpoint(node, activeBreakpoint)
}

// Writes into whichever breakpoint bucket is currently being EDITED, same
// as patchNodeStyle — and prunes undefined keys for the exact same reason
// (see pruneUndefined above): without it, clearing an animation field back
// to "unset" at Tablet/Mobile would leave a tombstone that masks the
// Desktop value forever instead of actually falling back to it.
export function patchNodeAnimation(
  node: PageNode,
  onChange: (props: Record<string, unknown>) => void,
  partial: Partial<AnimationProps>,
) {
  const breakpoint = useBuilderStore.getState().editingBreakpoint

  if (breakpoint === 'desktop') {
    const current = (node.props.animation as AnimationProps) ?? {}
    onChange({ animation: pruneUndefined({ ...current, ...partial }) })
    return
  }
  if (breakpoint === 'tablet') {
    const current = (node.props.animationTablet as Partial<AnimationProps>) ?? {}
    onChange({ animationTablet: pruneUndefined({ ...current, ...partial }) })
    return
  }
  const current = (node.props.animationMobile as Partial<AnimationProps>) ?? {}
  onChange({ animationMobile: pruneUndefined({ ...current, ...partial }) })
}

export function clearNodeAnimationOverride(
  node: PageNode,
  onChange: (props: Record<string, unknown>) => void,
  breakpoint: Breakpoint,
) {
  if (breakpoint === 'tablet') onChange({ animationTablet: {} })
  if (breakpoint === 'mobile') onChange({ animationMobile: {} })
}

export function hasAnimationOverrideAt(node: PageNode, breakpoint: Breakpoint): boolean {
  if (breakpoint === 'tablet') return Object.keys((node.props.animationTablet as object) ?? {}).length > 0
  if (breakpoint === 'mobile') return Object.keys((node.props.animationMobile as object) ?? {}).length > 0
  return false
}