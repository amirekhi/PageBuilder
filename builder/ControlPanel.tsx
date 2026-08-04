'use client'

import React from 'react'
import { useBuilderStore, PREVIEW_WIDTHS, ControlPanelTab } from './store'
import { NODE_REGISTRY } from './registry'
import { NodeMap, PageNode } from './types'
import { StylePanel, CustomCssField, ElementIdField, GlobalColorManager, GlobalTypographyManager, SeoPanel, GridCellSpanField } from './panelComponents'
import { useNodeStyle, patchNodeStyle, hasOverrideAt, clearNodeStyleOverride } from './responsive'
import type { HoverStyleProps } from './customCss'
import { useT, nodeLabel, type DictKey } from './i18n'

const VISIBLE_TABS: ControlPanelTab[] = ['layers', 'style', 'content']

const TAB_LABEL_KEY: Record<ControlPanelTab, DictKey> = {
  layers: 'tabLayers', style: 'tabStyle', content: 'tabContent',
  theme: 'tabLayers', seo: 'tabLayers',
}

export function ControlPanel() {
  const tab            = useBuilderStore(s => s.controlPanelTab)
  const setTab          = useBuilderStore(s => s.setControlPanelTab)
  const selectedNode    = useBuilderStore(s => s.selectedNode())
  const updateProps     = useBuilderStore(s => s.updateProps)
  const tt              = useT()

  return (
    <aside className="w-72 h-full flex flex-col bg-white border-l border-neutral-200 shrink-0 overflow-hidden">
      <div className="flex border-b border-neutral-200 shrink-0" data-tutorial="cp-tabs">
        {VISIBLE_TABS.map(t => (
          <button
            key={t} onClick={() => setTab(t)}
            className={[
              'flex-1 py-3 text-xs font-medium capitalize transition-colors',
              tab === t
                ? 'text-violet-600 border-b-2 border-violet-600'
                : 'text-neutral-400 hover:text-neutral-600',
            ].join(' ')}
          >
            {tt(TAB_LABEL_KEY[t])}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto" data-tutorial="cp-body">
        {tab === 'layers'  && <LayersTab />}
        {tab === 'style'   && <StyleTab   node={selectedNode} onUpdate={updateProps} />}
        {tab === 'content' && <ContentTab node={selectedNode} onUpdate={updateProps} />}
        {tab === 'theme'   && <ThemeTab />}
        {tab === 'seo'     && <div className="p-4"><SeoPanel /></div>}
      </div>
    </aside>
  )
}

function ThemeTab() {
  const t = useT()
  return (
    <div className="p-4 space-y-6">
      <p className="text-neutral-400 text-sm">
        {t('themeTabIntro')}
      </p>
      <GlobalColorManager />
      <GlobalTypographyManager />
    </div>
  )
}

function LayersTab() {
  const nodes      = useBuilderStore(s => s.nodes)
  const rootId     = useBuilderStore(s => s.rootId)
  const selectedId = useBuilderStore(s => s.selectedId)
  const selectNode = useBuilderStore(s => s.selectNode)
  const deleteNode = useBuilderStore(s => s.deleteNode)
  const t          = useT()

  return (
    <div className="p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-2 px-1">{t('pageTree')}</p>
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
  const node   = nodes[nodeId]
  const locale = useBuilderStore(s => s.locale)
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
        <span className="flex-1 truncate font-medium">{nodeLabel(locale, node.type, def?.label ?? node.type)}</span>
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

function StyleTab({ node, onUpdate }: { node: PageNode | null; onUpdate: (id: string, p: Record<string, unknown>) => void }) {
  const editingBreakpoint = useBuilderStore(s => s.editingBreakpoint)
  const style             = useNodeStyle(node)
  const globalCustomCss    = useBuilderStore(s => s.globalCustomCss)
  const setGlobalCustomCss = useBuilderStore(s => s.setGlobalCustomCss)
  const t                  = useT()

  if (!node) {
    return (
      <div className="p-4 space-y-4">
        <p className="text-neutral-400 text-sm">{t('selectBlockForStyle')}</p>
        <CustomCssField value={globalCustomCss} onChange={setGlobalCustomCss} />
      </div>
    )
  }

  const isOverrideBreakpoint = editingBreakpoint !== 'desktop'
  const hasOverride           = isOverrideBreakpoint && hasOverrideAt(node, editingBreakpoint)
  const isSection             = node.type === 'section'
  const isContainer           = NODE_REGISTRY[node.type]?.isContainer ?? false
  const hideSize              = node.type === 'avatar' || node.type === 'spacer'
  const hideWidth              = node.type === 'column' || node.type === 'image' || node.type === 'tabpane'
  const hideBackground         = isSection || node.type === 'column' || node.type === 'tabpane'

  return (
    <div>
      {isOverrideBreakpoint && (
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <span className="text-[10px] font-medium text-violet-600 bg-violet-50 px-2 py-1 rounded-full">
            {PREVIEW_WIDTHS[editingBreakpoint].icon} {t('editingStyleAt', PREVIEW_WIDTHS[editingBreakpoint].label)}
          </span>
          {hasOverride && (
            <button
              onClick={() => clearNodeStyleOverride(node, p => onUpdate(node.id, p), editingBreakpoint)}
              className="text-[10px] font-medium text-neutral-400 hover:text-red-500 transition-colors"
              title={t('removeAllOverridesTitle')}
            >
              {t('resetToDesktop')}
            </button>
          )}
        </div>
      )}
      {isSection && (
        <p className="text-[10px] text-neutral-400 px-4 pt-3 -mb-1">
          {t('positionSpacingNote')}
        </p>
      )}
      <StylePanel
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

function ContentTab({ node, onUpdate }: { node: PageNode | null; onUpdate: (id: string, p: Record<string, unknown>) => void }) {
  const nodes = useBuilderStore(s => s.nodes)
  const style = useNodeStyle(node)
  const t     = useT()

  if (!node) return <Empty text={t('selectBlockForContent')} />
  const def = NODE_REGISTRY[node.type]
  if (!def) return null
  const Panel = def.EditorPanel

  const parentNode  = node.parentId ? nodes[node.parentId] : null
  const isGridChild = parentNode?.type === 'grid'

  return (
    <>
      {isGridChild && (
        <GridCellSpanField
          style={style}
          onChange={partial => patchNodeStyle(node, p => onUpdate(node.id, p), partial)}
        />
      )}
      <Panel node={node} onChange={props => onUpdate(node.id, props)} />
      <ElementIdField
        value={node.props.htmlId as string}
        onChange={id => onUpdate(node.id, { htmlId: id })}
      />
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