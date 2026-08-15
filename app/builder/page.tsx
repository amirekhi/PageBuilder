'use client'

import React from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  MeasuringStrategy,
  type DragStartEvent,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core'
import { getEventCoordinates } from '@dnd-kit/utilities'
import { useBuilderStore } from '@/builder/store'
import { EditorRenderer, PreviewRenderer } from '@/builder/Renderers'
import { ControlPanel } from '@/builder/ControlPanel'
import { TopBar } from '@/builder/TopBar'
import { MediaPickerModal } from '@/builder/MediaPickerModal'
import { ImageEditorModal } from '@/builder/ImageEditorModal'
import { MobileBlockModal } from '@/builder/MobileBlockModal'
import { useIsViewportTooNarrow } from '@/builder/useViewportGate'
import { Tutorial } from '@/builder/Tutorial'
import { NODE_REGISTRY } from '@/builder/registry'
import { getTemplates } from '@/builder/templates'
import { parseSlotId, parseGridCellDropId, parsePaletteDragId, parseTemplateDragId } from '@/builder/DropSlot'

// ─── Drag modifier: keep the dragged item's CENTER under the cursor ───────
// Moved here unchanged from Renderers.tsx — see the full mechanism
// explanation that used to live next to EditorRenderer there. It has to
// live wherever DndContext itself lives, which is now this file (see the
// doc comment on DndContext's new position below).
const snapCenterToCursor: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
  if (!draggingNodeRect || !activatorEvent) return transform
  const activatorCoordinates = getEventCoordinates(activatorEvent)
  if (!activatorCoordinates) return transform
  const offsetX = activatorCoordinates.x - draggingNodeRect.left
  const offsetY = activatorCoordinates.y - draggingNodeRect.top
  return {
    ...transform,
    x: transform.x + offsetX - draggingNodeRect.width / 2,
    y: transform.y + offsetY - draggingNodeRect.height / 2,
  }
}

export default function BuilderPage() {
  const mode                  = useBuilderStore(s => s.mode)
  const nodes                  = useBuilderStore(s => s.nodes)
  const rootId                   = useBuilderStore(s => s.rootId)
  const locale                    = useBuilderStore(s => s.locale)
  const draggingId                  = useBuilderStore(s => s.draggingId)
  const setDragging                  = useBuilderStore(s => s.setDragging)
  const selectNode                    = useBuilderStore(s => s.selectNode)
  const moveNode                       = useBuilderStore(s => s.moveNode)
  const addNode                         = useBuilderStore(s => s.addNode)
  const insertTemplateNodes              = useBuilderStore(s => s.insertTemplateNodes)
  const tooNarrow                         = useIsViewportTooNarrow()

  // ─── DndContext moved UP from EditorRenderer to here ─────────────────────
  // A draggable and a droppable only ever detect each other when both are
  // mounted inside the SAME DndContext. Previously DndContext lived inside
  // EditorRenderer (Renderers.tsx), wrapping the canvas only — ControlPanel
  // was a separate sibling with no DndContext of its own, so a draggable
  // tile living in ControlPanel's Elements tab (see PaletteTile/TemplateTile
  // in ControlPanel.tsx) could never have registered a collision against a
  // DropSlot/GridCellSlot living in the canvas. Lifting DndContext up to
  // wrap BOTH <ControlPanel /> and <main> (the canvas) is what makes
  // dragging a fresh block OR template in from the sidebar panel work at
  // all.
  //
  // sensors/handleDragStart/handleDragEnd/the modifier all moved up
  // together with it — EditorRenderer itself no longer creates or owns any
  // of this; see the doc comment at the top of EditorRenderer in
  // Renderers.tsx.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  // ─── Force droppables to re-measure on every render, not just when a
  // ResizeObserver happens to fire ────────────────────────────────────────
  // FIX (Elements-tab tiles never registering a drop, even though existing-
  // canvas-block reordering onto the exact same DropSlots works fine): every
  // between-block/empty-container DropSlot is display:none until a drag
  // starts (see DropSlot.tsx), then flips visible via a CSS class toggle.
  // dnd-kit's default droppable measuring strategy (MeasuringStrategy.
  // WhileDragging) leans on a ResizeObserver to notice a droppable's size
  // changed and re-measure it — but browsers don't reliably fire that
  // observer for a FIRST-EVER display:none→visible transition; it's a
  // known edge case, not a spec guarantee. Reordering an EXISTING canvas
  // block happened to work anyway because that drag causes OTHER layout
  // activity in the same canvas region (the dragged block's own style
  // changes), which incidentally nudges the observer into re-scanning
  // everything it's watching, including the now-visible slots. A drag
  // starting from ControlPanel's Elements tab causes zero layout activity
  // in the canvas until something actually gets dropped — so the slots'
  // stale, zero-size rects (captured while they were still display:none)
  // never get refreshed, and collision detection can never find them —
  // exactly "never highlights, no matter where I hover."
  //
  // MeasuringStrategy.Always stops relying on the observer entirely:
  // droppable rects are recomputed on every render instead, so a slot that
  // just became visible is correctly measured the very next frame,
  // regardless of what triggered its appearance. The extra measurement
  // cost is negligible at this app's DOM size.
  const measuring = {
    droppable: { strategy: MeasuringStrategy.Always },
  }

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string
    setDragging(id)
    // A palette tile ('palette::<type>') or template tile ('template::<i>',
    // see paletteDragId/templateDragId in DropSlot.tsx) has no
    // corresponding node yet — there's nothing to select. Only a drag of an
    // ALREADY-EXISTING node selects it (same behavior as before), which is
    // also what drives ControlPanel's Style/Content tabs to jump to
    // whatever block is being dragged.
    if (!parsePaletteDragId(id) && parseTemplateDragId(id) === null) selectNode(id)
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragging(null)
    const { active, over } = event
    if (!over) return
    const activeId = active.id as string

    // ── New element dragged in from ControlPanel's Elements → Blocks
    // sub-tab ──────────────────────────────────────────────────────────
    // Checked FIRST, before assuming activeId is an existing node id —
    // nodes[activeId] would simply be undefined for a 'palette::text' id
    // anyway, but this makes the branch explicit rather than relying on
    // that fallthrough.
    const paletteType = parsePaletteDragId(activeId)
    if (paletteType) {
      const gridCell = parseGridCellDropId(over.id as string)
      if (gridCell) {
        const targetChildren = nodes[gridCell.parentId]?.children.length ?? 0
        addNode(paletteType, gridCell.parentId, targetChildren, { gridColStart: gridCell.col, gridRowStart: gridCell.row })
        return
      }
      const slot = parseSlotId(over.id as string)
      if (!slot) return
      addNode(paletteType, slot.parentId, slot.index)
      return
    }

    // ── Whole pre-built template dragged in from Elements → Templates
    // sub-tab ─────────────────────────────────────────────────────────
    // Re-resolves getTemplates(locale) fresh at drop time (same locale the
    // TemplateTile that started this drag rendered against — the store's
    // locale hasn't changed mid-drag) and calls .build() fresh right here,
    // exactly like DropSlot.tsx's BlockPicker/GridCellSlot already do at
    // their own moment of insertion — never a cached built copy sitting
    // around from drag-start.
    const templateIndex = parseTemplateDragId(activeId)
    if (templateIndex !== null) {
      const templates = getTemplates(locale)
      const template = templates[templateIndex]
      if (!template) return
      const { nodes: builtNodes, rootChildId } = template.build()

      const gridCell = parseGridCellDropId(over.id as string)
      if (gridCell) {
        const targetChildren = nodes[gridCell.parentId]?.children.length ?? 0
        insertTemplateNodes(builtNodes, rootChildId, gridCell.parentId, targetChildren, { col: gridCell.col, row: gridCell.row })
        return
      }
      const slot = parseSlotId(over.id as string)
      if (!slot) return
      insertTemplateNodes(builtNodes, rootChildId, slot.parentId, slot.index)
      return
    }

    // ── Reordering/reparenting an existing node — unchanged from before ──
    const node = nodes[activeId]
    if (!node) return

    const gridCell = parseGridCellDropId(over.id as string)
    if (gridCell) {
      const targetChildren = nodes[gridCell.parentId]?.children.length ?? 0
      moveNode(activeId, gridCell.parentId, targetChildren, { col: gridCell.col, row: gridCell.row })
      return
    }

    const slot = parseSlotId(over.id as string)
    if (!slot) return
    moveNode(activeId, slot.parentId, slot.index)
  }

  if (tooNarrow) return <MobileBlockModal />

  // Drag-overlay ghost content — covers all three cases now: dragging an
  // existing canvas node (draggingNode present, look up its type's def),
  // dragging a fresh palette tile (paletteType present, no node exists yet
  // so fall back to the NODE_REGISTRY def directly), and dragging a
  // template tile (templateIndex present — look up icon/label off the
  // Template itself rather than NODE_REGISTRY, since a template isn't a
  // single node type).
  const paletteType      = parsePaletteDragId(draggingId)
  const templateIndex    = parseTemplateDragId(draggingId)
  const draggingTemplate = templateIndex !== null ? getTemplates(locale)[templateIndex] ?? null : null
  const draggingNode     = draggingId && !paletteType && templateIndex === null ? nodes[draggingId] : null
  const draggingDef      = paletteType
    ? NODE_REGISTRY[paletteType]
    : (draggingNode ? NODE_REGISTRY[draggingNode.type] : null)

  const ghostIcon  = draggingTemplate?.icon  ?? draggingDef?.icon
  const ghostLabel = draggingTemplate?.label ?? draggingDef?.label
  const hasGhost   = !!draggingTemplate || !!draggingDef

  return (
    <DndContext
      id="page-builder-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[snapCenterToCursor]}
      measuring={measuring}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f9fafb' }}>
        <TopBar />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <main style={{ flex: 1, overflowY: 'auto' }}>
            {mode === 'edit' ? (
              <EditorRenderer />
            ) : (
              <PreviewRenderer nodes={nodes} rootId={rootId} />
            )}
          </main>
          {mode === 'edit' && <ControlPanel />}
        </div>
        <MediaPickerModal />
        <ImageEditorModal />
        <Tutorial />
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
        {hasGhost ? (
          <div
            className="rounded-lg ring-2 ring-violet-400 shadow-2xl opacity-90 bg-white overflow-hidden"
            style={{ minWidth: 120, maxWidth: 320, pointerEvents: 'none' }}
          >
            <div className="bg-violet-600 px-3 py-1 text-white text-xs font-medium flex items-center gap-1.5">
              <span>{ghostIcon}</span>
              <span>{ghostLabel}</span>
            </div>
            <div className="p-3 text-sm text-neutral-500 truncate">
              {draggingNode && (draggingNode.type === 'text' || draggingNode.type === 'heading')
                ? (draggingNode.props.content as string) || ghostLabel
                : ghostLabel}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}