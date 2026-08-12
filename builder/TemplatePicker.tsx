'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { getTemplates, type Template } from './templates'
import { getPageTemplates, useInsertPageTemplate, PageTemplateGrid } from './pageTemplates'
import { useBuilderStore, type Locale } from './store'
import { useT, directionForLocale, nodeLabel, blockGroupLabel } from './i18n'
import { NodeMap, NodeType } from './types'
import { NODE_REGISTRY, BLOCK_GROUPS } from './registry'

// ─── Hook: insert a template's nodes under root ───────────────────────────────
// Takes the CALLER's current, locale-resolved templates array (built via
// getTemplates(locale) in the component below) rather than reading the
// static TEMPLATES export directly. TEMPLATES is frozen to English at
// module-load time (see the bottom of templates.ts) — reading it here meant
// inserting a template always grafted its English build() onto the canvas,
// regardless of which language the picker was actually showing. Same fix,
// same reasoning, as what DropSlot.tsx's BlockPicker already does.

function useInsertTemplate(templates: Template[]) {
  return function insertTemplate(index: number) {
    const template = templates[index]
    if (!template) return

    const { nodes: builtNodes, rootChildId } = template.build()

    // We need to graft builtNodes into the global store.
    // Use a raw set so we can batch everything in one immer pass.
    useBuilderStore.setState(prev => {
      // Deep-clone prev nodes to avoid mutation
      const next: NodeMap = JSON.parse(JSON.stringify(prev.nodes))

      // Push history first
      const snap = JSON.parse(JSON.stringify(prev.nodes))
      const newPast = [snap, ...prev.past].slice(0, 50)

      // Merge template nodes
      Object.values(builtNodes).forEach(n => {
        next[n.id] = { ...n }
      })

      // Attach root section to canvas root
      const rootNode = next[prev.rootId]
      const insertAt = rootNode.children.length
      rootNode.children.splice(insertAt, 0, rootChildId)
      next[rootChildId].parentId = prev.rootId

      return {
        nodes:      next,
        past:       newPast,
        future:     [],
        selectedId: rootChildId,
      }
    })
  }
}

// ─── TemplatePicker (full panel, used in sidebar) ────────────────────────────
// Unchanged — this is the "how it is now" list-style picker used in the
// sidebar. The EmptyCanvasPrompt below gets its own, deliberately different,
// modal-based design rather than reusing this component.

export function TemplatePicker() {
  const locale    = useBuilderStore(s => s.locale)
  const dir       = directionForLocale(locale)
  const templates = getTemplates(locale)
  const insert    = useInsertTemplate(templates)
  const t         = useT()

  return (
    <div className="p-4 space-y-3" dir={dir}>
      <p className="text-xs text-neutral-500 leading-relaxed text-start">
        {t('insertTemplateIntro')}
      </p>
      <div className="space-y-2">
        {templates.map((tpl, i) => (
          <button
            key={tpl.label}
            onClick={() => insert(i)}
            className="w-full text-start rounded-xl border border-neutral-200 hover:border-violet-300 hover:bg-violet-50 transition-colors p-3 group"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl w-8 text-center shrink-0">{tpl.icon}</span>
              <div className="min-w-0 flex-1 text-start">
                <p className="text-sm font-medium text-neutral-800 group-hover:text-violet-700 leading-tight">{tpl.label}</p>
                <p className="text-[11px] text-neutral-400 mt-0.5 truncate">{tpl.thumbnail}</p>
              </div>
              <span className="ms-auto text-neutral-300 group-hover:text-violet-400 text-base shrink-0">＋</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── AddContentModal ──────────────────────────────────────────────────────────
// The unique, expanded design for the empty canvas: a centered modal with a
// Templates/Pages/Components segmented switch, rather than the sidebar's
// list. Templates render as a 2-col card grid (bigger, since a template is a
// whole section); Pages render as a single-column list of full-page templates
// (see pageTemplates.ts — each one replaces the whole canvas rather than
// appending, which is safe here since this modal only ever shows while the
// canvas is already empty); Components render as a denser icon-tile grid
// grouped by BLOCK_GROUPS (Layout / Content / Elements), since each one is a
// single, small unit.
//
// Component insertion goes straight through the store's addNode — no node
// graft needed the way templates require, since NODE_REGISTRY + addNode
// already builds a single node (plus any createExtras children, e.g. Columns
// seeding two `column` children) from defaultProps.

function ComponentGrid({
  locale, onInsert,
}: {
  locale: Locale
  onInsert: (type: NodeType) => void
}) {
  return (
    <div className="space-y-5">
      {BLOCK_GROUPS.map(group => (
        <div key={group.label}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-1.5">
            {blockGroupLabel(locale, group.label)}
          </p>
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5">
            {group.types.map(type => {
              const def = NODE_REGISTRY[type]
              if (!def) return null
              const label = nodeLabel(locale, type, def.label)
              return (
                <button
                  key={type}
                  onClick={() => onInsert(type)}
                  title={label}
                  className="flex flex-col items-center gap-1 rounded-lg border border-neutral-200 hover:border-violet-300 hover:bg-violet-50 transition-colors py-2 px-1 group"
                >
                  <span className="text-base leading-none">{def.icon}</span>
                  <span className="text-[10px] font-medium text-neutral-500 group-hover:text-violet-700 leading-tight text-center truncate w-full">
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function TemplateGrid({
  templates, onInsert,
}: {
  templates: Template[]
  onInsert: (index: number) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {templates.map((tpl, i) => (
        <button
          key={tpl.label}
          onClick={() => onInsert(i)}
          className="text-start rounded-lg border border-neutral-200 hover:border-violet-300 hover:bg-violet-50 transition-colors p-2.5 group flex items-center gap-2.5"
        >
          <span className="text-lg leading-none shrink-0 w-6 text-center">{tpl.icon}</span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-neutral-800 group-hover:text-violet-700 leading-tight truncate">{tpl.label}</p>
            <p className="text-[10px] text-neutral-400 mt-0.5 leading-snug truncate">{tpl.thumbnail}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

function AddContentModal({
  onClose,
}: {
  onClose: () => void
}) {
  const locale    = useBuilderStore(s => s.locale)
  const dir       = directionForLocale(locale)
  const rootId    = useBuilderStore(s => s.rootId)
  const addNode   = useBuilderStore(s => s.addNode)
  const templates = getTemplates(locale)
  const pages     = getPageTemplates(locale)
  const insertTemplate = useInsertTemplate(templates)
  const insertPage      = useInsertPageTemplate(pages)
  const t = useT()

  const [tab, setTab] = useState<'templates' | 'pages' | 'components'>('templates')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleInsertTemplate = useCallback((index: number) => {
    insertTemplate(index)
    onClose()
  }, [insertTemplate, onClose])

  // No "replace everything" confirmation needed here — this modal only ever
  // renders while the canvas is already empty (see EmptyCanvasPrompt below),
  // so a page template has nothing to destroy. The TopBar entry point (see
  // PageTemplatePickerModal in pageTemplates.ts) is the one that needs the
  // confirm step, since it can be opened with existing content on the page.
  const handleInsertPage = useCallback((index: number) => {
    insertPage(index)
    onClose()
  }, [insertPage, onClose])

  const handleInsertComponent = useCallback((type: NodeType) => {
    const rootChildren = useBuilderStore.getState().nodes[rootId]?.children ?? []
    addNode(type, rootId, rootChildren.length)
    onClose()
  }, [addNode, rootId, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      onClick={onClose}
    >
      <div
        dir={dir}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md max-h-[70vh] bg-white rounded-xl shadow-xl ring-1 ring-black/5 flex flex-col overflow-hidden"
      >
        {/* Header: title + close, tabs directly underneath as a bordered, high-contrast switch */}
        <div className="px-4 pt-3.5 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-neutral-800">{t('addContentTitle')}</p>
            <button
              onClick={onClose}
              aria-label={t('closeAria')}
              className="shrink-0 w-6 h-6 -me-1 rounded-md flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors text-sm"
            >
              ✕
            </button>
          </div>

          {/* Three clearly separate, always-outlined buttons rather than a
              single pill-on-gray track — every inactive tab keeps its own
              visible border so it still reads as a clickable option, not
              just muted text next to the active one. */}
          <div role="tablist" className="flex gap-1.5">
            <button
              role="tab"
              aria-selected={tab === 'templates'}
              onClick={() => setTab('templates')}
              className={[
                'flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                tab === 'templates'
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:border-violet-300 hover:text-violet-700',
              ].join(' ')}
            >
              {t('templatesTab')}
            </button>
            <button
              role="tab"
              aria-selected={tab === 'pages'}
              onClick={() => setTab('pages')}
              className={[
                'flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                tab === 'pages'
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:border-violet-300 hover:text-violet-700',
              ].join(' ')}
            >
              {t('pagesTab')}
            </button>
            <button
              role="tab"
              aria-selected={tab === 'components'}
              onClick={() => setTab('components')}
              className={[
                'flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                tab === 'components'
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:border-violet-300 hover:text-violet-700',
              ].join(' ')}
            >
              {t('blocksTab')}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 mt-1">
          {tab === 'templates' && (
            <TemplateGrid templates={templates} onInsert={handleInsertTemplate} />
          )}
          {tab === 'pages' && (
            <>
              <p className="text-[11px] text-neutral-400 mb-2 leading-relaxed">
                {t('pageTemplatesIntro')}
              </p>
              <PageTemplateGrid templates={pages} onInsert={handleInsertPage} />
            </>
          )}
          {tab === 'components' && (
            <ComponentGrid locale={locale} onInsert={handleInsertComponent} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── EmptyCanvasPrompt (shown when root has no children) ─────────────────────

export function EmptyCanvasPrompt() {
  const [modalOpen, setModalOpen] = useState(false)
  const dir           = directionForLocale(useBuilderStore(s => s.locale))
  const t             = useT()
  const rootChildren  = useBuilderStore(s => s.nodes[s.rootId]?.children ?? [])

  if (rootChildren.length > 0) return null

  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center select-none" dir={dir}>
      {/* Dashed bounding box */}
      <div className="w-full max-w-md border-2 border-dashed border-neutral-200 rounded-2xl p-10 space-y-5">
        <div className="text-4xl">🏗️</div>
        <div>
          <p className="text-base font-semibold text-neutral-700">{t('emptyCanvasTitle')}</p>
          <p className="text-sm text-neutral-400 mt-1">{t('emptyCanvasSubtitle')}</p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span>＋</span> {t('chooseTemplate').replace(/^\+\s*/, '')}
        </button>
      </div>

      {modalOpen && <AddContentModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}