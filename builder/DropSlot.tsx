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

// ─── Palette drag id (ControlPanel's Elements tab) ──────────────────────────
// A palette tile drags in a BRAND NEW block, not an existing node — there's
// no node id to hand useDraggable, so the type itself is encoded directly
// into the id string. This is deliberately just a string convention, not a
// new piece of store state: draggingId already flows through the store
// (see setDragging in the DndContext owner — now the top-level page
// component, not EditorRenderer — since DropSlot/GridCellSlot only ever
// check `draggingId !== null` to reveal themselves, this Just Works for a
// palette drag with zero changes to either of those components). The
// top-level drag-end handler parses this same id back out to decide
// whether to call addNode(...) instead of moveNode(...).
export function paletteDragId(type: NodeType): string {
  return `palette::${type}`
}

export function parsePaletteDragId(id: string | null | undefined): NodeType | null {
  if (!id || !id.startsWith('palette::')) return null
  return id.slice('palette::'.length) as NodeType
}

// ─── Template drag id (ControlPanel's Elements → Templates sub-tab) ────────
// Same pattern as paletteDragId above, but for a whole pre-built template
// section rather than a single block. The template ITSELF isn't handed
// through the id — dnd-kit ids must be plain strings — so this only
// encodes the template's INDEX into whatever locale-resolved array
// getTemplates(locale) currently returns. page.tsx's handleDragEnd
// re-resolves that same array (getTemplates(locale) at drop time) and
// looks the index back up, then calls template.build() fresh right there
// — mirroring exactly how DropSlot.tsx's BlockPicker/GridCellSlot already
// call .build() at the moment of insertion rather than caching a built
// copy anywhere.
export function templateDragId(index: number): string {
  return `template::${index}`
}

export function parseTemplateDragId(id: string | null | undefined): number | null {
  if (!id || !id.startsWith('template::')) return null
  const idx = parseInt(id.slice('template::'.length), 10)
  return Number.isNaN(idx) ? null : idx
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
  // DEPRECATED — no longer used by the between-slot branch below. The
  // slot is now fully removed from layout (display:none) while not
  // dragging, so it can never contribute to a flex/grid `gap` in the
  // first place, and the old negative-margin cancellation trick this
  // param drove is unnecessary. Left in the prop signature only so
  // existing call sites in Renderer.tsx don't need to change today; safe
  // to delete from both places whenever convenient.
  gapPx?: number
  // DEPRECATED — see gapPx above; was only ever consumed by the same
  // gap-cancellation logic.
  isPreSlot?: boolean
}

export function DropSlot({ parentId, index, isOnly, isPersistent, axis = 'col' }: DropSlotProps) {
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

  // ── Between-block slot — fully removed from layout until dragging ───────
  //
  // FIX (Editor/Preview height drift on any container using flex `gap`):
  // the previous version kept this slot permanently present as a real
  // flex/grid item — collapsed to w-0/h-0 + opacity:0 while idle, revealed
  // via group-hover. That's the actual bug. `gap` in a flex/grid container
  // reserves space around EVERY item in the layout regardless of that
  // item's own computed size — even a 0×0 item still "counts" for one gap
  // on each side of it. Editor's DOM always has one of these between-slots
  // between every real child (plus one before the first and, usually, one
  // after the last), so a container with N real children has N+1 of these
  // phantom items in Editor vs. zero of them in Preview's DOM. With
  // `gap: 10px` set, that's an extra (N+1)*10px (roughly — depends on
  // axis/wrapping) of reserved space Editor accounts for that Preview
  // never does, which is exactly the drift being reported: a single Text
  // node in a Section with gap set shows different heights between the
  // two views purely because Editor's flex container has extra (invisible)
  // items in it that Preview's doesn't.
  //
  // The only value that removes an element from a flex/grid container's
  // sizing algorithm ENTIRELY — box, size, and gap contribution, all of
  // it — is `display: none`. So instead of collapsing this slot to
  // zero-size-but-still-present, it is now display:none whenever nothing
  // is being dragged, and only becomes a real (border-dashed, drop-target)
  // box while draggingId is set. A display:none item is not "there" as far
  // as `gap` is concerned, so Editor's flex/grid container can never
  // reserve more gap-space than Preview's equivalent container — the two
  // are now structurally identical whenever nothing is being dragged,
  // which is the vast majority of the time a person is looking at the
  // canvas.
  //
  // Trade-off, deliberately accepted: this removes the old click-to-open
  // "+" affordance for inserting BETWEEN two existing blocks — that entry
  // point was also the direct source of the gap-hack (it needed the item
  // to exist, un-collapsed, so you had something to hover and click).
  // Inserting between two blocks is drag-and-drop only now. isOnly's and
  // isPersistent's own click-to-open pickers above are untouched — neither
  // of those is duplicated once per child, so neither ever caused this gap
  // problem in the first place.
  return (
    <div
      ref={setNodeRef}
      className={[
        axis === 'row' ? 'self-stretch shrink-0' : '',
        isDragging
          ? [
              'flex items-center justify-center rounded-lg border-2 border-dashed transition-colors duration-150',
              axis === 'row' ? 'px-5' : 'py-5',
              isOver ? 'border-violet-400 bg-violet-50' : 'border-violet-200 bg-violet-50/20',
            ].join(' ')
          : 'hidden',
      ].filter(Boolean).join(' ')}
    >
      {isDragging && (
        axis === 'row' ? (
          <div className={['w-0.5 rounded-full transition-all', isOver ? 'bg-violet-500 h-16' : 'bg-violet-200 h-8'].join(' ')} />
        ) : (
          <div className={['h-0.5 rounded-full transition-all', isOver ? 'bg-violet-500 w-16' : 'bg-violet-200 w-8'].join(' ')} />
        )
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