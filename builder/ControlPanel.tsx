'use client'

import React, { useState } from 'react'
import { useBuilderStore, PREVIEW_WIDTHS } from './store'
import { NODE_REGISTRY } from './registry'
import { NodeMap, PageNode } from './types'
import { StylePanel, CustomCssField } from './panelComponents'
import { useNodeStyle, patchNodeStyle, hasOverrideAt, clearNodeStyleOverride } from './responsive'

type Tab = 'layers' | 'style' | 'content'

export function ControlPanel() {
  const [tab, setTab]  = useState<Tab>('layers')
  const selectedNode   = useBuilderStore(s => s.selectedNode())
  const updateProps    = useBuilderStore(s => s.updateProps)

  return (
    <aside className="w-72 h-full flex flex-col bg-white border-l border-neutral-200 shrink-0 overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-neutral-200 shrink-0">
        {(['layers','style','content'] as Tab[]).map(t => (
          <button
            key={t} onClick={() => setTab(t)}
            className={[
              'flex-1 py-3 text-xs font-medium capitalize transition-colors',
              tab === t
                ? 'text-violet-600 border-b-2 border-violet-600'
                : 'text-neutral-400 hover:text-neutral-600',
            ].join(' ')}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Panel body */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'layers'  && <LayersTab />}
        {tab === 'style'   && <StyleTab   node={selectedNode} onUpdate={updateProps} />}
        {tab === 'content' && <ContentTab node={selectedNode} onUpdate={updateProps} />}
      </div>
    </aside>
  )
}

// ─── Layers ───────────────────────────────────────────────────────────────────

function LayersTab() {
  const nodes      = useBuilderStore(s => s.nodes)
  const rootId     = useBuilderStore(s => s.rootId)
  const selectedId = useBuilderStore(s => s.selectedId)
  const selectNode = useBuilderStore(s => s.selectNode)
  const deleteNode = useBuilderStore(s => s.deleteNode)

  return (
    <div className="p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-2 px-1">Page tree</p>
      <LayerNode
        nodeId={rootId} nodes={nodes}
        selectedId={selectedId} rootId={rootId}
        onSelect={selectNode} onDelete={deleteNode}
        depth={0}
      />
    </div>
  )
}

function LayerNode({
  nodeId, nodes, selectedId, rootId, onSelect, onDelete, depth,
}: {
  nodeId: string; nodes: NodeMap; selectedId: string | null; rootId: string
  onSelect: (id: string) => void; onDelete: (id: string) => void; depth: number
}) {
  const node = nodes[nodeId]
  if (!node) return null
  const def        = NODE_REGISTRY[node.type]
  const isSelected = selectedId === nodeId

  return (
    <div>
      <div
        onClick={() => onSelect(nodeId)}
        style={{ paddingLeft: 8 + depth * 14 }}
        className={[
          'flex items-center gap-1.5 pr-2 py-1.5 rounded-md cursor-pointer group text-xs transition-colors',
          isSelected ? 'bg-violet-50 text-violet-700' : 'text-neutral-600 hover:bg-neutral-50',
        ].join(' ')}
      >
        <span className="shrink-0 w-4 text-center text-[11px]" aria-hidden>{def?.icon ?? '?'}</span>
        <span className="flex-1 truncate font-medium">{def?.label ?? node.type}</span>
        {nodeId !== rootId && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(nodeId) }}
            className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center text-red-400 hover:text-red-600 rounded transition-opacity text-[10px]"
          >✕</button>
        )}
      </div>
      {node.children.map(cid => (
        <LayerNode
          key={cid} nodeId={cid} nodes={nodes}
          selectedId={selectedId} rootId={rootId}
          onSelect={onSelect} onDelete={onDelete}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}

// ─── Style tab ────────────────────────────────────────────────────────────────
// When NOTHING is selected, shows the page-level global Custom CSS field
// instead of just an empty placeholder — a sensible home for page-wide
// fine-tuning that doesn't belong to any one block.
//
// SECTION IS A SPECIAL CASE for hideBoxModel/hideBackground: SectionPanel
// (the Content tab's panel for this type) already has its own full
// Position/Padding/Margin/Width group, and a strictly more capable
// Background section (flat color + gradient + image + overlay, vs. this
// generic panel's plain-color-only version). Without these flags, Section
// showed every one of those fields TWICE.
//
// SIZE (Width%/Height px) IS A SEPARATE, INDEPENDENT SPECIAL CASE:
//   - hideSize (skips BOTH Width and Height): Avatar and Spacer size
//     themselves via node.props (props.size, props.height respectively),
//     never via style.width/style.height at all — a generic Size control
//     for either would silently do nothing.
//   - hideWidth (skips only Width, Height still shows): Column and Image
//     both already have a richer, dedicated width control in their own
//     Content-tab panel (Fill/Fixed/fraction modes) — but NEITHER panel has
//     a Height control at all, so Height still needs to come from here.
// isContainer is passed through so the Height field knows whether to read/
// write style.height (leaf nodes) or style.minHeight (containers) — this
// exactly matches ResizeHandles.tsx's own onUp logic, so dragging the
// bottom resize handle on the canvas and typing a value in this panel
// always stay in sync, both reading/writing the identical style field.

function StyleTab({ node, onUpdate }: { node: PageNode | null; onUpdate: (id: string, p: Record<string, unknown>) => void }) {
  const editingBreakpoint = useBuilderStore(s => s.editingBreakpoint)
  const style             = useNodeStyle(node)
  const globalCustomCss    = useBuilderStore(s => s.globalCustomCss)
  const setGlobalCustomCss = useBuilderStore(s => s.setGlobalCustomCss)

  if (!node) {
    return (
      <div className="p-4 space-y-4">
        <p className="text-neutral-400 text-sm">Select a block to edit its style — or set page-wide CSS below, applied everywhere regardless of what's selected.</p>
        <CustomCssField value={globalCustomCss} onChange={setGlobalCustomCss} />
      </div>
    )
  }

  const isOverrideBreakpoint = editingBreakpoint !== 'desktop'
  const hasOverride           = isOverrideBreakpoint && hasOverrideAt(node, editingBreakpoint)
  const isSection             = node.type === 'section'
  const isContainer           = NODE_REGISTRY[node.type]?.isContainer ?? false
  const hideSize              = node.type === 'avatar' || node.type === 'spacer'
  const hideWidth             = node.type === 'column' || node.type === 'image'

  return (
    <div>
      {isOverrideBreakpoint && (
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <span className="text-[10px] font-medium text-violet-600 bg-violet-50 px-2 py-1 rounded-full">
            {PREVIEW_WIDTHS[editingBreakpoint].icon} Editing {PREVIEW_WIDTHS[editingBreakpoint].label} style
          </span>
          {hasOverride && (
            <button
              onClick={() => clearNodeStyleOverride(node, p => onUpdate(node.id, p), editingBreakpoint)}
              className="text-[10px] font-medium text-neutral-400 hover:text-red-500 transition-colors"
              title="Remove all overrides for this block at this breakpoint"
            >
              Reset to Desktop
            </button>
          )}
        </div>
      )}
      {isSection && (
        <p className="text-[10px] text-neutral-400 px-4 pt-3 -mb-1">
          Position, spacing, and background for Sections are set in the Content tab, where the fuller controls live.
        </p>
      )}
      <StylePanel
        style={style}
        onChange={partial => patchNodeStyle(node, p => onUpdate(node.id, p), partial)}
        hideBoxModel={isSection}
        hideBackground={isSection}
        hideSize={hideSize}
        hideWidth={hideWidth}
        isContainer={isContainer}
      />
    </div>
  )
}

// ─── Content tab ──────────────────────────────────────────────────────────────
// Every node type's own EditorPanel now gets a shared Custom CSS field
// appended after it — one addition here covers all 15 node types, so no
// individual *Panel component in nodeComponents.tsx needed to change.

function ContentTab({ node, onUpdate }: { node: PageNode | null; onUpdate: (id: string, p: Record<string, unknown>) => void }) {
  if (!node) return <Empty text="Select a block to edit its content" />
  const def = NODE_REGISTRY[node.type]
  if (!def) return null
  const Panel = def.EditorPanel
  return (
    <>
      <Panel node={node} onChange={props => onUpdate(node.id, props)} />
      <CustomCssField
        value={node.props.customCss as string}
        onChange={css => onUpdate(node.id, { customCss: css })}
      />
    </>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-48 px-6">
      <p className="text-neutral-400 text-sm text-center">{text}</p>
    </div>
  )
}