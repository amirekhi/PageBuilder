'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useBuilderStore, PREVIEW_WIDTHS } from './store'
import { NODE_REGISTRY } from './registry'
import { NodeMap } from './types'
import { SelectableShell } from './SelectableShell'
import { DropSlot, parseSlotId } from './DropSlot'
import { EmptyCanvasPrompt } from './TemplatePicker'
import { AnimationStyleSheet, useAnimationProps } from './animations'
import { CustomCssStyleSheet } from './CustomCssStyleSheet'
import { useNodeStyle, useNodeAnimation } from './responsive'
import { setGlobalColorPalette } from './styleMapper'

// ─── EditorRenderer ───────────────────────────────────────────────────────────
// Desktop editing: the canvas simply fills 100% of whatever horizontal room
// is actually available in the editor panel (window minus the ControlPanel
// sidebar). No artificial simulated width, no scaling — a real page has no
// fixed desktop width either, so the most accurate thing the editor can show
// is "as much of the real page as this panel has room for," full stop. This
// is necessarily narrower than someone's actual monitor (the sidebar has to
// live somewhere), but it's never MORE constrained than that unavoidable
// limit — no extra cap is layered on top of it.
//
// Tablet/Mobile editing: these represent actual physical devices with fixed
// widths (768px / 390px from PREVIEW_WIDTHS), so those stay simulated at
// their true size, scaled down only if the panel is narrower than the
// device width itself (rare, but keeps things usable on small screens).
//
// NOTE ON ANIMATIONS: the editor canvas deliberately never plays
// animations — RenderEditorNode below never passes animationRef/
// animationStyle to EditorComponent. Blocks always render in their final
// static (post-animation) state while editing, so drag handles, inline text
// editing, and the resize UI never have to fight a moving/fading target.
// Animations only play in PreviewRenderer, further down this file.

export function EditorRenderer() {
  const nodes             = useBuilderStore(s => s.nodes)
  const rootId            = useBuilderStore(s => s.rootId)
  const moveNode          = useBuilderStore(s => s.moveNode)
  const selectNode        = useBuilderStore(s => s.selectNode)
  const setDragging       = useBuilderStore(s => s.setDragging)
  const draggingId        = useBuilderStore(s => s.draggingId)
  const editingBreakpoint = useBuilderStore(s => s.editingBreakpoint)
  const setCanvasScale    = useBuilderStore(s => s.setCanvasScale)
  const globalColors      = useBuilderStore(s => s.globalColors)

  // Refreshes styleMapper's module-level color-resolution cache with the
  // latest palette on every render, AND (just by subscribing here at all)
  // makes this component re-render whenever a GlobalColor's value changes
  // — which cascades down to every unmemoized child below, so a palette
  // edit shows up live on every bound block without each one needing its
  // own subscription. See the comment on setGlobalColorPalette in
  // styleMapper.ts for why this is a plain call here rather than a store
  // import inside styleMapper.ts itself.
  setGlobalColorPalette(globalColors)

  const outerRef  = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const [availableWidth, setAvailableWidth] = useState(1280)
  const [canvasHeight, setCanvasHeight]     = useState(600)

  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setAvailableWidth(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setCanvasHeight(entry.contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const isDesktop = editingBreakpoint === 'desktop'

  // Desktop: simulate at exactly however much room is available — so
  // scale is always 1 (nothing to shrink; it already fills the space).
  // Tablet/Mobile: simulate the device's true fixed width, only shrinking
  // if the panel is narrower than that.
  const simWidth = isDesktop ? availableWidth : PREVIEW_WIDTHS[editingBreakpoint].px
  const scale    = isDesktop ? 1 : Math.min(1, availableWidth / simWidth)

  useEffect(() => {
    setCanvasScale(scale)
  }, [scale, setCanvasScale])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string
    setDragging(id)
    selectNode(id)
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragging(null)
    const { active, over } = event
    if (!over) return
    const draggedId = active.id as string
    const slot = parseSlotId(over.id as string)
    if (!slot) return
    const node = nodes[draggedId]
    if (!node) return
    moveNode(draggedId, slot.parentId, slot.index)
  }

  const draggingNode = draggingId ? nodes[draggingId] : null
  const draggingDef  = draggingNode ? NODE_REGISTRY[draggingNode.type] : null

  return (
    <DndContext
      id="page-builder-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Very subtle dot grid — just enough to show it's an editor canvas */}
      <div
        className="min-h-full py-8 px-4"
        style={{
          backgroundImage: 'radial-gradient(circle, #d4d4d4 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          backgroundColor: '#f9fafb',
        }}
        onClick={() => selectNode(null)}
      >
        <CustomCssStyleSheet />
        <div ref={outerRef} className="w-full flex justify-center">
          <div
            style={{
              position: 'relative',
              width:    simWidth * scale,
              height:   Math.max(canvasHeight * scale, 1),
            }}
          >
            <div
              ref={canvasRef}
              className="bg-white"
              style={{
                position:        'absolute',
                top:             0,
                left:            0,
                width:           simWidth,
                minHeight:       600,
                borderRadius:    isDesktop ? 6 : 12,
                border:          '1px solid #e2e8f0',
                boxShadow:       '0 2px 12px 0 rgba(0,0,0,0.06)',
                transform:       `scale(${scale})`,
                transformOrigin: 'top left',
                transition:      'width 0.15s ease, transform 0.15s ease',
              }}
            >
              <EmptyCanvasPrompt />
              <RenderEditorNode nodeId={rootId} nodes={nodes} />
            </div>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
        {draggingDef && draggingNode ? (
          <div
            className="rounded-lg ring-2 ring-violet-400 shadow-2xl opacity-90 bg-white overflow-hidden"
            style={{ minWidth: 120, maxWidth: 320, pointerEvents: 'none' }}
          >
            <div className="bg-violet-600 px-3 py-1 text-white text-xs font-medium flex items-center gap-1.5">
              <span>{draggingDef.icon}</span>
              <span>{draggingDef.label}</span>
            </div>
            <div className="p-3 text-sm text-neutral-500 truncate">
              {draggingNode.type === 'text' || draggingNode.type === 'heading'
                ? (draggingNode.props.content as string) || draggingDef.label
                : draggingDef.label}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// ─── Recursive editor node ────────────────────────────────────────────────────

function RenderEditorNode({ nodeId, nodes }: { nodeId: string; nodes: NodeMap }) {
  const node       = nodes[nodeId]
  const selectedId = useBuilderStore(s => s.selectedId)
  // Resolved purely to check display mode below — cheap (same hook every
  // other component in the app already calls), and unconditional so hook
  // order stays stable regardless of the early `if (!node)` return further
  // down (same rule RenderPreviewNode's own animation hook already follows).
  const resolvedStyle = useNodeStyle(node ?? null)

  if (!node) return null
  const def = NODE_REGISTRY[node.type]
  if (!def) return null

  const { EditorComponent } = def
  let content: React.ReactNode = null

  if (def.isContainer) {
    // FIX (Pricing template columns rendering uneven/out-of-order): a
    // between-block DropSlot used to always render as a full-width
    // horizontal divider regardless of the parent's layout direction. Fine
    // for a vertically-stacked container (Section, Column), but WRONG
    // inside a Columns row — ColumnsEditor hardcodes flex-row, so a
    // full-width sibling there forces every real column to shrink around
    // it via normal flex math, distorting their widths. 'columns' is the
    // only node type whose Editor component hardcodes flex-row regardless
    // of style, so checking node.type here (rather than resolving style) is
    // both sufficient and exactly matches what ColumnsEditor itself does.
    const axis = node.type === 'columns' ? 'row' : 'col'

    // FIX (grid columns/rows corrupted by DropSlots): when a container's
    // resolved display is 'grid' (currently only ever Section, via
    // SectionPanel's Display control), each DropSlot rendered as a sibling
    // becomes a REAL grid item occupying one of the N column tracks —
    // stealing a cell that should belong to actual content and throwing off
    // which column everything else lands in. Flex never had this problem
    // (a lone extra flex item just takes whatever space it's given; it
    // doesn't pre-declare fixed tracks the way grid's gridTemplateColumns
    // does). The fix: whenever the parent is a grid, wrap each DropSlot in a
    // div spanning EVERY column (gridColumn: '1 / -1') instead of letting it
    // occupy just one — it can never again steal a content column. This is
    // Editor-only: PreviewRenderer never renders DropSlot at all, so the
    // published/Preview grid always shows exactly the row/column count set
    // in the panel, with zero drop-slot interference regardless of this.
    const isGrid = resolvedStyle.display === 'grid'
    function wrapIfGrid(key: string, slot: React.ReactNode): React.ReactNode {
      if (!isGrid) return slot
      return <div key={key} style={{ gridColumn: '1 / -1' }}>{slot}</div>
    }

    const ids = node.children
    if (ids.length === 0) {
      const slot = <DropSlot parentId={node.id} index={0} isOnly />
      content = isGrid ? <div style={{ gridColumn: '1 / -1' }}>{slot}</div> : slot
    } else {
      const items: React.ReactNode[] = [
        wrapIfGrid('slot-pre', <DropSlot key="slot-pre-inner" parentId={node.id} index={0} axis={axis} />),
      ]
      ids.forEach((childId, i) => {
        items.push(<RenderEditorNode key={childId} nodeId={childId} nodes={nodes} />)
        items.push(wrapIfGrid(`slot-${i}`, <DropSlot key={`slot-${i}-inner`} parentId={node.id} index={i + 1} axis={axis} />))
      })
      content = <>{items}</>
    }
  }

  // When this container is selected, show a persistent "Add block" button
  // at the bottom so finding the thin hover-only slots isn't the only way in.
  const showPersistentAdd = def.isContainer && selectedId === node.id && node.children.length > 0
  const isGridForAdd = def.isContainer && resolvedStyle.display === 'grid'

  return (
    <SelectableShell node={node}>
      <EditorComponent node={node}>{content}</EditorComponent>
      {showPersistentAdd && (
        isGridForAdd ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <DropSlot parentId={node.id} index={node.children.length} isPersistent />
          </div>
        ) : (
          <DropSlot parentId={node.id} index={node.children.length} isPersistent />
        )
      )}
    </SelectableShell>
  )
}

// ─── PreviewRenderer ──────────────────────────────────────────────────────────
// Desktop preview: full-bleed to the actual browser viewport, no ceiling —
// this is what genuinely represents the final published page. Any width
// limiting is entirely up to what each Section's own Max Width is set to;
// PreviewRenderer itself must never impose one on top, or "Preview" stops
// meaning "what visitors will actually see."
//
// Tablet/Mobile preview: still simulated as actual device widths (with the
// phone/tablet chrome), since that's genuinely representing a different
// physical screen, not just "a page that happens to be narrower."
//
// ANIMATIONS: this is the ONLY renderer that plays them. <AnimationStyleSheet />
// injects the @keyframes once per Preview mount. The tree is keyed off
// previewReplayNonce (bumped by TopBar's Replay button / handleSetMode via
// the replayAnimations() store action) — changing that key forces a full
// unmount/remount of every node below, which resets every
// IntersectionObserver and re-triggers every CSS animation from scratch.
//
// Each node's animation is now resolved per-breakpoint via useNodeAnimation
// (see responsive.ts), the same way style already was — so switching the
// Preview width switcher between Desktop/Tablet/Mobile can genuinely change
// which effect plays, or skip it entirely, instead of always playing
// whatever was set as the single (previously Desktop-only) animation.

export function PreviewRenderer({ nodes, rootId }: { nodes: NodeMap; rootId: string }) {
  const previewWidth = useBuilderStore(s => s.previewWidth)
  const cfg           = PREVIEW_WIDTHS[previewWidth]
  const replayNonce   = useBuilderStore(s => s.previewReplayNonce)
  const globalColors  = useBuilderStore(s => s.globalColors)

  // Same reasoning as EditorRenderer above — Preview is a separate render
  // root, so it needs its own subscription/cache-refresh rather than
  // relying on EditorRenderer's.
  setGlobalColorPalette(globalColors)

  return (
    <div
      style={{
        minHeight:      '100vh',
        background:     previewWidth !== 'desktop' ? '#f9fafb' : 'white',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        paddingTop:     previewWidth !== 'desktop' ? '2rem' : '0',
        paddingBottom:  previewWidth !== 'desktop' ? '4rem' : '0',
      }}
    >
      <AnimationStyleSheet />
      <CustomCssStyleSheet />
      {previewWidth !== 'desktop' ? (
        <div
          style={{
            width:        cfg.px,
            maxWidth:     '100%',
            background:   'white',
            borderRadius: previewWidth === 'mobile' ? 32 : 12,
            boxShadow:    '0 8px 48px rgba(0,0,0,0.18)',
            overflow:     'hidden',
            border:       '1px solid #e2e8f0',
          }}
        >
          {previewWidth === 'mobile' && (
            <div style={{ height: 32, background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 80, height: 10, background: '#333', borderRadius: 8 }} />
            </div>
          )}
          {previewWidth === 'tablet' && (
            <div style={{ height: 12, background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }} />
          )}
          <RenderPreviewNode key={replayNonce} nodeId={rootId} nodes={nodes} />
        </div>
      ) : (
        <div style={{ width: '100%', background: 'white', minHeight: '100vh' }}>
          <RenderPreviewNode key={replayNonce} nodeId={rootId} nodes={nodes} />
        </div>
      )}
    </div>
  )
}

function RenderPreviewNode({ nodeId, nodes }: { nodeId: string; nodes: NodeMap }) {
  const node = nodes[nodeId]

  // Resolved per the ACTIVE breakpoint (previewWidth, since useNodeAnimation
  // is mode-aware — see responsive.ts) instead of reading
  // node.props.animation directly. This is what makes a Tablet/Mobile
  // animation override (set via AnimationPanel while editingBreakpoint is
  // Tablet/Mobile) actually take effect here rather than always playing
  // the Desktop definition regardless of previewWidth.
  const animation = useNodeAnimation(node ?? null)

  // Hook is called unconditionally, BEFORE the `if (!node) return null` below
  // — required by the rules of hooks (hook order must never depend on a
  // conditional). Harmless when node/animation is missing: the hook just
  // returns an empty style and an unattached ref in that case.
  const { ref: animationRef, style: animationStyle } = useAnimationProps(animation)

  if (!node) return null
  const def = NODE_REGISTRY[node.type]
  if (!def) return null

  const children = node.children.map(cid => (
    <RenderPreviewNode key={cid} nodeId={cid} nodes={nodes} />
  ))

  return (
    <def.PreviewComponent node={node} animationRef={animationRef} animationStyle={animationStyle}>
      {children.length > 0 ? children : undefined}
    </def.PreviewComponent>
  )
}