'use client'

import React, { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { useBuilderStore, PREVIEW_WIDTHS, ControlPanelTab } from './store'
import { NODE_REGISTRY, BLOCK_GROUPS } from './registry'
import { NodeMap, PageNode, NodeType } from './types'
import { StylePanel,CustomJsField, CustomCssField, ElementIdField, GlobalColorManager, GlobalTypographyManager, SeoPanel, GridCellSpanField } from './panelComponents'
import { useNodeStyle, patchNodeStyle, hasOverrideAt, clearNodeStyleOverride } from './responsive'
import { paletteDragId, templateDragId } from './DropSlot'
import { getTemplates, type Template } from './templates'
import { getPageTemplates, useInsertPageTemplate, PageTemplateGrid } from './pageTemplates'
import { useInsertTemplate } from './TemplatePicker'
import type { HoverStyleProps } from './customCss'
import { useT, useDirection, nodeLabel, blockGroupLabel, type DictKey } from './i18n'

// 'elements' added FIRST — this is the new Elementor-style palette tab (see
// ElementsTab below). Everything else in this file is unchanged; this tab
// slots into the exact same tab-bar/tab-body machinery layers/style/content
// already use.
const VISIBLE_TABS: ControlPanelTab[] = ['elements', 'layers', 'style', 'content']

const TAB_LABEL_KEY: Record<ControlPanelTab, DictKey> = {
  elements: 'tabElements',
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
        {tab === 'elements' && <ElementsTab />}
        {tab === 'layers'  && <LayersTab />}
        {tab === 'style'   && <StyleTab   node={selectedNode} onUpdate={updateProps} />}
        {tab === 'content' && <ContentTab node={selectedNode} onUpdate={updateProps} />}
        {tab === 'theme'   && <ThemeTab />}
        {tab === 'seo'     && <div className="p-4"><SeoPanel /></div>}
      </div>
    </aside>
  )
}

// ─── Elements tab (Elementor-style palette) ────────────────────────────────
// Three sub-tabs, mirroring the old EmptyCanvasPrompt modal's Templates/
// Pages/Components split (TemplatePicker.tsx's AddContentModal) — except
// this one lives permanently in the sidebar instead of a one-shot modal
// that only ever appeared on an empty canvas, which is exactly why Pages
// below needs its own confirm step that modal never needed (see PagesSubTab).
//
//   Blocks    — single node types (BLOCK_GROUPS), draggable AND click-insert.
//   Templates — pre-built sections (getTemplates), draggable AND
//               click-insert. Always APPENDS, never destroys anything —
//               same as a Block, just bigger.
//   Pages     — full-page templates (getPageTemplates). Click-only, no
//               drag (a whole-page swap doesn't make sense as a "drop
//               somewhere specific" gesture) — and REPLACES every existing
//               node on the canvas, so every click here that isn't hitting
//               an already-empty canvas is gated behind a confirm dialog.
type ElementsSubTab = 'blocks' | 'templates' | 'pages'

function ElementsTab() {
  const [subTab, setSubTab] = useState<ElementsSubTab>('blocks')
  const t = useT()

  return (
    <div>
      <div className="px-3 pt-3 pb-1">
        <p className="text-[11px] text-neutral-400 leading-relaxed px-1 mb-2">
          {t('elementsTabIntro')}
        </p>
        <div role="tablist" className="flex rounded-lg bg-neutral-100 p-0.5 gap-0.5">
          <ElementsSubTabBtn active={subTab === 'blocks'}    onClick={() => setSubTab('blocks')}>{t('blocksTab')}</ElementsSubTabBtn>
          <ElementsSubTabBtn active={subTab === 'templates'} onClick={() => setSubTab('templates')}>{t('templatesTab')}</ElementsSubTabBtn>
          <ElementsSubTabBtn active={subTab === 'pages'}     onClick={() => setSubTab('pages')}>{t('pagesTab')}</ElementsSubTabBtn>
        </div>
      </div>
      {subTab === 'blocks'    && <BlocksSubTab />}
      {subTab === 'templates' && <TemplatesSubTab />}
      {subTab === 'pages'     && <PagesSubTab />}
    </div>
  )
}

function ElementsSubTabBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        'flex-1 py-1.5 rounded-md text-xs font-medium transition-colors',
        active ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

// ─── Blocks sub-tab ─────────────────────────────────────────────────────────
// Grouped by the exact same BLOCK_GROUPS the old EmptyCanvasPrompt modal's
// ComponentGrid uses (TemplatePicker.tsx) — one canonical grouping, not a
// second copy invented here. Each tile is BOTH a click target (inserts at
// the end of the root, same as ComponentGrid's onInsert always did) AND a
// genuine drag source via useDraggable — dragging one onto any currently-
// visible DropSlot/GridCellSlot in the canvas inserts it there instead.
function BlocksSubTab() {
  const locale  = useBuilderStore(s => s.locale)
  const rootId  = useBuilderStore(s => s.rootId)
  const addNode = useBuilderStore(s => s.addNode)

  function handleClickInsert(type: NodeType) {
    const rootChildren = useBuilderStore.getState().nodes[rootId]?.children ?? []
    addNode(type, rootId, rootChildren.length)
  }

  return (
    <div className="p-3 space-y-5">
      {BLOCK_GROUPS.map(group => (
        <div key={group.label}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5 px-1">
            {blockGroupLabel(locale, group.label)}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {group.types.map(type => {
              const def = NODE_REGISTRY[type]
              if (!def) return null
              return (
                <PaletteTile
                  key={type}
                  type={type}
                  label={nodeLabel(locale, type, def.label)}
                  icon={def.icon}
                  onClick={() => handleClickInsert(type)}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// A single draggable+clickable tile. The dual behavior (drag vs click)
// works for free off dnd-kit's own activationConstraint({ distance: 8 })
// already configured on the shared PointerSensor (see page.tsx's
// DndContext) — below that movement threshold dnd-kit never calls
// preventDefault, so the browser's normal mousedown→mouseup→click sequence
// completes untouched and onClick fires; only once the pointer actually
// moves past that threshold does dnd-kit take over and suppress the click,
// which is exactly the "drag hijacks it, a plain tap still inserts it"
// behavior this needs. This is the same pattern dnd-kit's own docs use for
// combined drag-handle + clickable-button elements, so no extra
// wasDragged-tracking machinery is needed here.
//
// id is `palette::<type>` (see paletteDragId in DropSlot.tsx) — a synthetic
// id with no corresponding node, which is exactly how page.tsx's
// handleDragEnd tells "insert a brand new block" apart from "reorder an
// existing one" (nodes[activeId] simply won't exist for these).
function PaletteTile({
  type, label, icon, onClick,
}: {
  type: NodeType
  label: string
  icon: string
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: paletteDragId(type),
    data: { paletteType: type },
  })

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      title={label}
      type="button"
      className={[
        'flex flex-col items-center gap-1 rounded-lg border border-neutral-200 hover:border-violet-300 hover:bg-violet-50 transition-colors py-2.5 px-1 group cursor-grab active:cursor-grabbing select-none',
        isDragging ? 'opacity-30' : '',
      ].join(' ')}
    >
      <span className="text-lg leading-none" aria-hidden>{icon}</span>
      <span className="text-[10px] font-medium text-neutral-500 group-hover:text-violet-700 leading-tight text-center truncate w-full">
        {label}
      </span>
    </button>
  )
}

// ─── Templates sub-tab ──────────────────────────────────────────────────────
// A pre-built SECTION (not a whole page) — same insertion semantics as a
// single Block: always APPENDS to wherever it lands, never destroys
// anything already on the canvas. Click-insert reuses useInsertTemplate
// (now exported from TemplatePicker.tsx) unchanged — it always appends to
// root's end, which is exactly what a click here should do. Drag-insert
// goes through the store's insertTemplateNodes action instead (see
// store.ts), since a drag can land on any arbitrary DropSlot/GridCellSlot
// discovered only at drop time in page.tsx, not just "always root's end".
function TemplatesSubTab() {
  const locale        = useBuilderStore(s => s.locale)
  const templates      = getTemplates(locale)
  const insertTemplate = useInsertTemplate(templates)
  const t              = useT()

  return (
    <div className="p-3 space-y-2">
      <p className="text-[11px] text-neutral-400 leading-relaxed px-1 -mt-1 mb-1">
        {t('insertTemplateIntro')}
      </p>
      <div className="space-y-1.5">
        {templates.map((tpl, i) => (
          <TemplateTile
            key={tpl.label}
            index={i}
            template={tpl}
            onClick={() => insertTemplate(i)}
          />
        ))}
      </div>
    </div>
  )
}

// Same drag/click dual-behavior as PaletteTile above, same reasoning. id is
// `template::<index>` (see templateDragId in DropSlot.tsx) — the index is
// into THIS render's getTemplates(locale) array; page.tsx's handleDragEnd
// re-resolves getTemplates(locale) itself at drop time and looks the same
// index back up, so the two never need to agree on anything beyond "same
// locale, same array order" (which getTemplates already guarantees).
function TemplateTile({
  index, template, onClick,
}: {
  index: number
  template: Template
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: templateDragId(index),
    data: { templateIndex: index },
  })

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      type="button"
      className={[
        'w-full text-start rounded-lg border border-neutral-200 hover:border-violet-300 hover:bg-violet-50 transition-colors p-2.5 group flex items-center gap-2.5 cursor-grab active:cursor-grabbing select-none',
        isDragging ? 'opacity-30' : '',
      ].join(' ')}
    >
      <span className="text-lg leading-none shrink-0 w-6 text-center" aria-hidden>{template.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-neutral-800 group-hover:text-violet-700 leading-tight truncate">{template.label}</p>
        <p className="text-[10px] text-neutral-400 mt-0.5 leading-snug truncate">{template.thumbnail}</p>
      </div>
    </button>
  )
}

// ─── Pages sub-tab ──────────────────────────────────────────────────────────
// DELIBERATELY click-only — no useDraggable here at all. A full-page
// template REPLACES every node currently on the canvas; "drag it onto a
// specific slot" would be a lie (there's no slot-shaped meaning to
// "replace everything"), so this sub-tab doesn't offer that gesture in the
// first place.
//
// THE IMPORTANT DIFFERENCE FROM THE OLD MODAL: AddContentModal's own Pages
// tab (TemplatePicker.tsx) never needed a confirmation step, because that
// modal is architecturally only ever reachable while the canvas is already
// empty (EmptyCanvasPrompt only renders when rootChildren.length === 0) —
// a page template genuinely has nothing to destroy there. This sidebar tab
// has NO such guarantee: it's visible at all times, including with a fully
// built-out page already on the canvas. So every click here that WOULD
// destroy existing content is gated behind an explicit confirm dialog
// first — skipped only in the one case where skipping it is provably safe
// (the canvas is already empty, same condition EmptyCanvasPrompt itself
// checks).
//
// Reuses getPageTemplates/useInsertPageTemplate/PageTemplateGrid straight
// from pageTemplates.ts (already proven exports — TemplatePicker.tsx's own
// AddContentModal already imports and uses exactly these three) rather
// than reimplementing page-template rendering a second time.
function PagesSubTab() {
  const locale            = useBuilderStore(s => s.locale)
  const rootId             = useBuilderStore(s => s.rootId)
  const rootChildrenCount  = useBuilderStore(s => s.nodes[rootId]?.children.length ?? 0)
  const pages              = getPageTemplates(locale)
  const insertPage         = useInsertPageTemplate(pages)
  const t                  = useT()

  const [pendingIndex, setPendingIndex] = useState<number | null>(null)

  function handlePick(index: number) {
    if (rootChildrenCount === 0) {
      // Nothing to lose — same condition EmptyCanvasPrompt's own modal
      // relies on to skip confirmation.
      insertPage(index)
      return
    }
    setPendingIndex(index)
  }

  return (
    <div className="p-3 space-y-2">
      <p className="text-[11px] text-neutral-400 leading-relaxed px-1 -mt-1 mb-1">
        {t('pageTemplatesIntro')}
      </p>
      <PageTemplateGrid templates={pages} onInsert={handlePick} />

      {pendingIndex !== null && (
        <ConfirmReplacePageDialog
          onCancel={() => setPendingIndex(null)}
          onConfirm={() => {
            insertPage(pendingIndex)
            setPendingIndex(null)
          }}
        />
      )}
    </div>
  )
}

// Small, self-contained confirm modal — reuses the exact same
// confirmReplaceBody/confirmReplaceBtn/cancelBtn copy the TopBar entry
// point's own page-template confirmation already uses (see
// PageTemplatePickerModal in pageTemplates.ts), so the wording is
// consistent regardless of which of the app's three page-template entry
// points (TopBar, this sidebar tab) a person used to get here.
function ConfirmReplacePageDialog({
  onCancel, onConfirm,
}: {
  onCancel: () => void
  onConfirm: () => void
}) {
  const t   = useT()
  const dir = useDirection()
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={onCancel}
    >
      <div
        dir={dir}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-xl shadow-xl ring-1 ring-black/5 p-4 space-y-3"
      >
        <p className="text-sm text-neutral-700 leading-relaxed">{t('confirmReplaceBody')}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            {t('cancelBtn')}
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            {t('confirmReplaceBtn')}
          </button>
        </div>
      </div>
    </div>
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

// ─── Page-wide badge (shown on Style/Content tabs when the ROOT node is
// selected) ──────────────────────────────────────────────────────────────
// Purely a discoverability layer — no new mechanism. The root node is a
// perfectly ordinary `type: 'section'` node (see INITIAL_NODES in
// store.ts), so its Style tab (fontFamily/textColor, which cascade to every
// descendant via buildSectionOuterStyle in styleMapper.ts — see the doc
// comment on StyleProps.fontFamily there) and Content tab (SectionPanel's
// own background/gradient/image controls) already ARE "page defaults" —
// nothing about how patchNodeStyle/onUpdate work changes here. This badge
// just makes that fact visible instead of silent, and TopBar's new "Page"
// button (see TopBar.tsx) is what gets a user here in the first place by
// calling selectNode(rootId) + setControlPanelTab('style').
function PageWideBadge({ variant }: { variant: 'style' | 'content' }) {
  const setControlPanelTab = useBuilderStore(s => s.setControlPanelTab)
  const t = useT()
  return (
    <div className="px-4 pt-3.5 pb-1">
      <div className="bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
        <p className="text-[11px] text-violet-700 leading-snug">
          {variant === 'style' ? t('pageStyleBadge') : t('pageContentBadge')}
        </p>
      </div>
      <button
        onClick={() => setControlPanelTab('theme')}
        className="text-[10px] font-medium text-violet-500 hover:text-violet-700 transition-colors mt-1.5"
      >
        {t('pageBadgeThemeLink')}
      </button>
    </div>
  )
}

function StyleTab({ node, onUpdate }: { node: PageNode | null; onUpdate: (id: string, p: Record<string, unknown>) => void }) {
  const editingBreakpoint = useBuilderStore(s => s.editingBreakpoint)
  const style             = useNodeStyle(node)
  const globalCustomCss    = useBuilderStore(s => s.globalCustomCss)
  const setGlobalCustomCss = useBuilderStore(s => s.setGlobalCustomCss)
  const globalCustomJs = useBuilderStore(s => s.globalCustomJs)
  const setGlobalCustomJs = useBuilderStore(s => s.setGlobalCustomJs)
  const rootId             = useBuilderStore(s => s.rootId)
  const t                  = useT()

  if (!node) {
    return (
      <div className="p-4 space-y-4">
        <p className="text-neutral-400 text-sm">{t('selectBlockForStyle')}</p>
        <CustomCssField 
          value={globalCustomCss} 
          onChange={setGlobalCustomCss} />
        <CustomJsField
          value={globalCustomJs}
          onChange={setGlobalCustomJs}
          note={t('globalCustomJsNote')}
        />
      </div>
    )
  }

  const isRoot                = node.id === rootId
  const isOverrideBreakpoint = editingBreakpoint !== 'desktop'
  const hasOverride           = isOverrideBreakpoint && hasOverrideAt(node, editingBreakpoint)
  const isSection             = node.type === 'section'
  const isContainer           = NODE_REGISTRY[node.type]?.isContainer ?? false
  const hideSize              = node.type === 'avatar' || node.type === 'spacer'
  const hideWidth              = node.type === 'column' || node.type === 'image' || node.type === 'tabpane'
  const hideBackground         = isSection || node.type === 'column' || node.type === 'tabpane'

  return (
    <div>
      {isRoot && <PageWideBadge variant="style" />}
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
  const nodes  = useBuilderStore(s => s.nodes)
  const style  = useNodeStyle(node)
  const rootId = useBuilderStore(s => s.rootId)
  const t      = useT()

  if (!node) return <Empty text={t('selectBlockForContent')} />
  const def = NODE_REGISTRY[node.type]
  if (!def) return null
  const Panel  = def.EditorPanel
  const isRoot = node.id === rootId

  const parentNode  = node.parentId ? nodes[node.parentId] : null
  const isGridChild = parentNode?.type === 'grid'

  return (
    <>
      {isRoot && <PageWideBadge variant="content" />}
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
      <CustomJsField
        value={node.props.customJs as string}
        onChange={js => onUpdate(node.id, { customJs: js })}
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