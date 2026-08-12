'use client'

import { PageNode } from './types'
import { useBuilderStore } from './store'
import type { Breakpoint } from './responsive'

// ─── Rich-text responsive content ──────────────────────────────────────────
// Mirrors the style/animation cascade pattern in responsive.ts, but for
// Tiptap's rich-text `content` prop (used by Text and Heading — see
// richText.ts's useRichTextEdit), with one structural difference:
//
// Style/animation overrides are shallow OBJECTS that get shallow-merged on
// top of each other — a Tablet override of just `{fontSize:'lg'}` still
// inherits everything else from Desktop for free. Rich-text content is a
// single opaque HTML STRING with formatting baked into inline styles on
// nested <span> marks. There is no meaningful way to "merge" two HTML
// trees field-by-field, so a breakpoint override here is a full
// REPLACEMENT of the whole string, never a partial patch.
//
// THIS IS THE ACTUAL FIX for the bug where changing font size while
// viewing Mobile silently changed Desktop too: before this file existed,
// there was only ONE copy of `content` ever, full stop — every breakpoint
// read and wrote the exact same string, so there was no way for them to
// diverge no matter which editingBreakpoint was active when you edited.
//
// Now:
//   - node.props[prop]         — Desktop's own copy (the base/fallback).
//   - node.props[`${prop}Tablet`] — OPTIONAL full snapshot for Tablet.
//   - node.props[`${prop}Mobile`] — OPTIONAL full snapshot for Mobile.
// "Unset" means the KEY IS ABSENT (or explicitly `undefined`), not merely
// an empty string — an empty string is a legitimate override (a Heading
// deliberately left blank on Mobile), so it must not be treated the same
// as "no override, fall back to Desktop". This is why every check below is
// `!== undefined`, never a truthiness check.

export function resolveContentForBreakpoint(node: PageNode, prop: string, breakpoint: Breakpoint): string {
  const base   = (node.props[prop] as string) ?? ''
  const tablet = node.props[`${prop}Tablet`] as string | undefined
  const mobile = node.props[`${prop}Mobile`] as string | undefined

  if (breakpoint === 'desktop') return base
  if (breakpoint === 'tablet')  return tablet !== undefined ? tablet : base
  // Mobile cascades through Tablet then Desktop — same fallback order the
  // style/animation cascade already uses.
  if (mobile !== undefined) return mobile
  if (tablet !== undefined) return tablet
  return base
}

// Mode-aware the same way useNodeStyle/useNodeAnimation are (responsive.ts):
// edit mode resolves against editingBreakpoint, preview mode against
// previewWidth, and the two are NOT kept in lockstep once inside Preview
// (see the doc comment on useNodeStyle for the full reasoning). In
// practice the 'edit' branch is what matters for Text/HeadingEditor (the
// only components that ever call useRichTextEdit — they never render while
// mode is 'preview' at all), while Text/HeadingPreview rely on the
// 'preview' branch.
export function useNodeContent(node: PageNode | null, prop: string): string {
  const mode              = useBuilderStore(s => s.mode)
  const editingBreakpoint = useBuilderStore(s => s.editingBreakpoint)
  const previewWidth      = useBuilderStore(s => s.previewWidth)
  const activeBreakpoint  = mode === 'preview' ? previewWidth : editingBreakpoint

  if (!node) return ''
  return resolveContentForBreakpoint(node, prop, activeBreakpoint)
}

// Writes a FULL replacement HTML string into whichever breakpoint bucket is
// currently being EDITED — always editingBreakpoint, same as
// patchNodeStyle/patchNodeAnimation (there's no such thing as "editing"
// while in read-only Preview mode; every caller of this — useRichTextEdit's
// own commit, and TextPanel/HeadingPanel's plain textarea/input fallback —
// only ever runs in edit mode anyway). Reads editingBreakpoint directly off
// the store rather than taking it as a hook value, same reasoning
// patchNodeStyle already uses: this is called from event handlers, not
// render, so there's nothing to subscribe to here.
export function commitContentForBreakpoint(
  node: PageNode,
  prop: string,
  onChange: (props: Record<string, unknown>) => void,
  html: string,
) {
  const breakpoint = useBuilderStore.getState().editingBreakpoint
  if (breakpoint === 'desktop') { onChange({ [prop]: html }); return }
  if (breakpoint === 'tablet')  { onChange({ [`${prop}Tablet`]: html }); return }
  onChange({ [`${prop}Mobile`]: html })
}

// Lets the user clear the override at a given breakpoint, falling back to
// whatever the breakpoint above it resolves to — same shape as
// clearNodeStyleOverride/clearNodeAnimationOverride in responsive.ts.
export function clearContentOverride(
  node: PageNode,
  prop: string,
  onChange: (props: Record<string, unknown>) => void,
  breakpoint: Breakpoint,
) {
  if (breakpoint === 'tablet') onChange({ [`${prop}Tablet`]: undefined })
  if (breakpoint === 'mobile') onChange({ [`${prop}Mobile`]: undefined })
}

// Does this node have an EXPLICIT override at the given breakpoint? Used to
// show the "differs from Desktop" pill in RichTextToolbar and the plain
// textarea/input fallback in TextPanel/HeadingPanel — same shape as
// hasOverrideAt/hasAnimationOverrideAt.
export function hasContentOverrideAt(node: PageNode, prop: string, breakpoint: Breakpoint): boolean {
  if (breakpoint === 'tablet') return node.props[`${prop}Tablet`] !== undefined
  if (breakpoint === 'mobile') return node.props[`${prop}Mobile`] !== undefined
  return false
}