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
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useBuilderStore, PREVIEW_WIDTHS } from './store'
import { NODE_REGISTRY } from './registry'
import { NodeMap } from './types'
import { SelectableShell } from './SelectableShell'
import { DropSlot, parseSlotId } from './DropSlot'
import { EmptyCanvasPrompt } from './TemplatePicker'

// ─── EditorRenderer ───────────────────────────────────────────────────────────

export function EditorRenderer() {
  const nodes       = useBuilderStore(s => s.nodes)
  const rootId      = useBuilderStore(s => s.rootId)
  const moveNode    = useBuilderStore(s => s.moveNode)
  const selectNode  = useBuilderStore(s => s.selectNode)
  const setDragging = useBuilderStore(s => s.setDragging)
  const draggingId  = useBuilderStore(s => s.draggingId)

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
        {/* Page surface — identical maxWidth to desktop preview so edit and preview match */}
        <div
          className="bg-white mx-auto min-h-full"
          style={{
            maxWidth:     1280,
            minHeight:    600,
            borderRadius: 6,
            border:       '1px solid #e2e8f0',
            boxShadow:    '0 2px 12px 0 rgba(0,0,0,0.06)',
            overflow:     'visible',
          }}
        >
          <EmptyCanvasPrompt />
          <RenderEditorNode nodeId={rootId} nodes={nodes} />
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
  if (!node) return null
  const def = NODE_REGISTRY[node.type]
  if (!def) return null

  const { EditorComponent } = def
  let content: React.ReactNode = null

  if (def.isContainer) {
    const ids = node.children
    if (ids.length === 0) {
      content = <DropSlot parentId={node.id} index={0} isOnly />
    } else {
      const items: React.ReactNode[] = [
        <DropSlot key="slot-pre" parentId={node.id} index={0} />,
      ]
      ids.forEach((childId, i) => {
        items.push(<RenderEditorNode key={childId} nodeId={childId} nodes={nodes} />)
        items.push(<DropSlot key={`slot-${i}`} parentId={node.id} index={i + 1} />)
      })
      content = <>{items}</>
    }
  }

  // When this container is selected, show a persistent "Add block" button
  // at the bottom so finding the thin hover-only slots isn't the only way in.
  const showPersistentAdd = def.isContainer && selectedId === node.id && node.children.length > 0

  return (
    <SelectableShell node={node}>
      <EditorComponent node={node}>{content}</EditorComponent>
      {showPersistentAdd && (
        <DropSlot parentId={node.id} index={node.children.length} isPersistent />
      )}
    </SelectableShell>
  )
}

// ─── PreviewRenderer ──────────────────────────────────────────────────────────

export function PreviewRenderer({ nodes, rootId }: { nodes: NodeMap; rootId: string }) {
  const previewWidth = useBuilderStore(s => s.previewWidth)
  const cfg          = PREVIEW_WIDTHS[previewWidth]

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
          <RenderPreviewNode nodeId={rootId} nodes={nodes} />
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 1280, background: 'white', minHeight: '100vh' }}>
          <RenderPreviewNode nodeId={rootId} nodes={nodes} />
        </div>
      )}

      {previewWidth !== 'desktop' && (
        <p style={{ marginTop: 12, fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
          {cfg.label} — {cfg.px}px
        </p>
      )}
    </div>
  )
}

function RenderPreviewNode({ nodeId, nodes }: { nodeId: string; nodes: NodeMap }) {
  const node = nodes[nodeId]
  if (!node) return null
  const def = NODE_REGISTRY[node.type]
  if (!def) return null

  const children = node.children.map(cid => (
    <RenderPreviewNode key={cid} nodeId={cid} nodes={nodes} />
  ))

  return (
    <def.PreviewComponent node={node}>
      {children.length > 0 ? children : undefined}
    </def.PreviewComponent>
  )
}