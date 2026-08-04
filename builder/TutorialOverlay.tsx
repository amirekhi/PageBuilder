'use client'

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useBuilderStore } from './store'
import { useDirection } from './i18n'
import { useTutorialT } from './tutorialI18n'
import { TUTORIAL_STEPS } from './tutorialSteps'

const HOLE_PADDING = 8
const GAP          = 14
const CARD_WIDTH   = 336

interface Rect { top: number; left: number; width: number; height: number }

function measureTarget(target: string | null): Rect | null {
  if (!target) return null
  const el = document.querySelector(`[data-tutorial="${target}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

export function TutorialOverlay() {
  const step        = useBuilderStore(s => s.tutorialStep)
  const nextStep     = useBuilderStore(s => s.nextTutorialStep)
  const prevStep     = useBuilderStore(s => s.prevTutorialStep)
  const skipTutorial = useBuilderStore(s => s.skipTutorial)
  const finishTutorial = useBuilderStore(s => s.finishTutorial)
  const dir          = useDirection()
  const tt           = useTutorialT()

  const cardRef = useRef<HTMLDivElement>(null)
  const [hole, setHole]           = useState<Rect | null>(null)
  const [cardSize, setCardSize]   = useState({ width: CARD_WIDTH, height: 160 })
  const [viewport, setViewport]   = useState({ w: 1280, h: 800 })

  const active   = step >= 0 && step < TUTORIAL_STEPS.length
  const current  = active ? TUTORIAL_STEPS[step] : null

  // Run this step's setup (e.g. switching ControlPanel tabs) and re-measure
  // its target. Re-runs on every step change. A short timeout (rather than
  // measuring synchronously) gives beforeShow's state change a render pass
  // to actually reach the DOM first — e.g. switching to the Style tab only
  // mounts StyleTab's markup on the NEXT render, so measuring the same tick
  // beforeShow fires would still see the previous tab's layout.
  useEffect(() => {
    if (!current) return
    current.beforeShow?.()
    const el = current.target ? document.querySelector(`[data-tutorial="${current.target}"]`) : null
    el?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    const t1 = setTimeout(() => setHole(measureTarget(current.target)), 60)
    const t2 = setTimeout(() => setHole(measureTarget(current.target)), 260)
    return () => { clearTimeout(t1); clearTimeout(t2) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // Keep the spotlight glued to its target through resizes, scrolling
  // (including inside nested scroll containers — capture:true), and
  // anything else that might move it (the canvas itself animates its own
  // width/scale on breakpoint switches). Cheap poll as a fallback catches
  // whatever the event listeners miss, e.g. a CSS transition mid-flight.
  useEffect(() => {
    if (!active) return
    function reflow() {
      setHole(measureTarget(current?.target ?? null))
      setViewport({ w: window.innerWidth, h: window.innerHeight })
    }
    reflow()
    window.addEventListener('resize', reflow)
    window.addEventListener('scroll', reflow, true)
    const interval = setInterval(reflow, 200)
    return () => {
      window.removeEventListener('resize', reflow)
      window.removeEventListener('scroll', reflow, true)
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step])

useLayoutEffect(() => {
  if (cardRef.current) {
    const r = cardRef.current.getBoundingClientRect()
    setCardSize(prev =>
      prev.width === r.width && prev.height === r.height
        ? prev
        : { width: r.width, height: r.height }
    )
  }
})

  if (!active || !current) return null

  const isCentered = !hole

  function handleNext() {
    if (step >= TUTORIAL_STEPS.length - 1) finishTutorial()
    else nextStep()
  }

  // ── Spotlight hole geometry ──
  let holeBox: Rect | null = null
  if (hole) {
    holeBox = {
      top:    hole.top - HOLE_PADDING,
      left:   hole.left - HOLE_PADDING,
      width:  hole.width + HOLE_PADDING * 2,
      height: hole.height + HOLE_PADDING * 2,
    }
  }

  // ── Card position ──
  let cardStyle: React.CSSProperties
  if (isCentered || !holeBox) {
    cardStyle = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  } else {
    const placement = current.placement === 'center' ? 'bottom' : current.placement
    let top = 0
    let left = 0
    const holeCenterY = holeBox.top + holeBox.height / 2
    const holeCenterX = holeBox.left + holeBox.width / 2

    const roomBelow = viewport.h - (holeBox.top + holeBox.height)
    const roomAbove = holeBox.top
    const roomRight = viewport.w - (holeBox.left + holeBox.width)
    const roomLeft  = holeBox.left

    let side = placement
    if (side === 'bottom' && roomBelow < cardSize.height + GAP && roomAbove > roomBelow) side = 'top'
    if (side === 'top' && roomAbove < cardSize.height + GAP && roomBelow > roomAbove) side = 'bottom'
    if (side === 'right' && roomRight < cardSize.width + GAP && roomLeft > roomRight) side = 'left'
    if (side === 'left' && roomLeft < cardSize.width + GAP && roomRight > roomLeft) side = 'right'

    if (side === 'bottom') {
      top  = holeBox.top + holeBox.height + GAP
      left = holeCenterX - cardSize.width / 2
    } else if (side === 'top') {
      top  = holeBox.top - GAP - cardSize.height
      left = holeCenterX - cardSize.width / 2
    } else if (side === 'right') {
      top  = holeCenterY - cardSize.height / 2
      left = holeBox.left + holeBox.width + GAP
    } else {
      top  = holeCenterY - cardSize.height / 2
      left = holeBox.left - GAP - cardSize.width
    }

    left = Math.min(Math.max(left, 8), viewport.w - cardSize.width - 8)
    top  = Math.min(Math.max(top, 8), viewport.h - cardSize.height - 8)

    cardStyle = { position: 'fixed', top, left }
  }

  const dimColor = 'rgba(15,15,20,0.62)'

  return (
    <div className="fixed inset-0 z-[100000]" aria-live="polite">
      {holeBox ? (
        <>
          {/* Four dimmed bars tiling the viewport around the hole — each
              blocks pointer events, so only the spotlighted element (and
              the tooltip card) stay interactive during the tour. */}
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: Math.max(holeBox.top, 0), background: dimColor, transition: 'height 150ms ease' }} />
          <div style={{ position: 'fixed', top: holeBox.top + holeBox.height, left: 0, right: 0, bottom: 0, background: dimColor, transition: 'top 150ms ease' }} />
          <div style={{ position: 'fixed', top: holeBox.top, left: 0, width: Math.max(holeBox.left, 0), height: holeBox.height, background: dimColor, transition: 'all 150ms ease' }} />
          <div style={{ position: 'fixed', top: holeBox.top, left: holeBox.left + holeBox.width, right: 0, height: holeBox.height, background: dimColor, transition: 'all 150ms ease' }} />
          {/* Highlight ring */}
          <div
            style={{
              position: 'fixed', top: holeBox.top, left: holeBox.left,
              width: holeBox.width, height: holeBox.height,
              borderRadius: 10, pointerEvents: 'none',
              boxShadow: '0 0 0 2px #7c3aed, 0 0 0 5px rgba(124,58,237,0.25), 0 4px 20px rgba(124,58,237,0.35)',
              transition: 'all 150ms ease',
            }}
          />
        </>
      ) : (
        <div className="fixed inset-0" style={{ background: dimColor }} />
      )}

      <div
        ref={cardRef}
        dir={dir}
        style={{ ...cardStyle, width: CARD_WIDTH }}
        className="rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden"
      >
        <div className="p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-500 mb-1.5">
            {tt('stepCount', step + 1, TUTORIAL_STEPS.length)}
          </p>
          <p className="text-base font-semibold text-neutral-800 leading-snug">
            {tt(current.titleKey)}
          </p>
          <p className="text-sm text-neutral-500 leading-relaxed mt-2">
            {tt(current.bodyKey)}
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-5 pb-3">
          {TUTORIAL_STEPS.map((s, i) => (
            <span
              key={s.id}
              className={[
                'h-1.5 rounded-full transition-all',
                i === step ? 'w-4 bg-violet-600' : 'w-1.5 bg-neutral-200',
              ].join(' ')}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-neutral-100 bg-neutral-50">
          <button
            type="button"
            onClick={skipTutorial}
            className="text-xs font-medium text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            {tt('skip')}
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                {tt('back')}
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors"
            >
              {step >= TUTORIAL_STEPS.length - 1 ? tt('finish') : tt('next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}