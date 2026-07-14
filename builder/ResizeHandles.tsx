'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { PageNode, NodeType } from './types'
import { StyleProps } from './styleMapper'
import { useBuilderStore } from './store'
import { NODE_REGISTRY } from './registry'
import { patchNodeStyle } from './responsive'

// ─── Sizing modes ───────────────────────────────────────────────────────────
type Edge = 'right' | 'bottom' | 'corner'
type SizeMode = 'full' | 'heightOnly' | 'diameter' | 'widthOnly'

// text/heading used to be pinned to 'widthOnly' here — that was the
// deliberate-but-mistaken restriction that made their height unresizable
// (only the right-edge width handle rendered; no bottom edge, no corner).
// Removing them lets `mode = SIZE_MODE[node.type] ?? 'full'` below fall
// through to 'full' for both, same as most other leaf node types — which
// renders all three handles (right/width, bottom/height, corner/both).
// Text/Heading aren't containers (isContainer is false for both in
// registry.ts), so the bottom/corner branch in onUp below sets
// `patch.height` directly (a literal pixel height), not `minHeight` — same
// as any other non-container leaf node (Button, Badge, etc would behave
// identically if they ever needed a fixed height).
const SIZE_MODE: Partial<Record<NodeType, SizeMode>> = {
  spacer: 'heightOnly',
  avatar: 'diameter',
}

const GENERAL_MIN   = 40
const SPACER_MIN    = 4
const SPACER_MAX    = 400
const AVATAR_MIN    = 24
const AVATAR_MAX    = 200
const WIDTH_PCT_MIN = 5 // never let a width drag collapse below 5% of its container

interface DragState {
  edge:        Edge
  startX:      number
  startY:      number
  startW:      number
  startH:      number
  // Logical (unscaled) width of this node's immediate DOM parent, captured
  // ONCE at drag start. This is the number a width drag gets converted
  // into a percentage OF — e.g. dragging to 300px inside a 600px-wide
  // parent stores 50%, which then means "50% of whatever parent this ends
  // up in" everywhere the node is rendered, including a much wider Preview
  // canvas. This is the entire mechanism that makes editor-canvas-width and
  // final-page-width independent of each other.
  parentWidth: number
}

function clamp(v: number, min: number, max?: number): number {
  const withMin = Math.max(min, v)
  return max !== undefined ? Math.min(max, withMin) : withMin
}

export function ResizeHandles({
  node, shellRef,
}: {
  node:     PageNode
  shellRef: React.RefObject<HTMLDivElement | null>
}) {
  const updateProps = useBuilderStore(s => s.updateProps)
  const setResizing = useBuilderStore(s => s.setResizing)
  const canvasScale  = useBuilderStore(s => s.canvasScale)

  const mode        = SIZE_MODE[node.type] ?? 'full'
  const isCircle    = mode === 'diameter'
  const isContainer = NODE_REGISTRY[node.type]?.isContainer ?? false

  const [drag, setDrag] = useState<DragState | null>(null)
  const [live, setLive] = useState<{ w: number; h: number } | null>(null)

  const dragRef  = useRef<DragState | null>(null)
  const liveRef  = useRef<{ w: number; h: number } | null>(null)
  const scaleRef = useRef(1)

  const getStartSize = useCallback((): { w: number; h: number } => {
    if (mode === 'diameter') {
      const d = (node.props.size as number) ?? 56
      return { w: d, h: d }
    }
    if (mode === 'heightOnly') {
      const h = (node.props.height as number) ?? 40
      return { w: 0, h }
    }
    const rect  = shellRef.current?.getBoundingClientRect()
    const scale = canvasScale || 1
    return { w: (rect?.width ?? 200) / scale, h: (rect?.height ?? 100) / scale }
  }, [mode, node.props.size, node.props.height, shellRef, canvasScale])

  // Measures the logical (unscaled) width of shellRef's actual DOM parent —
  // this is the real container the percentage will be computed against.
  // getBoundingClientRect reports the visually-scaled size whenever the
  // canvas is currently shown shrunk down, so we divide that back out by
  // canvasScale to recover the true underlying CSS width.
  const getParentLogicalWidth = useCallback((): number => {
    const parentEl = shellRef.current?.parentElement
    if (!parentEl) return 0
    const rect  = parentEl.getBoundingClientRect()
    const scale = canvasScale || 1
    return rect.width / scale
  }, [shellRef, canvasScale])

  const startDrag = useCallback((edge: Edge) => (e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const { w, h } = getStartSize()
    scaleRef.current = canvasScale || 1
    const parentWidth = getParentLogicalWidth()
    const state: DragState = { edge, startX: e.clientX, startY: e.clientY, startW: w, startH: h, parentWidth }
    dragRef.current = state
    liveRef.current = { w, h }
    setDrag(state)
    setLive({ w, h })
    setResizing(node.id)
  }, [getStartSize, getParentLogicalWidth, node.id, setResizing, canvasScale])

  useEffect(() => {
    if (!drag) return

    function onMove(e: PointerEvent) {
      const d = dragRef.current
      if (!d) return
      const scale = scaleRef.current
      const dx = (e.clientX - d.startX) / scale
      const dy = (e.clientY - d.startY) / scale

      let nextW = d.startW
      let nextH = d.startH

      if (mode === 'diameter') {
        const delta = Math.round((dx + dy) / 2)
        const size  = clamp(d.startW + delta, AVATAR_MIN, AVATAR_MAX)
        nextW = size
        nextH = size
      } else if (mode === 'heightOnly') {
        nextH = clamp(Math.round(d.startH + dy), SPACER_MIN, SPACER_MAX)
      } else {
        if (d.edge === 'right'  || d.edge === 'corner') nextW = clamp(Math.round(d.startW + dx), GENERAL_MIN)
        if (d.edge === 'bottom' || d.edge === 'corner') nextH = clamp(Math.round(d.startH + dy), GENERAL_MIN)
      }

      const next = { w: nextW, h: nextH }
      liveRef.current = next
      setLive(next)
    }

    function onUp() {
      const d = dragRef.current
      const l = liveRef.current
      dragRef.current = null
      liveRef.current = null
      setDrag(null)
      setLive(null)
      setResizing(null)
      if (!d || !l) return

      if (mode === 'diameter') {
        updateProps(node.id, { size: l.w })
        return
      }
      if (mode === 'heightOnly') {
        updateProps(node.id, { height: l.h })
        return
      }

      const patch: Partial<StyleProps> = {}

      if (d.edge === 'right' || d.edge === 'corner') {
        if (d.parentWidth > 0) {
          const pct = clamp(Math.round((l.w / d.parentWidth) * 1000) / 10, WIDTH_PCT_MIN, 100)
          patch.width     = pct
          patch.widthUnit = '%'
        } else {
          // Couldn't measure a parent — fall back to absolute px rather
          // than silently discarding the resize.
          patch.width     = l.w
          patch.widthUnit = 'px'
        }
      }

      if (d.edge === 'bottom' || d.edge === 'corner') {
        if (isContainer) {
          patch.minHeight = l.h
          patch.height = undefined
        } else {
          patch.height = l.h
        }
      }

      patchNodeStyle(node, (props) => updateProps(node.id, props), patch)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, mode, node.id, isContainer, updateProps, setResizing])

  const widthPct = drag && live && drag.parentWidth > 0
    ? Math.round((live.w / drag.parentWidth) * 100)
    : null
  const widthLabel = live
    ? (widthPct !== null ? `${live.w}px (${widthPct}%)` : `${live.w}px`)
    : ''

  return (
    <>
      {/* Live size guide + pixel readout while dragging */}
      {live && (
        <>
          <div
            style={{
              position:      'absolute',
              top:           0,
              left:          0,
              width:         mode === 'heightOnly' ? '100%' : live.w,
              height:        live.h,
              border:        '1.5px dashed #7c3aed',
              background:    'rgba(124,58,237,0.06)',
              borderRadius:  isCircle ? '50%' : 0,
              pointerEvents: 'none',
              zIndex:        999,
              boxSizing:     'border-box',
            }}
          />
          <div
            style={{
              position:      'absolute',
              top:           live.h + 6,
              left:          0,
              background:    '#18181b',
              color:         'white',
              fontSize:      11,
              fontFamily:    'monospace',
              padding:       '3px 7px',
              borderRadius:  4,
              pointerEvents: 'none',
              zIndex:        1001,
              whiteSpace:    'nowrap',
            }}
          >
            {mode === 'heightOnly'
              ? `${live.h}px`
              : mode === 'diameter'
                ? `${live.w}px`
                : mode === 'widthOnly'
                  ? widthLabel
                  : `${widthLabel} × ${live.h}px`}
          </div>
        </>
      )}

      {/* Right edge — width */}
      {(mode === 'full' || mode === 'widthOnly') && (
        <div
          onPointerDown={startDrag('right')}
          onClick={e => e.stopPropagation()}
          title="Drag to resize width"
          style={{ position: 'absolute', top: 0, right: -4, width: 8, height: '100%', cursor: 'ew-resize', zIndex: 1000 }}
        />
      )}

      {/* Bottom edge — height */}
      {(mode === 'full' || mode === 'heightOnly') && (
        <div
          onPointerDown={startDrag('bottom')}
          onClick={e => e.stopPropagation()}
          title="Drag to resize height"
          style={{ position: 'absolute', bottom: -4, left: 0, height: 8, width: '100%', cursor: 'ns-resize', zIndex: 1000 }}
        />
      )}

      {/* Corner — both dimensions (or diameter) */}
      {(mode === 'full' || mode === 'diameter') && (
        <div
          onPointerDown={startDrag('corner')}
          onClick={e => e.stopPropagation()}
          title={mode === 'diameter' ? 'Drag to resize' : 'Drag to resize both'}
          style={{
            position:     'absolute',
            bottom:       -5,
            right:        -5,
            width:        11,
            height:       11,
            borderRadius: isCircle ? '50%' : 3,
            background:   '#7c3aed',
            border:       '2px solid white',
            boxShadow:    '0 1px 3px rgba(0,0,0,0.3)',
            cursor:       'nwse-resize',
            zIndex:       1001,
          }}
        />
      )}
    </>
  )
}