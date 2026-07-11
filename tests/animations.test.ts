// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  EFFECT_KEYFRAME, STARTS_HIDDEN, ANIMATION_EFFECTS, DEFAULT_ANIMATION, useAnimationProps,
} from '../builder/animations'

describe('EFFECT_KEYFRAME / STARTS_HIDDEN data integrity', () => {
  it('every effect listed in ANIMATION_EFFECTS has a keyframe entry (or null for "none")', () => {
    ANIMATION_EFFECTS.forEach(({ value }) => {
      expect(EFFECT_KEYFRAME).toHaveProperty(value)
    })
    expect(EFFECT_KEYFRAME.none).toBeNull()
  })

  it('every non-none effect has a real keyframe name', () => {
    ANIMATION_EFFECTS.filter(e => e.value !== 'none').forEach(({ value }) => {
      expect(EFFECT_KEYFRAME[value]).toMatch(/^pb-/)
    })
  })

  it('pure "slide" effects do NOT start hidden (they only move, never fade)', () => {
    ;['slide-up', 'slide-down', 'slide-left', 'slide-right'].forEach(effect => {
      expect(STARTS_HIDDEN.has(effect as any)).toBe(false)
    })
  })

  it('fade/zoom/bounce/flip effects DO start hidden', () => {
    ;['fade-in', 'zoom-in', 'zoom-out', 'bounce-in', 'flip-in'].forEach(effect => {
      expect(STARTS_HIDDEN.has(effect as any)).toBe(true)
    })
  })
})

describe('DEFAULT_ANIMATION', () => {
  it('defaults to no effect, onScroll trigger, played once', () => {
    expect(DEFAULT_ANIMATION.effect).toBe('none')
    expect(DEFAULT_ANIMATION.trigger).toBe('onScroll')
    expect(DEFAULT_ANIMATION.once).toBe(true)
  })
})

// jsdom has no real IntersectionObserver — this stub supplies just enough
// of the browser API surface for useInView to run. It's not mocking your
// application code; it's the same polyfill jsdom itself would need in a
// real browser test runner.
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = []
  callback: IntersectionObserverCallback
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    FakeIntersectionObserver.instances.push(this)
  }
  observe() {}
  disconnect() {}
  unobserve() {}
  trigger(isIntersecting: boolean) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as any)
  }
}

beforeAll(() => {
  // @ts-expect-error jsdom doesn't ship this
  global.IntersectionObserver = FakeIntersectionObserver
})

describe('useAnimationProps', () => {
  it('effect "none" returns an empty style object', () => {
    const { result } = renderHook(() => useAnimationProps({ effect: 'none' }))
    expect(result.current.style).toEqual({})
  })

  it('onLoad trigger plays immediately without waiting for intersection', () => {
    const { result } = renderHook(() => useAnimationProps({ effect: 'fade-in', trigger: 'onLoad' }))
    expect(result.current.style.animationName).toBe('pb-fade-in')
  })

  it('onScroll trigger starts hidden (opacity 0) before intersecting', () => {
    const { result } = renderHook(() => useAnimationProps({ effect: 'fade-in', trigger: 'onScroll' }))
    expect(result.current.style.opacity).toBe(0)
    expect(result.current.style.animationName).toBeUndefined()
  })

  it('a pure slide effect on onScroll does NOT set opacity:0 before intersecting (no fade component to hide)', () => {
    const { result } = renderHook(() => useAnimationProps({ effect: 'slide-up', trigger: 'onScroll' }))
    expect(result.current.style.opacity).toBeUndefined()
  })

  it('applies the requested duration/delay/easing once playing', () => {
    const { result } = renderHook(() =>
      useAnimationProps({ effect: 'zoom-in', trigger: 'onLoad', duration: 1200, delay: 300, easing: 'ease-in' })
    )
    expect(result.current.style.animationDuration).toBe('1200ms')
    expect(result.current.style.animationDelay).toBe('300ms')
    expect(result.current.style.animationTimingFunction).toBe('ease-in')
  })
})