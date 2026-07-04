'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { PageNode, NodeType } from './types'
import { StyleProps } from './styleMapper'
import { useBuilderStore } from './store'
import { NODE_REGISTRY } from './registry'

// ─── Sizing modes ───────────────────────────────────────────────────────────
type Edge = 'right' | 'bottom' | 'corner'
type SizeMode = 'full' | 'heightOnly' | 'diameter' | 'widthOnly'

const SIZE_MODE: Partial<Record<NodeType, SizeMode>> = {
  spacer: 'heightOnly',
  avatar: 'diameter',
  text:    'widthOnly',
  heading: 'widthOnly',
}

const GENERAL_MIN = 40
const SPACER_MIN  = 4
const SPACER_MAX  = 400
const AVATAR_MIN  = 24
const AVATAR_MAX  = 200

interface DragState {
  edge:   Edge
  startX: number
  startY: number
  startW: number
  startH: number
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

  const mode          = SIZE_MODE[node.type] ?? 'full'
  const isCircle      = mode === 'diameter'
  const isContainer   = NODE_REGISTRY[node.type]?.isContainer ?? false

  const [drag, setDrag] = useState<DragState | null>(null)
  const [live, setLive] = useState<{ w: number; h: number } | null>(null)

  const dragRef = useRef<DragState | null>(null)
  const liveRef = useRef<{ w: number; h: number } | null>(null)

  const getStartSize = useCallback((): { w: number; h: number } => {
    if (mode === 'diameter') {
      const d = (node.props.size as number) ?? 56
      return { w: d, h: d }
    }
    if (mode === 'heightOnly') {
      const h = (node.props.height as number) ?? 40
      return { w: 0, h }
    }
    // Read the actual rendered box, not node.props.style — this is correct
    // whether the current height came from a literal `height` (leaf nodes)
    // or a `minHeight` that content has since grown past (containers).
    const rect = shellRef.current?.getBoundingClientRect()
    return { w: rect?.width ?? 200, h: rect?.height ?? 100 }
  }, [mode, node.props.size, node.props.height, shellRef])

  // The parent element here is always the actual container box (Section's
  // inner wrapper, ColumnsEditor's flex row, ColumnEditor's own div) — since
  // SelectableShell nests directly inside whatever EditorComponent renders.
  // Capping drag width to this stops a resize from pushing past the
  // container's own boundary, which is what was happening once resized
  // items got `flexShrink: 0` and had no ceiling on how wide they could go.


  const startDrag = useCallback((edge: Edge) => (e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const { w, h } = getStartSize()

    const state: DragState = { edge, startX: e.clientX, startY: e.clientY, startW: w, startH: h }
    dragRef.current = state
    liveRef.current = { w, h }
    setDrag(state)
    setLive({ w, h })
    setResizing(node.id)
 }, [getStartSize,  node.id, setResizing])

  useEffect(() => {
    if (!drag) return

    function onMove(e: PointerEvent) {
      const d = dragRef.current
      if (!d) return
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY

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

      const currentStyle = (node.props.style as StyleProps) ?? {}
      const patch: Partial<StyleProps> = {}

      if (d.edge === 'right' || d.edge === 'corner') {
        patch.width = l.w
      }

      if (d.edge === 'bottom' || d.edge === 'corner') {
        if (isContainer) {
          // A container can receive dropped-in children (or an accordion
          // item can expand, etc) after being resized. Writing a hard
          // `height` would clip that — write `minHeight` instead, so
          // dragging sets a floor but the box is free to grow taller.
          patch.minHeight = l.h
          if (currentStyle.height !== undefined) patch.height = undefined
        } else {
          patch.height = l.h
        }
      }

      updateProps(node.id, { style: { ...currentStyle, ...patch } })
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, mode, node.id, isContainer, updateProps, setResizing])


  
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
                  ? `${live.w}px`
                : `${live.w} × ${live.h}`}
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