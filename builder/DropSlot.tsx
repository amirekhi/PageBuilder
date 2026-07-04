'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useBuilderStore } from './store'
import { NODE_REGISTRY, BLOCK_GROUPS } from './registry'
import { NodeType, NodeMap } from './types'
import { TEMPLATES } from './templates'

function slotId(parentId: string, index: number) {
  return `slot::${parentId}::${index}`
}

export function parseSlotId(id: string): { parentId: string; index: number } | null {
  const parts = id.split('::')
  if (parts[0] !== 'slot' || parts.length !== 3) return null
  return { parentId: parts[1], index: parseInt(parts[2], 10) }
}

interface DropSlotProps {
  parentId: string
  index:    number
  isOnly?:  boolean
  // When true this slot is the persistent "Add block" button shown on selected containers
  isPersistent?: boolean
}

export function DropSlot({ parentId, index, isOnly, isPersistent }: DropSlotProps) {
  const [open, setOpen] = useState(false)
  const anchorRef       = useRef<HTMLDivElement>(null)
  const addNode         = useBuilderStore(s => s.addNode)
  const draggingId      = useBuilderStore(s => s.draggingId)
  const isDragging      = draggingId !== null

  const { setNodeRef, isOver } = useDroppable({
    id:   slotId(parentId, index),
    data: { parentId, index },
  })

  function handleSelectBlock(type: NodeType) {
    addNode(type, parentId, index)
    setOpen(false)
  }

  function handleSelectTemplate(templateIndex: number) {
    const template = TEMPLATES[templateIndex]
    if (!template) return
    const { nodes: builtNodes, rootChildId } = template.build()
    useBuilderStore.setState(prev => {
      const next: NodeMap = JSON.parse(JSON.stringify(prev.nodes))
      const snap = JSON.parse(JSON.stringify(prev.nodes))
      const newPast = [snap, ...prev.past].slice(0, 50)
      Object.values(builtNodes).forEach(n => { next[n.id] = { ...n } })
      next[parentId].children.splice(index, 0, rootChildId)
      next[rootChildId].parentId = parentId
      return { nodes: next, past: newPast, future: [], selectedId: rootChildId }
    })
    setOpen(false)
  }

  // ── Persistent add-block button (shown when parent is selected) ──
  if (isPersistent) {
    return (
      <div ref={anchorRef} className="relative px-3 pb-3 pt-1">
        <div
          ref={setNodeRef}
          onClick={e => { e.stopPropagation(); if (!isDragging) setOpen(v => !v) }}
          className={[
            'w-full flex items-center justify-center gap-2 py-2 rounded-lg cursor-pointer',
            'border-2 border-dashed transition-all duration-150 text-xs font-medium select-none',
            isOver
              ? 'border-violet-400 bg-violet-50 text-violet-600'
              : 'border-violet-200 text-violet-400 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-600',
          ].join(' ')}
        >
          <span className="text-base font-light leading-none">+</span>
          Add block
        </div>
        {open && !isDragging && (
          <BlockPicker
            anchorRef={anchorRef as React.RefObject<HTMLDivElement>}
            onSelectBlock={handleSelectBlock}
            onSelectTemplate={handleSelectTemplate}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    )
  }

  // ── Empty container slot ──
  if (isOnly) {
    return (
      <div ref={anchorRef} className="relative p-3">
        <div
          ref={setNodeRef}
          onClick={e => { e.stopPropagation(); if (!isDragging) setOpen(v => !v) }}
          className={[
            'w-full flex items-center justify-center gap-1.5 rounded-lg cursor-pointer',
            'border-2 border-dashed transition-all duration-150 select-none',
            isDragging
              ? isOver
                ? 'py-10 border-violet-400 bg-violet-50 text-violet-600'
                : 'py-10 border-violet-200 bg-violet-50/20 text-violet-300'
              : 'py-6 border-neutral-200 hover:border-violet-300 hover:bg-violet-50/40 text-neutral-400 hover:text-violet-500',
          ].join(' ')}
        >
          {isDragging ? (
            <div className={['h-0.5 rounded-full transition-all', isOver ? 'bg-violet-500 w-16' : 'bg-violet-200 w-8'].join(' ')} />
          ) : (
            <span className="text-xs flex items-center gap-1.5">
              <span className="text-base font-light">+</span> Add a block
            </span>
          )}
        </div>
        {open && !isDragging && (
          <BlockPicker
            anchorRef={anchorRef as React.RefObject<HTMLDivElement>}
            onSelectBlock={handleSelectBlock}
            onSelectTemplate={handleSelectTemplate}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    )
  }

  // ── Between-block slot — invisible until parent is hovered (via CSS group) ──
  return (
    <div ref={anchorRef} className="relative group/slot">
      <div
        ref={setNodeRef}
        onClick={e => { e.stopPropagation(); if (!isDragging) setOpen(v => !v) }}
        className={[
          'w-full flex items-center justify-center cursor-pointer select-none transition-all duration-150',
          isDragging
            ? isOver
              ? 'py-5 border-2 border-dashed border-violet-400 bg-violet-50 rounded-lg'
              : 'py-5 border-2 border-dashed border-violet-200 bg-violet-50/20 rounded-lg'
            // Invisible by default, revealed when the nearest group-hover parent is hovered
            // The 'group-hover/container' class is set on SelectableShell for containers
            : 'py-1 opacity-0 group-hover/container:opacity-100 hover:!opacity-100',
        ].join(' ')}
      >
        {isDragging ? (
          <div className={['h-0.5 rounded-full transition-all', isOver ? 'bg-violet-500 w-16' : 'bg-violet-200 w-8'].join(' ')} />
        ) : (
          <div className="w-full flex items-center gap-2 px-2">
            <div className="flex-1 h-px bg-violet-300 rounded" />
            <span className="text-[10px] text-violet-400 font-medium leading-none">+</span>
            <div className="flex-1 h-px bg-violet-300 rounded" />
          </div>
        )}
      </div>
      {open && !isDragging && (
        <BlockPicker
          anchorRef={anchorRef as React.RefObject<HTMLDivElement>}
          onSelectBlock={handleSelectBlock}
          onSelectTemplate={handleSelectTemplate}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}

// ─── BlockPicker ──────────────────────────────────────────────────────────────

type PickerTab = 'blocks' | 'templates'

interface BlockPickerProps {
  anchorRef:        React.RefObject<HTMLDivElement>
  onSelectBlock:    (type: NodeType) => void
  onSelectTemplate: (index: number) => void
  onClose:          () => void
}

export function BlockPicker({ anchorRef, onSelectBlock, onSelectTemplate, onClose }: BlockPickerProps) {
  const pickerRef         = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [tab, setTab]     = useState<PickerTab>('blocks')

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        pickerRef.current && !pickerRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [anchorRef, onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

    const rect = anchorRef.current?.getBoundingClientRect()

    // The picker is `position: fixed`, so it's already positioned relative to
    // the viewport — window.scrollY doesn't belong here (that would only be
    // correct for `position: absolute` in document flow), and more importantly
    // there was no vertical bounds check at all: only `left` was clamped to
    // stay on-screen horizontally, so clicking "+" anywhere in the bottom
    // ~400px of the viewport pushed the picker past the bottom edge with no
    // way to scroll to it. Fix: measure space below vs. above the anchor and
    // flip to open upward when there isn't enough room below.
    const viewportH   = typeof window !== 'undefined' ? window.innerHeight : 800
    const viewportW   = typeof window !== 'undefined' ? window.innerWidth  : 1200
    const PICKER_H    = 360  // approx max height (search bar + tabs + max-h-72 list + padding)
    const PICKER_W    = 256  // matches w-64
    const GAP         = 8

    const anchorTop    = rect?.top    ?? 0
    const anchorBottom = rect?.bottom ?? 0
    const anchorLeft   = rect?.left   ?? 0

    const spaceBelow = viewportH - anchorBottom
    const opensUp    = spaceBelow < PICKER_H && anchorTop > spaceBelow

    const top = opensUp
      ? Math.max(GAP, anchorTop - PICKER_H - GAP)
      : anchorBottom + GAP

    const left = Math.min(Math.max(GAP, anchorLeft), viewportW - PICKER_W - GAP)

  const filteredGroups = BLOCK_GROUPS
    .map(g => ({
      ...g,
      types: g.types.filter(t =>
        !query || NODE_REGISTRY[t]?.label.toLowerCase().includes(query.toLowerCase())
      ),
    }))
    .filter(g => g.types.length > 0)

  const filteredTemplates = TEMPLATES.filter(t =>
    !query || t.label.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div
      ref={pickerRef}
      style={{ position: 'fixed', top, left, zIndex: 9999 }}
      className="w-64 bg-white rounded-xl border border-neutral-200 shadow-xl p-3 max-h-[80vh] overflow-y-auto"
      onMouseDown={e => e.stopPropagation()}
    >
      <input
        autoFocus
        placeholder={tab === 'blocks' ? 'Search blocks…' : 'Search templates…'}
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
      />
      <div className="flex rounded-lg bg-neutral-100 p-0.5 mb-3 gap-0.5">
        <PickerTabBtn active={tab === 'blocks'}    onClick={() => { setTab('blocks');    setQuery('') }}>Blocks</PickerTabBtn>
        <PickerTabBtn active={tab === 'templates'} onClick={() => { setTab('templates'); setQuery('') }}>Templates</PickerTabBtn>
      </div>

      {tab === 'blocks' && (
        <div className="space-y-3 max-h-72 overflow-y-auto">
          {filteredGroups.map(group => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5 px-1">
                {group.label}
              </p>
              <div className="grid grid-cols-2 gap-1">
                {group.types.map(type => {
                  const def = NODE_REGISTRY[type]
                  if (!def) return null
                  return (
                    <button
                      key={type}
                      onClick={() => onSelectBlock(type)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm text-neutral-700 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                    >
                      <span className="text-base shrink-0 w-5 text-center" aria-hidden>{def.icon}</span>
                      <span className="truncate">{def.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {filteredGroups.length === 0 && (
            <p className="text-sm text-neutral-400 text-center py-4">No blocks found</p>
          )}
        </div>
      )}

      {tab === 'templates' && (
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {filteredTemplates.map((t) => (
            <button
              key={t.label}
              onClick={() => onSelectTemplate(TEMPLATES.indexOf(t))}
              className="w-full text-left flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-violet-50 transition-colors group"
            >
              <span className="text-xl shrink-0">{t.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-700 group-hover:text-violet-700 leading-tight truncate">{t.label}</p>
                <p className="text-[10px] text-neutral-400 truncate mt-0.5">{t.thumbnail}</p>
              </div>
            </button>
          ))}
          {filteredTemplates.length === 0 && (
            <p className="text-sm text-neutral-400 text-center py-4">No templates found</p>
          )}
        </div>
      )}
    </div>
  )
}

function PickerTabBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex-1 py-1 rounded-md text-xs font-medium transition-colors',
        active ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700',
      ].join(' ')}
    >
      {children}
    </button>
  )
}