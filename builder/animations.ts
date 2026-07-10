'use client'

import React, { useEffect, useRef, useState } from 'react'

// ─── Animation data model ───────────────────────────────────────────────────
// Deliberately NOT per-breakpoint (unlike StyleProps) — animation stays the
// same across desktop/tablet/mobile for now. Stored directly at
// node.props.animation, sibling to node.props.style, not inside it.

export type AnimationEffect =
  | 'none'
  | 'fade-in'
  | 'fade-in-up' | 'fade-in-down' | 'fade-in-left' | 'fade-in-right'
  | 'zoom-in' | 'zoom-out'
  | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right'
  | 'bounce-in'
  | 'flip-in'

export interface AnimationProps {
  effect?:   AnimationEffect
  duration?: number   // ms
  delay?:    number   // ms
  easing?:   'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out'
  trigger?:  'onLoad' | 'onScroll'
  once?:     boolean  // only relevant when trigger === 'onScroll'
}

export const DEFAULT_ANIMATION: AnimationProps = {
  effect: 'none', duration: 600, delay: 0, easing: 'ease-out', trigger: 'onScroll', once: true,
}

export const ANIMATION_EFFECTS: { label: string; value: AnimationEffect }[] = [
  { label: '— None —',      value: 'none' },
  { label: 'Fade in',       value: 'fade-in' },
  { label: 'Fade in up',    value: 'fade-in-up' },
  { label: 'Fade in down',  value: 'fade-in-down' },
  { label: 'Fade in left',  value: 'fade-in-left' },
  { label: 'Fade in right', value: 'fade-in-right' },
  { label: 'Zoom in',       value: 'zoom-in' },
  { label: 'Zoom out',      value: 'zoom-out' },
  { label: 'Slide up',      value: 'slide-up' },
  { label: 'Slide down',    value: 'slide-down' },
  { label: 'Slide left',    value: 'slide-left' },
  { label: 'Slide right',   value: 'slide-right' },
  { label: 'Bounce in',     value: 'bounce-in' },
  { label: 'Flip in',       value: 'flip-in' },
]

export const EFFECT_KEYFRAME: Record<AnimationEffect, string | null> = {
  none: null,
  'fade-in':       'pb-fade-in',
  'fade-in-up':    'pb-fade-in-up',
  'fade-in-down':  'pb-fade-in-down',
  'fade-in-left':  'pb-fade-in-left',
  'fade-in-right': 'pb-fade-in-right',
  'zoom-in':       'pb-zoom-in',
  'zoom-out':      'pb-zoom-out',
  'slide-up':      'pb-slide-up',
  'slide-down':    'pb-slide-down',
  'slide-left':    'pb-slide-left',
  'slide-right':   'pb-slide-right',
  'bounce-in':     'pb-bounce-in',
  'flip-in':       'pb-flip-in',
}

// Effects whose keyframes touch opacity — these need opacity:0 up front so
// there's no flash-of-fully-visible-content before the animation plays.
// Pure "slide" effects only move (transform), so they stay fully opaque the
// whole time — hiding them would be wrong (blank gap where content should be).
export const STARTS_HIDDEN = new Set<AnimationEffect>([
  'fade-in', 'fade-in-up', 'fade-in-down', 'fade-in-left', 'fade-in-right',
  'zoom-in', 'zoom-out', 'bounce-in', 'flip-in',
])

// ─── Keyframes (injected once via AnimationStyleSheet) ─────────────────────

export const ANIMATION_KEYFRAMES = `
@keyframes pb-fade-in       { from { opacity: 0 } to { opacity: 1 } }
@keyframes pb-fade-in-up    { from { opacity: 0; transform: translateY(24px) }  to { opacity: 1; transform: translateY(0) } }
@keyframes pb-fade-in-down  { from { opacity: 0; transform: translateY(-24px) } to { opacity: 1; transform: translateY(0) } }
@keyframes pb-fade-in-left  { from { opacity: 0; transform: translateX(24px) }  to { opacity: 1; transform: translateX(0) } }
@keyframes pb-fade-in-right { from { opacity: 0; transform: translateX(-24px) } to { opacity: 1; transform: translateX(0) } }
@keyframes pb-zoom-in       { from { opacity: 0; transform: scale(0.85) }       to { opacity: 1; transform: scale(1) } }
@keyframes pb-zoom-out      { from { opacity: 0; transform: scale(1.15) }       to { opacity: 1; transform: scale(1) } }
@keyframes pb-slide-up      { from { transform: translateY(40px) }  to { transform: translateY(0) } }
@keyframes pb-slide-down    { from { transform: translateY(-40px) } to { transform: translateY(0) } }
@keyframes pb-slide-left    { from { transform: translateX(40px) }  to { transform: translateX(0) } }
@keyframes pb-slide-right   { from { transform: translateX(-40px) } to { transform: translateX(0) } }
@keyframes pb-bounce-in {
  0%   { opacity: 0; transform: scale(0.3) }
  50%  { opacity: 1; transform: scale(1.05) }
  70%  { transform: scale(0.9) }
  100% { transform: scale(1) }
}
@keyframes pb-flip-in {
  from { opacity: 0; transform: perspective(400px) rotateX(90deg) }
  to   { opacity: 1; transform: perspective(400px) rotateX(0) }
}
`

// Plain <style> tag, injected once per Preview mount. Written with
// React.createElement (NOT JSX) so this stays valid in a .ts file — a .ts
// file is never run through the JSX transform, so `<style ...>` syntax here
// would fail to parse ('>' expected / Cannot find name 'dangerouslySetInnerHTML').
// If you'd rather write this as JSX, rename this file to animations.tsx and
// use `<style dangerouslySetInnerHTML={{ __html: ANIMATION_KEYFRAMES }} />`
// instead — either form produces the exact same element.
export function AnimationStyleSheet(): React.ReactElement {
  return React.createElement('style', { dangerouslySetInnerHTML: { __html: ANIMATION_KEYFRAMES } })
}

// ─── Scroll-into-view detection ─────────────────────────────────────────────

function useInView(ref: React.RefObject<Element | null>, once: boolean): boolean {
  const [inView, setInView] = useState(false)
  const hasTriggered = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (once && hasTriggered.current) { setInView(true); return }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          hasTriggered.current = true
          if (once) observer.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [once])

  return inView
}

// ─── Animation props hook ───────────────────────────────────────────────────
// THIS REPLACES THE OLD <AnimatedNode> WRAPPER COMPONENT.
//
// The old approach called React.cloneElement() on `<def.PreviewComponent
// node={node}>` — but that's the component INVOCATION, not the DOM element
// it eventually renders. SectionPreview/TextPreview/etc only ever destructure
// `{ node, children }` from their props, so any `style`/`ref` bolted on from
// outside via cloneElement was silently discarded before it ever reached the
// real <section>/<p>/etc tag. That's why the DOM never changed at all.
//
// The fix: RenderPreviewNode (see Renderer.tsx) calls this hook itself and
// passes the result down as ordinary props (`animationRef`, `animationStyle`
// — see NodeComponentProps in types.ts). Every *Preview component then
// applies them to its OWN root element directly, from the inside, where a
// ref/style assignment can actually reach the real DOM node. There's no way
// around touching every *Preview component for this — nothing external can
// reach "the root DOM node of a function component" any other way, short of
// adding a wrapper <div> (which was deliberately avoided elsewhere in this
// codebase to not break flex sizing).
export function useAnimationProps(
  animation?: AnimationProps
): { ref: React.RefObject<any>; style: React.CSSProperties } {
  const ref = useRef<HTMLElement>(null)
  const effect  = (animation?.effect ?? 'none') as AnimationEffect
  const trigger = animation?.trigger ?? 'onScroll'
  const once    = animation?.once ?? true

  // Hook must run unconditionally regardless of effect — cost is negligible
  // when effect is 'none' since the ref never attaches to anything real
  // that matters (the component using it just won't render any animation
  // style either).
  const inViewScroll = useInView(ref, once)

  if (effect === 'none') return { ref, style: {} }

  const shouldPlay = trigger === 'onLoad' || inViewScroll
  const keyframe   = EFFECT_KEYFRAME[effect]
  const duration   = animation?.duration ?? 600
  const delay      = animation?.delay ?? 0
  const easing     = animation?.easing ?? 'ease-out'

  const style: React.CSSProperties = shouldPlay
    ? {
        animationName:           keyframe ?? undefined,
        animationDuration:       `${duration}ms`,
        animationDelay:          `${delay}ms`,
        animationTimingFunction: easing,
        animationFillMode:       'both',
      }
    : { opacity: STARTS_HIDDEN.has(effect) ? 0 : undefined }

  return { ref, style }
}