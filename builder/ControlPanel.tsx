'use client'

import React, { useState } from 'react'
import { useBuilderStore, PREVIEW_WIDTHS } from './store'
import { NODE_REGISTRY } from './registry'
import { NodeMap, PageNode } from './types'
import { StylePanel, CustomCssField } from './panelComponents'
import { useNodeStyle, patchNodeStyle, hasOverrideAt, clearNodeStyleOverride } from './responsive'
import type { HoverStyleProps } from './customCss'

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
// Every node type now gets the per-field "H" hover toggles rendered inside
// StylePanel (Background color, Text color, Border color, Opacity, Shadow
// each get their own independent toggle) — there's no longer a curated
// HOVER_CAPABLE whitelist here. That whitelist made sense when hover was a
// single panel-wide switch flipping every dual-mode field at once (only
// worth it for a few node types); now each field opts in on its own, so
// gating by node type buys nothing and just means most blocks silently
// lack a feature that costs nothing to expose everywhere.

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
  // Section and Column both have their own, richer background picker in
  // the Content tab (SectionPanel / ColumnPanel) — hiding the Style tab's
  // generic Background field for them avoids two controls silently
  // editing the exact same bgColor value.
  const hideBackground         = isSection || node.type === 'column'

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
        // Resets which fields are mid-hover-edit whenever a different block
        // is selected, instead of carrying that transient UI state over
        // from whatever was previously selected.
        key={node.id}
        style={style}
        onChange={partial => patchNodeStyle(node, p => onUpdate(node.id, p), partial)}
        hideBoxModel={isSection}
        hideBackground={hideBackground}
        hideSize={hideSize}
        hideWidth={hideWidth}
        isContainer={isContainer}
        enableHover
        hoverValue={node.props.styleHover as HoverStyleProps}
        onHoverChange={hover => onUpdate(node.id, { styleHover: hover })}
        breakpointLabel={PREVIEW_WIDTHS[editingBreakpoint].label}
      />
    </div>
  )
}

// ─── Content tab ──────────────────────────────────────────────────────────────

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