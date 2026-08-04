'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useDroppable } from '@dnd-kit/core'
import { useBuilderStore } from './store'
import { NODE_REGISTRY, BLOCK_GROUPS } from './registry'
import { NodeType, NodeMap } from './types'
import { getTemplates } from './templates'
import { useT, nodeLabel, directionForLocale } from './i18n'

function slotId(parentId: string, index: number) {
  return `slot::${parentId}::${index}`
}

export function parseSlotId(id: string): { parentId: string; index: number } | null {
  const parts = id.split('::')
  if (parts[0] !== 'slot' || parts.length !== 3) return null
  return { parentId: parts[1], index: parseInt(parts[2], 10) }
}

// ─── Grid cell drop target ──────────────────────────────────────────────────
function gridCellDropId(parentId: string, row: number, col: number) {
  return `gridcell::${parentId}::${row}::${col}`
}

export function parseGridCellDropId(id: string): { parentId: string; row: number; col: number } | null {
  const parts = id.split('::')
  if (parts[0] !== 'gridcell' || parts.length !== 4) return null
  return { parentId: parts[1], row: parseInt(parts[2], 10), col: parseInt(parts[3], 10) }
}

// A single empty grid cell's "+" button.
//
// FIX (was position:absolute + tiny centered pill — too small, felt
// detached from the rest of the placeholder family): reverted to a plain
// FLOW element. This is safe here specifically because a Grid track's
// height comes from `minmax(gridRowMinHeight, auto)` (default 100px) —
// that reservation is genuinely independent of content, so a box sized
// `w-full h-full` (no explicit min-height of its own) just fills whatever
// the track already resolved to. It can never REQUEST more height than
// that, since height:100% is passive (fills what's given), not a demand.
// Always visible — no hover-gating needed, since it never risks growing
// the row regardless of visibility.
export function GridCellSlot({
  parentId, row, col,
}: {
  parentId: string
  row:      number
  col:      number
}) {
  const [open, setOpen] = useState(false)
  const anchorRef       = useRef<HTMLDivElement>(null)
  const addNode         = useBuilderStore(s => s.addNode)
  const draggingId      = useBuilderStore(s => s.draggingId)
  const isDragging      = draggingId !== null

  const { setNodeRef, isOver } = useDroppable({
    id:   gridCellDropId(parentId, row, col),
    data: { parentId, row, col, isGridCell: true },
  })

  function handleSelectBlock(type: NodeType) {
    const parentChildren = useBuilderStore.getState().nodes[parentId]?.children.length ?? 0
    addNode(type, parentId, parentChildren, { gridColStart: col, gridRowStart: row })
    setOpen(false)
  }

  function handleSelectTemplate(template: ReturnType<typeof getTemplates>[number]) {
    const { nodes: builtNodes, rootChildId } = template.build()
    useBuilderStore.setState(prev => {
      const next: NodeMap = JSON.parse(JSON.stringify(prev.nodes))
      const snap = JSON.parse(JSON.stringify(prev.nodes))
      const newPast = [snap, ...prev.past].slice(0, 50)
      Object.values(builtNodes).forEach(n => { next[n.id] = { ...n } })
      const rootStyle = (next[rootChildId].props.style as Record<string, unknown>) ?? {}
      next[rootChildId].props = {
        ...next[rootChildId].props,
        style: { ...rootStyle, gridColStart: col, gridRowStart: row },
      }
      next[parentId].children.push(rootChildId)
      next[rootChildId].parentId = parentId
      return { nodes: next, past: newPast, future: [], selectedId: rootChildId }
    })
    setOpen(false)
  }

  return (
    // setNodeRef on THIS full-cell div — a generous, easy-to-hit drop
    // target while dragging — but onClick lives only on the box itself, so
    // clicking anywhere else in the cell doesn't accidentally open the
    // picker (no pointer-events tricks needed since this is a real,
    // correctly-bounded element, not an overlay covering something else).
    <div
      ref={setNodeRef}
      style={{ gridColumn: col, gridRow: row }}
      className="w-full h-full"
    >
      <div
        ref={anchorRef}
        onClick={e => { e.stopPropagation(); if (!isDragging) setOpen(v => !v) }}
        className={[
          'w-full h-full flex items-center justify-center rounded-lg cursor-pointer select-none',
          'border-2 border-dashed transition-colors duration-150',
          isDragging
            ? isOver
              ? 'border-violet-400 bg-violet-50 text-violet-600'
              : 'border-violet-200 bg-violet-50/20 text-violet-300'
            : 'border-neutral-200 hover:border-violet-300 hover:bg-violet-50/40 text-neutral-400 hover:text-violet-500',
        ].join(' ')}
      >
        <span className="text-base font-light leading-none">+</span>
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

interface DropSlotProps {
  parentId: string
  index:    number
  isOnly?:  boolean
  isPersistent?: boolean
  axis?: 'row' | 'col'
  // Gap-cancellation — see the doc comment on the between-slot branch
  // below for the full mechanism (now CSS-variable-driven so it can be
  // switched off the instant the slot is revealed, instead of a
  // permanent inline negative margin).
  gapPx?: number
  isPreSlot?: boolean
}

export function DropSlot({ parentId, index, isOnly, isPersistent, axis = 'col', gapPx = 0, isPreSlot = false }: DropSlotProps) {
  const [open, setOpen] = useState(false)
  const anchorRef       = useRef<HTMLDivElement>(null)
  const addNode         = useBuilderStore(s => s.addNode)
  const draggingId      = useBuilderStore(s => s.draggingId)
  const isDragging      = draggingId !== null
  const t               = useT()

  const { setNodeRef, isOver } = useDroppable({
    id:   slotId(parentId, index),
    data: { parentId, index },
  })

  function handleSelectBlock(type: NodeType) {
    addNode(type, parentId, index)
    setOpen(false)
  }

  function handleSelectTemplate(template: ReturnType<typeof getTemplates>[number]) {
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
          {t('addBlockPersistent')}
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
              <span className="text-base font-light">+</span> {t('addABlockShort').replace(/^\+\s*/, '')}
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

  // ── Between-block slot — invisible until parent is hovered ──────────────
  // FIX (the "now inside the element instead of sandwiched between
  // elements" report): gap-cancellation used to be a permanent inline
  // negative margin (marginTop/marginBottom: -gapPx), applied REGARDLESS
  // of whether the slot was collapsed or revealed. That's correct only
  // while collapsed (h-0) — the moment the slot is revealed on hover and
  // expands to its real size, that same negative margin was STILL there,
  // pulling the now-visible box up/over so it visually overlapped into
  // the neighboring element instead of creating a clean gap between two
  // elements. That's what made a revealed slot look like it was "inside"
  // the adjacent element rather than properly sandwiched.
  //
  // Fix: drive the cancellation through a CSS custom property (--gc) plus
  // Tailwind arbitrary-value classes, so it can be switched OFF the
  // instant the slot becomes visible — via the same group-hover/hover
  // mechanism already used for height/opacity — instead of always being
  // applied via JS inline style. (Arbitrary-value classes like
  // `mt-[var(--gc)]` are safe here: the CLASS TEXT is a complete literal
  // string in this file, same requirement Tailwind's scanner has
  // everywhere else in this codebase — only the CSS variable's VALUE is
  // dynamic, set via inline style, which Tailwind never needs to see.)
  // While actively dragging, no cancellation is applied at all — the slot
  // is already at full size via the isDragging branch below, so it
  // legitimately needs (and gets) a full real gap on both sides, same as
  // before.
  const outerClassName = axis === 'row'
    ? 'relative group/slot self-stretch shrink-0'
    : 'relative group/slot'

  const gapCancelStyle: React.CSSProperties | undefined =
    (!isDragging && gapPx > 0) ? ({ ['--gc' as any]: `${-gapPx}px` }) : undefined

  const gapCancelClass = (!isDragging && gapPx > 0)
    ? (axis === 'row'
        ? (isPreSlot
            ? 'me-[var(--gc)] group-hover/container:me-0 hover:!me-0'
            : 'ms-[var(--gc)] group-hover/container:ms-0 hover:!ms-0')
        : (isPreSlot
            ? 'mb-[var(--gc)] group-hover/container:mb-0 hover:!mb-0'
            : 'mt-[var(--gc)] group-hover/container:mt-0 hover:!mt-0'))
    : ''

  const innerClassName = axis === 'row'
    ? [
        'h-full flex items-center justify-center cursor-pointer select-none transition-all duration-150 overflow-hidden',
        isDragging
          ? isOver
            ? 'px-5 border-2 border-dashed border-violet-400 bg-violet-50 rounded-lg'
            : 'px-5 border-2 border-dashed border-violet-200 bg-violet-50/20 rounded-lg'
          : 'w-0 opacity-0 group-hover/container:w-6 group-hover/container:opacity-100 hover:!w-6 hover:!opacity-100',
      ].join(' ')
    : [
        'w-full flex items-center justify-center cursor-pointer select-none transition-all duration-150 overflow-hidden',
        isDragging
          ? isOver
            ? 'py-5 border-2 border-dashed border-violet-400 bg-violet-50 rounded-lg'
            : 'py-5 border-2 border-dashed border-violet-200 bg-violet-50/20 rounded-lg'
          : 'h-0 opacity-0 group-hover/container:h-6 group-hover/container:opacity-100 hover:!h-6 hover:!opacity-100',
      ].join(' ')

  return (
    <div ref={anchorRef} className={[outerClassName, gapCancelClass].filter(Boolean).join(' ')} style={gapCancelStyle}>
      <div
        ref={setNodeRef}
        onClick={e => { e.stopPropagation(); if (!isDragging) setOpen(v => !v) }}
        className={innerClassName}
      >
        {isDragging ? (
          axis === 'row' ? (
            <div className={['w-0.5 rounded-full transition-all', isOver ? 'bg-violet-500 h-16' : 'bg-violet-200 h-8'].join(' ')} />
          ) : (
            <div className={['h-0.5 rounded-full transition-all', isOver ? 'bg-violet-500 w-16' : 'bg-violet-200 w-8'].join(' ')} />
          )
        ) : axis === 'row' ? (
          <div className="h-full flex flex-col items-center gap-2 py-2">
            <div className="flex-1 w-px bg-violet-300 rounded" />
            <span className="text-[10px] text-violet-400 font-medium leading-none">+</span>
            <div className="flex-1 w-px bg-violet-300 rounded" />
          </div>
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
  onSelectTemplate: (template: ReturnType<typeof getTemplates>[number]) => void
  onClose:          () => void
}

export function BlockPicker({ anchorRef, onSelectBlock, onSelectTemplate, onClose }: BlockPickerProps) {
  const pickerRef         = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [tab, setTab]     = useState<PickerTab>('blocks')
  const locale            = useBuilderStore(s => s.locale)
  const dir               = directionForLocale(locale)
  const t                 = useT()
  const templates         = getTemplates(locale)

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

    const viewportH   = typeof window !== 'undefined' ? window.innerHeight : 800
    const viewportW   = typeof window !== 'undefined' ? window.innerWidth  : 1200
    const PICKER_H    = 360
    const PICKER_W    = 256
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
      types: g.types.filter(type => {
        if (!query) return true
        const label = nodeLabel(locale, type, NODE_REGISTRY[type]?.label ?? '')
        return label.toLowerCase().includes(query.toLowerCase())
      }),
    }))
    .filter(g => g.types.length > 0)

  const filteredTemplates = templates.filter(tpl =>
    !query || tpl.label.toLowerCase().includes(query.toLowerCase())
  )

  const pickerContent = (
    <div
      ref={pickerRef}
      dir={dir}
      style={{ position: 'fixed', top, left, zIndex: 9999 }}
      className="w-64 bg-white rounded-xl border border-neutral-200 shadow-xl p-3 max-h-[80vh] overflow-y-auto"
      onMouseDown={e => e.stopPropagation()}
    >
      <input
        autoFocus
        placeholder={tab === 'blocks' ? t('searchBlocks') : t('searchTemplates')}
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-1 focus:ring-violet-400 text-start"
      />
      <div className="flex rounded-lg bg-neutral-100 p-0.5 mb-3 gap-0.5">
        <PickerTabBtn active={tab === 'blocks'}    onClick={() => { setTab('blocks');    setQuery('') }}>{t('blocksTab')}</PickerTabBtn>
        <PickerTabBtn active={tab === 'templates'} onClick={() => { setTab('templates'); setQuery('') }}>{t('templatesTab')}</PickerTabBtn>
      </div>

      {tab === 'blocks' && (
        <div className="space-y-3 max-h-72 overflow-y-auto">
          {filteredGroups.map(group => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5 px-1 text-start">
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
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-neutral-700 hover:bg-violet-50 hover:text-violet-700 transition-colors text-start"
                    >
                      <span className="text-base shrink-0 w-5 text-center" aria-hidden>{def.icon}</span>
                      <span className="truncate">{nodeLabel(locale, type, def.label)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {filteredGroups.length === 0 && (
            <p className="text-sm text-neutral-400 text-center py-4">{t('noBlocksFound')}</p>
          )}
        </div>
      )}

      {tab === 'templates' && (
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {filteredTemplates.map((tpl) => (
            <button
              key={tpl.label}
              onClick={() => onSelectTemplate(tpl)}
              className={[
                'w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-violet-50 transition-colors group',
                dir === 'rtl' ? 'flex-row-reverse' : '',
              ].join(' ')}
            >
              <span className="text-xl shrink-0">{tpl.icon}</span>
              <div className={['min-w-0 flex-1', dir === 'rtl' ? 'text-right' : 'text-left'].join(' ')}>
                <p className="text-sm font-medium text-neutral-700 group-hover:text-violet-700 leading-tight truncate">{tpl.label}</p>
                <p className="text-[10px] text-neutral-400 truncate mt-0.5">{tpl.thumbnail}</p>
              </div>
            </button>
          ))}
          {filteredTemplates.length === 0 && (
            <p className="text-sm text-neutral-400 text-center py-4">{t('noTemplatesFound')}</p>
          )}
        </div>
      )}
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(pickerContent, document.body)
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