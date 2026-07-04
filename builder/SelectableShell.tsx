'use client'

import React, { useRef } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { useBuilderStore } from './store'
import { PageNode } from './types'
import { NODE_REGISTRY } from './registry'
import { ResizeHandles } from './ResizeHandles'
import { StyleProps, buildBoxSizingStyle } from './styleMapper'

interface SelectableShellProps {
  node:     PageNode
  children: React.ReactNode
}

export function SelectableShell({ node, children }: SelectableShellProps) {
  const selectedId    = useBuilderStore(s => s.selectedId)
  const draggingId    = useBuilderStore(s => s.draggingId)
  const selectNode    = useBuilderStore(s => s.selectNode)
  const deleteNode    = useBuilderStore(s => s.deleteNode)
  const duplicateNode = useBuilderStore(s => s.duplicateNode)
  const rootId        = useBuilderStore(s => s.rootId)
  const isSelected    = selectedId === node.id
  const isDragging    = draggingId === node.id
  const isRoot        = node.id === rootId
  const isContainer   = NODE_REGISTRY[node.type]?.isContainer ?? false
  const ref           = useRef<HTMLDivElement>(null)

  // Everything gets resize handles except text/heading (kept auto-sized to
  // their content) and the root node (the page canvas itself isn't resizable).
  const canResize = !isRoot

  // The wrapper (this div) is the thing that actually participates in the
  // parent's layout (flex item inside Columns/Section, etc). It needs to
  // carry the same box-affecting style as the node itself, or the outline/
  // resize handles will visually detach from what's rendering inside them.
  const nodeStyle       = (node.props.style as StyleProps) ?? {}
  const boxSizingStyle  = isRoot ? {} : buildBoxSizingStyle(nodeStyle)

  const { attributes, listeners, setNodeRef, setActivatorNodeRef } = useDraggable({
    id:       node.id,
    disabled: isRoot,
    data:     { nodeId: node.id, type: node.type },
  })

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    selectNode(node.id)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isSelected) return
    if ((e.key === 'Delete' || e.key === 'Backspace') && e.target === ref.current) {
      e.preventDefault()
      if (!isRoot) deleteNode(node.id)
    }
  }

  const selectedOutline = '2px solid #7c3aed'
  const hoverOutline    = '1px dashed #a78bfa'

  return (
    <div
      ref={(el) => {
        ;(ref as React.MutableRefObject<HTMLDivElement | null>).current = el
        setNodeRef(el)
      }}
      data-node-id={node.id}
      data-node-type={node.type}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={e => {
        if (!isSelected && !isRoot)
          (e.currentTarget as HTMLDivElement).style.outline = hoverOutline
      }}
      onMouseLeave={e => {
        if (!isSelected && !isRoot)
          (e.currentTarget as HTMLDivElement).style.outline = 'none'
      }}
      // group/container lets nested DropSlots reveal themselves on hover of
      // their nearest container ancestor (see DropSlot's group-hover/container class)
      className={isContainer ? 'group/container' : undefined}
      style={{
        position:      'relative',
        outline:       isRoot ? 'none' : isSelected ? selectedOutline : 'none',
        outlineOffset: '1px',
        opacity:       isDragging ? 0.35 : 1,
        transition:    'opacity 0.1s',
        cursor:        isRoot ? 'default' : 'pointer',
        ...boxSizingStyle,
      }}
      {...attributes}
    >
      {/* Floating toolbar — only when selected */}
      {isSelected && !isRoot && (
        <div
          style={{ position: 'absolute', top: -34, left: 0, zIndex: 1000 }}
          className="flex items-center gap-0.5 bg-white border border-neutral-200 rounded-lg shadow-lg px-1.5 py-1 pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          <span className="text-[11px] font-medium text-violet-600 px-2 py-0.5 bg-violet-50 rounded mr-1 select-none">
            {node.type}
          </span>
          <button
            ref={setActivatorNodeRef}
            {...listeners}
            title="Drag to move"
            className="w-6 h-6 flex items-center justify-center rounded text-xs text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-grab active:cursor-grabbing"
          >
            ⠿
          </button>
          <ToolBtn title="Duplicate (⌘D)" onClick={() => duplicateNode(node.id)}>⎘</ToolBtn>
          <ToolBtn title="Delete"          onClick={() => deleteNode(node.id)} danger>✕</ToolBtn>
        </div>
      )}

      {children}

      {/* Drag-to-resize handles — only when selected and this type supports it */}
      {isSelected && canResize && (
        <ResizeHandles node={node} shellRef={ref} />
      )}
    </div>
  )
}

function ToolBtn({ children, title, onClick, danger }: {
  children: React.ReactNode; title: string; onClick: () => void; danger?: boolean
}) {
  return (
    <button
      title={title} onClick={onClick}
      className={[
        'w-6 h-6 flex items-center justify-center rounded text-xs transition-colors',
        danger
          ? 'text-red-400 hover:text-red-600 hover:bg-red-50'
          : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100',
      ].join(' ')}
    >
      {children}
    </button>
  )
}