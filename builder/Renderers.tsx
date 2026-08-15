'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useBuilderStore, PREVIEW_WIDTHS } from './store'
import { NODE_REGISTRY } from './registry'
import { NodeMap } from './types'
import { SelectableShell } from './SelectableShell'
import { DropSlot, GridCellSlot, parseSlotId, parseGridCellDropId } from './DropSlot'
import { computeGridOccupancy, type GridCellOrigin } from './gridLayout'
import { EmptyCanvasPrompt } from './TemplatePicker'
import { AnimationStyleSheet, useAnimationProps } from './animations'
import { CustomCssStyleSheet } from './CustomCssStyleSheet'
import { useNodeStyle, useNodeAnimation } from './responsive'
import { setGlobalColorPalette } from './styleMapper'
import { directionForLocale, type Direction } from './i18n'

// ─── Grid cell placement wrapper ───────────────────────────────────────────
// THE fix for Editor/Preview disagreeing about which cell holds which
// child. A child's own persisted style (gridColStart/gridRowStart, read by
// buildGridItemStyle in styleMapper.ts) is only ever set for children that
// were explicitly placed via GridCellSlot or drag-and-drop (see
// moveNode's gridPlacement param in store.ts). Anything else — legacy
// content, a duplicated node, anything computeGridOccupancy had to
// auto-place via its top-left fallback scan — has NO explicit coords on
// its own style, so buildGridItemStyle falls back to a bare `span N` and
// lets the BROWSER's own CSS grid auto-placement algorithm decide where it
// actually lands.
//
// That's exactly the crack Editor and Preview fell through: auto-placement
// is DOM-composition-dependent. The Editor's DOM contains the real
// children PLUS GridCellSlot placeholders for every empty cell (each with
// its own explicit gridColumn/gridRow, which "reserves" that cell and
// keeps the browser's auto-placement cursor from stepping into it).
// Preview's DOM has no slot placeholders at all — nothing else in the DOM
// to keep the auto-placement cursor honest — so a fallback-positioned
// child could genuinely land in a different cell there than it did in the
// Editor, even though both call the exact same computeGridOccupancy().
//
// The fix: never let CSS auto-flow decide ANY grid child's position.
// Every rendered child (in both RenderEditorNode and RenderPreviewNode
// below) is wrapped in a div carrying the EXACT row/col/span
// computeGridOccupancy already computed for it — explicit grid-column/
// grid-row on this wrapper, full stop.
//
// IMPORTANT — do NOT set display:'grid' here. An earlier version of this
// helper did, intending to make the wrapper's single child stretch to
// fill it — that's backwards, and it's what caused the "some sections in
// a grid render narrower than their cell" bug. Setting display:'grid' on
// THIS wrapper turns it into a brand new, SEPARATE grid formatting
// context for its own one child. With no gridTemplateColumns/
// gridTemplateRows given to that nested grid, its single implicit column
// track sizes itself to 'auto' — i.e. content-sized — instead of filling
// the wrapper's own box. So the wrapper silently stopped being "100% of
// the parent cell" and became "exactly as wide as whatever's inside it,"
// which varied per node type depending on what that node's own internal
// sizing happened to resolve to (hence some blocks looking fine and
// others shrinking).
//
// The actual fix needs NOTHING clever: a plain block-level element that
// is a direct child of a CSS grid container already defaults to `stretch`
// alignment on both axes (the CSS Grid spec's default justify-items/
// align-items value) — it fills its entire grid area on its own, with no
// extra display mode required. width/height:100% below are just an extra
// safety net for whatever's nested one level further in (SelectableShell
// in the Editor, computes its own sizing off nodeStyle — see
// SelectableShell.tsx), not strictly required for the stretch behavior
// itself.
function gridCellPlacementStyle(origin: GridCellOrigin): React.CSSProperties {
  return {
    gridColumn: `${origin.col} / span ${origin.colSpan}`,
    gridRow:    `${origin.row} / span ${origin.rowSpan}`,
    minWidth:   0,
    minHeight:  0,
  }
}

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
//
// ─── DndContext moved OUT of this component ────────────────────────────────
// EditorRenderer no longer creates or owns a DndContext, sensors, or drag
// handlers of its own — all of that now lives ONE level up, in the
// top-level page component (page.tsx), wrapping BOTH <ControlPanel /> and
// this canvas as siblings under a single shared DndContext. A draggable
// and a droppable only ever detect each other when both are registered to
// the SAME DndContext instance — dnd-kit scopes that registration per
// context, not globally. Previously this component had its own *second*,
// fully independent DndContext nested inside the outer one from page.tsx.
// Every DropSlot/GridCellSlot on the canvas registered against THIS inner
// context, and so did dragging an existing on-page node (its useDraggable
// lives on SelectableShell, also inside this component) — so reordering an
// existing block worked perfectly. But PaletteTile/TemplateTile in
// ControlPanel.tsx only ever registered against the OUTER context in
// page.tsx, which has no visibility into this inner context's droppables.
// Dragging one in visually "armed" the slots (draggingId still flipped
// true, since the outer context's own onDragStart fired and updated the
// store) but `over` could never resolve, so isOver/highlighting never
// fired — a fresh block or template could be dropped without any visual
// feedback at all. Deleting this inner DndContext (and the now-redundant
// sensors/handleDragStart/handleDragEnd/DragOverlay that came with it)
// fixes that: the canvas is now a plain child of the single DndContext in
// page.tsx, exactly like ControlPanel already is, so every draggable and
// every droppable share one registration space regardless of which panel
// they live in.

export function EditorRenderer() {
  const nodes             = useBuilderStore(s => s.nodes)
  const rootId            = useBuilderStore(s => s.rootId)
  const selectNode        = useBuilderStore(s => s.selectNode)
  const editingBreakpoint = useBuilderStore(s => s.editingBreakpoint)
  const setCanvasScale    = useBuilderStore(s => s.setCanvasScale)
  const globalColors      = useBuilderStore(s => s.globalColors)
  const locale            = useBuilderStore(s => s.locale)
  const dir               = directionForLocale(locale)

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

  return (
    // Very subtle dot grid — just enough to show it's an editor canvas
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
            dir={dir}
            className="bg-white"
            data-tutorial="canvas"
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
//
// dir="ltr" PINNED ON THE TRACK ITSELF: the transform math above
// (translateX by -widthPct*activeIndex%) and the flex item order both
// assume a fixed, physical left-to-right layout — this is a MECHANISM, not
// text, exactly like the Position/Padding controls in panelComponents.tsx.
// Under an inherited dir="rtl" (Farsi mode), a plain flex row reverses its
// items' physical order AND the track's overflow-hidden clipping shifts
// with it — so the "visible" 100%-wide slice of the (count*100%)-wide
// track stops lining up with slide index 0, and which physical side
// counts as "forward" flips. That's what caused Farsi carousels to show
// only the first slide and feel like their prev/next arrows were swapped.
// Pinning the track (and CarouselEditor/CarouselPreview's own wrapper
// divs — see nodeComponents.tsx) to dir="ltr" keeps the carousel's
// MECHANICS identical regardless of language, while `contentDir` restores
// the real page direction one level further in, on each individual
// slide's own content wrapper — so Farsi text INSIDE a slide still reads
// RTL correctly; only the carousel's internal plumbing is pinned.
function buildSlidingTrack(
  childIds: string[],
  activeIndex: number,
  renderChild: (id: string) => React.ReactNode,
  contentDir: Direction,
): React.ReactNode {
  const count = childIds.length
  if (count === 0) return null
  const widthPct = 100 / count
  return (
    <div
      className="flex"
      dir="ltr"
      style={{
        width: `${count * 100}%`,
        transform: `translateX(-${widthPct * activeIndex}%)`,
        transition: 'transform 450ms ease',
      }}
    >
      {childIds.map(cid => (
        <div key={cid} dir={contentDir} style={{ width: `${widthPct}%`, flexShrink: 0, minWidth: 0 }}>
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
  // Resolved purely to check display mode / gridCols / gridRows below —
  // cheap (same hook every other component in the app already calls), and
  // unconditional so hook order stays stable regardless of the early
  // `if (!node)` return further down (same rule RenderPreviewNode's own
  // animation hook already follows).
  const resolvedStyle = useNodeStyle(node ?? null)
  // Real page reading direction — needed by the 'carousel' branch below to
  // restore correct text direction inside each slide even though the
  // track's own mechanics are pinned to ltr (see buildSlidingTrack).
  const locale = useBuilderStore(s => s.locale)
  const contentDir = directionForLocale(locale)

  // Which tab/slide is active for a Tabs/Carousel node — see the doc
  // comment on activeIndex/onActiveIndexChange in types.ts for why this
  // lives here as local state (one instance per node, scoped by this
  // component's position in the tree) instead of on node.props. Called
  // unconditionally, same hook-order rule as resolvedStyle above —
  // harmless for every other node type, since nothing else reads it.
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
  // non-Tabs/Carousel node (just unused in that case).
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
      contentDir,
    )
  } else if (node.type === 'grid') {
    // Grid is a THIRD kind of specially-laid-out container, alongside
    // Tabs/Carousel above — but unlike those two, MULTIPLE children can be
    // visible at once, each at its own fixed 2D coordinate rather than a
    // single "active" index. computeGridOccupancy (gridLayout.ts) is the
    // ONE place both this function and RenderPreviewNode below derive
    // placement from, so Editor and Preview can never show a child in a
    // different cell from each other again — AND each occupied cell's
    // child is wrapped in gridCellPlacementStyle (see the top of this
    // file) so its exact position is applied via an explicit inline
    // gridColumn/gridRow, never left to the browser's own CSS
    // auto-placement algorithm. That auto-placement dependency was the
    // actual root cause of Editor/Preview showing different cell contents:
    // Preview's DOM has no GridCellSlot placeholders "reserving" empty
    // cells the way Editor's does, so a child positioned only via a bare
    // `span N` (no explicit origin) could get auto-placed differently in
    // each view. Wrapping in the SAME computed origin removes that
    // dependency entirely.
    //
    // Per cell: an occupied ORIGIN cell renders the actual child (wrapped);
    // a cell covered only because an earlier child spans over it renders
    // nothing (already painted by that child); every other cell renders
    // exactly one GridCellSlot. This entirely replaces the old
    // generic-container DropSlot/wrapIfGrid machinery for Grid NODES
    // specifically — no more full-row-spanning divider slots stealing a
    // column, no more index-based insertion points that don't correspond
    // to a real 2D coordinate. (Section's own separate Display:Grid style
    // mode still uses the old wrapIfGrid path below, since that's a plain
    // CSS-grid layout mode with ordinary auto-placed children, not a Grid
    // NODE.)
    const cols = resolvedStyle.gridCols ?? 3
    const rows = typeof resolvedStyle.gridRows === 'number' ? resolvedStyle.gridRows : 2
    const { occupied, originByCell } = computeGridOccupancy(node.children, nodes, cols, rows)

    const cells: React.ReactNode[] = []
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const key = `${r}-${c}`
        const origin = originByCell.get(key)
        if (origin) {
          cells.push(
            <div key={origin.childId} style={gridCellPlacementStyle(origin)}>
              <RenderEditorNode nodeId={origin.childId} nodes={nodes} />
            </div>
          )
        } else if (!occupied.has(key)) {
          cells.push(<GridCellSlot key={key} parentId={node.id} row={r} col={c} />)
        }
        // else: covered by an earlier child's span — nothing to render here
      }
    }
    content = <>{cells}</>
  } else if (def.isContainer) {
    // FIX (Pricing template columns rendering uneven/out-of-order): a
    // between-block DropSlot used to always render as a full-width
    // horizontal divider regardless of the parent's layout direction.
    // ... (unchanged comment/logic above this line) ...
    const axis = node.type === 'columns' ? 'row' : 'col'

    const isGrid = resolvedStyle.display === 'grid'
    function wrapIfGrid(key: string, slot: React.ReactNode): React.ReactNode {
      if (!isGrid) return slot
      return <div key={key} style={{ gridColumn: '1 / -1' }}>{slot}</div>
    }

    // Gap-cancellation input — see the doc comment on DropSlotProps.gapPx
    // in DropSlot.tsx for the full mechanism. Only meaningful when this
    // container's own resolved display actually uses `gap` (flex or grid
    // — CSS ignores `gap` for block display, so canceling anything there
    // would just be a stray, wrong negative margin). Computed the same way
    // buildInlineStyle in styleMapper.ts converts style.gap to real px
    // (×4), so the cancellation always matches EXACTLY what CSS itself
    // applied as the container's gap.
    const gapPx = (resolvedStyle.display === 'flex' || resolvedStyle.display === 'grid')
      ? (resolvedStyle.gap ?? 0) * 4
      : 0

    const ids = node.children
    if (ids.length === 0) {
      if (node.type === 'section') {
        content = null
      } else {
        const slot = <DropSlot parentId={node.id} index={0} isOnly />
        content = isGrid ? <div style={{ gridColumn: '1 / -1' }}>{slot}</div> : slot
      }
    } else {
      const willShowPersistentAdd = selectedId === node.id // matches showPersistentAdd's condition below
      const items: React.ReactNode[] = [
        wrapIfGrid('slot-pre', <DropSlot key="slot-pre-inner" parentId={node.id} index={0} axis={axis} />),
      ]
      ids.forEach((childId, i) => {
        items.push(<RenderEditorNode key={childId} nodeId={childId} nodes={nodes} />)
        const isLast = i === ids.length - 1
        if (!(isLast && willShowPersistentAdd)) {
          items.push(wrapIfGrid(`slot-${i}`, <DropSlot key={`slot-${i}-inner`} parentId={node.id} index={i + 1} axis={axis} />))
        }
      })
      content = <>{items}</>
    }
  }

  // When this container is selected, show a persistent "Add block" button
  // at the bottom so finding the thin hover-only slots isn't the only way in.
  // Excludes Tabs, Carousel, and Grid — none of them has a generic "Add
  // block" append slot (see above); growing them happens through their own
  // dedicated action instead ("+ Add tab" / "+ Add slide" for Tabs/
  // Carousel, or simply increasing rows/cols in GridPanel for Grid — more
  // cells means more GridCellSlots appear automatically).
  const showPersistentAdd = def.isContainer
    && node.type !== 'tabs' && node.type !== 'carousel' && node.type !== 'grid' && node.type !== 'section'
    && selectedId === node.id && node.children.length > 0
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
  const locale        = useBuilderStore(s => s.locale)
  const dir           = directionForLocale(locale)

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
          dir={dir}
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
        <div dir={dir} style={{ width: '100%', background: 'white', minHeight: '100vh' }}>
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
  // Resolved style is needed for the grid branch below — same gridCols/
  // gridRows (per the active breakpoint) that RenderEditorNode's grid
  // branch reads, so Preview computes occupancy against the exact same
  // cols/rows Editor did.
  const resolvedStyle = useNodeStyle(node ?? null)
  // Real page reading direction — see the doc comment on buildSlidingTrack
  // above for why the carousel branch below needs this even though the
  // track's own mechanics are pinned to ltr.
  const locale = useBuilderStore(s => s.locale)
  const contentDir = directionForLocale(locale)

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

  // Tabs, Carousel, and Grid each get their own treatment, built directly
  // here — right where activeIndex's state lives — rather than inside
  // TabsPreview/CarouselPreview/GridPreview themselves. Tabs' inactive
  // children are hidden via display:none (an instant swap is correct
  // there); Carousel's children are laid out via buildSlidingTrack (see
  // above RenderEditorNode) so the whole row can translateX into view,
  // producing real sliding motion; Grid's children are placed via
  // computeGridOccupancy — the SAME call, with the SAME inputs, that
  // RenderEditorNode's grid branch makes, wrapped in the SAME
  // gridCellPlacementStyle helper — which is what guarantees the two views
  // can never disagree about which child sits in which cell. Every other
  // node type just gets its children as a plain array, unchanged.
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
      contentDir,
    )
  } else if (node.type === 'grid') {
    // Preview never renders GridCellSlot (there's no "add block" UI in
    // Preview at all, same as every other node type) — just the occupied
    // children themselves, each wrapped in the SAME gridCellPlacementStyle
    // helper RenderEditorNode's grid branch uses, driven by the SAME
    // computeGridOccupancy origin. Not left to buildGridItemStyle/the
    // child's own persisted style, and not left to CSS auto-flow — see the
    // doc comment on gridCellPlacementStyle at the top of this file for
    // why that's the actual fix here.
    const cols = resolvedStyle.gridCols ?? 3
    const rows = typeof resolvedStyle.gridRows === 'number' ? resolvedStyle.gridRows : 2
    const { originByCell } = computeGridOccupancy(node.children, nodes, cols, rows)
    children = Array.from(originByCell.values()).map(origin => (
      <div key={origin.childId} style={gridCellPlacementStyle(origin)}>
        <RenderPreviewNode nodeId={origin.childId} nodes={nodes} />
      </div>
    ))
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