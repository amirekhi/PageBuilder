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

// Shared by both RenderEditorNode and RenderPreviewNode's 'carousel'
// handling below. Builds the ENTIRE sliding track — width math, transform,
// transition — directly at the point activeIndex's state lives, exactly
// mirroring the fix already proven for Tabs' display:none wrapping. This
// is deliberately NOT built inside CarouselEditor/CarouselPreview
// themselves (an earlier version did this via React.Children.toArray,
// which reintroduced the same failure mode that originally broke Tabs —
// positioning logic living one layer away from the component whose
// setState actually fires doesn't reliably reach the DOM). CarouselEditor/
// CarouselPreview now just render whatever this function already built.
//
// A naive per-slide `width: 100%` inside a plain `display:flex` track is a
// CSS trap: percentage widths on a flex item resolve against ITS OWN flex
// container's width — and since the track has no explicit width otherwise
// (flex containers default to sizing off their content), that's a
// circular reference browsers resolve by falling back to each slide's
// intrinsic content size, breaking the layout. The fix: give the TRACK an
// explicit width of `count * 100%` (of the outer, already-definite-width
// viewport), and give each slide `100 / count` percent of THAT — every
// percentage now resolves against a concrete number. One "slide-width"
// step is then exactly `100 / count` percent of the track, which —
// because the track itself is `count * 100%` of the viewport — always
// works out to exactly one full viewport-width per index step, regardless
// of slide count.
function buildSlidingTrack(
  childIds: string[],
  activeIndex: number,
  renderChild: (id: string) => React.ReactNode,
): React.ReactNode {
  const count = childIds.length
  if (count === 0) return null
  const widthPct = 100 / count
  return (
    <div
      className="flex"
      style={{
        width: `${count * 100}%`,
        transform: `translateX(-${widthPct * activeIndex}%)`,
        transition: 'transform 450ms ease',
      }}
    >
      {childIds.map(cid => (
        <div key={cid} style={{ width: `${widthPct}%`, flexShrink: 0, minWidth: 0 }}>
          {renderChild(cid)}
        </div>
      ))}
    </div>
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

  // Which tab is active for a Tabs node — see the doc comment on
  // activeIndex/onActiveIndexChange in types.ts for why this lives here as
  // local state (one instance per Tabs node, scoped by this component's
  // position in the tree) instead of on node.props. Called unconditionally,
  // same hook-order rule as resolvedStyle above — harmless for every
  // non-Tabs node, since nothing else reads it.
  const [activeIndex, setActiveIndex] = useState(0)

  if (!node) return null
  const def = NODE_REGISTRY[node.type]
  if (!def) return null

  const { EditorComponent } = def
  let content: React.ReactNode = null

  // Clamped once here, up front, and reused both when building `content`
  // below AND when passed down as the activeIndex prop to EditorComponent
  // — so TabsEditor's header-button highlight and the actual visible pane
  // can never disagree with each other. Harmless to compute for every
  // non-Tabs node (just unused in that case).
  const safeActiveIndex = node.children.length > 0
    ? Math.min(activeIndex, node.children.length - 1)
    : 0

  if (node.type === 'tabs') {
    // Tabs is a "switched container": its children are ALWAYS tabpane
    // nodes, added exclusively via the dedicated "+ Add tab" action (see
    // TabsPanel/TabsEditor's empty-state button) — never via the generic
    // DropSlot "+ Add block" flow every other container uses. So,
    // deliberately unlike every other isContainer branch below: NO
    // DropSlots are rendered here at all — there's nowhere for dnd-kit to
    // register a drop target directly inside Tabs, so a stray non-tabpane
    // block can never land here by drag-and-drop. (You can still drag a
    // block INTO a tabpane's own content — it falls through to the
    // ordinary isContainer branch below once you're one level inside it.)
    //
    // Each inactive tabpane is hidden via display:none, wrapped HERE —
    // right at the point activeIndex's state lives — rather than inside
    // TabsEditor itself (see the FIX note in the git history / prior
    // version of this comment for why that indirection was unreliable).
    // A tab panel swapping instantly (no slide/fade motion) is the correct
    // behavior here, unlike Carousel below.
    content = node.children.length > 0
      ? (
        <>
          {node.children.map((childId, i) => (
            <div key={childId} style={{ display: i === safeActiveIndex ? undefined : 'none' }}>
              <RenderEditorNode nodeId={childId} nodes={nodes} />
            </div>
          ))}
        </>
      )
      : null
  } else if (node.type === 'carousel') {
    // Carousel is also a "switched container" with no generic DropSlots —
    // same reasoning as Tabs above (slides are added exclusively via
    // CarouselPanel/CarouselEditor's "+ Add slide" action). Unlike Tabs,
    // it doesn't hide inactive children — buildSlidingTrack above lays
    // every slide out side by side and translateX's the whole track into
    // view, which is what produces the actual sliding motion. Built HERE,
    // not inside CarouselEditor, for the same reason Tabs' hide/show moved
    // here — see the comment on buildSlidingTrack for the full story.
    content = buildSlidingTrack(
      node.children,
      safeActiveIndex,
      childId => <RenderEditorNode nodeId={childId} nodes={nodes} />,
    )
  } else if (def.isContainer) {
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
    // resolved display is 'grid' (Section's Display control, or the Grid
    // element), each DropSlot rendered as a sibling becomes a REAL grid
    // item occupying one of the N column tracks — stealing a cell that
    // should belong to actual content and throwing off which column
    // everything else lands in. Flex never had this problem (a lone extra
    // flex item just takes whatever space it's given; it doesn't
    // pre-declare fixed tracks the way grid's gridTemplateColumns does).
    // The fix: whenever the parent is a grid, wrap each DropSlot in a div
    // spanning EVERY column (gridColumn: '1 / -1') instead of letting it
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
  // Excludes Tabs and Carousel — neither has a generic "Add block" slot at
  // all (see above); growing them happens through their own Panel/Editor's
  // dedicated "+ Add tab"/"+ Add slide" action instead.
  const showPersistentAdd = def.isContainer && node.type !== 'tabs' && node.type !== 'carousel' && selectedId === node.id && node.children.length > 0
  const isGridForAdd = def.isContainer && resolvedStyle.display === 'grid'

  return (
    <SelectableShell node={node}>
      <EditorComponent node={node} activeIndex={safeActiveIndex} onActiveIndexChange={setActiveIndex}>
        {content}
      </EditorComponent>
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

  // Same Tabs/Carousel active-index local state as RenderEditorNode above
  // (see the doc comment on activeIndex/onActiveIndexChange in types.ts) —
  // a separate instance here since Preview is an entirely separate render
  // tree/root from the Editor, with its own independent "which child is
  // currently showing" state per Tabs/Carousel block.
  const [activeIndex, setActiveIndex] = useState(0)

  if (!node) return null
  const def = NODE_REGISTRY[node.type]
  if (!def) return null

  // Tabs and Carousel each get their own treatment, built directly here —
  // right where activeIndex's state lives — rather than inside
  // TabsPreview/CarouselPreview themselves. Tabs' inactive children are
  // hidden via display:none (an instant swap is correct there); Carousel's
  // children are laid out via buildSlidingTrack (see above RenderEditorNode)
  // so the whole row can translateX into view, producing real sliding
  // motion. Every other node type just gets its children as a plain array,
  // unchanged.
  const safeActiveIndex = node.children.length > 0
    ? Math.min(activeIndex, node.children.length - 1)
    : 0

  let children: React.ReactNode
  if (node.type === 'tabs') {
    children = node.children.map((cid, i) => (
      <div key={cid} style={{ display: i === safeActiveIndex ? undefined : 'none' }}>
        <RenderPreviewNode nodeId={cid} nodes={nodes} />
      </div>
    ))
  } else if (node.type === 'carousel') {
    children = buildSlidingTrack(
      node.children,
      safeActiveIndex,
      cid => <RenderPreviewNode nodeId={cid} nodes={nodes} />,
    )
  } else {
    children = node.children.map(cid => <RenderPreviewNode key={cid} nodeId={cid} nodes={nodes} />)
  }

  return (
    <def.PreviewComponent
      node={node}
      animationRef={animationRef}
      animationStyle={animationStyle}
      activeIndex={safeActiveIndex}
      onActiveIndexChange={setActiveIndex}
    >
      {children}
    </def.PreviewComponent>
  )
}