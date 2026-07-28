'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useBuilderStore, PREVIEW_WIDTHS, PreviewWidth } from './store'
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  hasLocalStorageSave,
  downloadJSON,
  downloadHtml,
  parseImportedJSON,
  readFileAsText,
} from './exportImport'
import { LanguageToggle } from './LanguageToggle'
import { useT, directionForLocale, type DictKey } from './i18n'

// Maps a PreviewWidth key to its translated dictionary key — PREVIEW_WIDTHS
// itself (in store.ts) only stores an English label, since it's also used
// as a plain data source elsewhere; the translation lookup lives here
// instead of hardcoding cfg.label in JSX below.
const BP_LABEL_KEY: Record<PreviewWidth, DictKey> = {
  desktop: 'bpDesktop', tablet: 'bpTablet', mobile: 'bpMobile',
}

export function TopBar() {
  const mode                = useBuilderStore(s => s.mode)
  const setMode              = useBuilderStore(s => s.setMode)
  const previewWidth         = useBuilderStore(s => s.previewWidth)
  const setPreviewWidth      = useBuilderStore(s => s.setPreviewWidth)
  const editingBreakpoint    = useBuilderStore(s => s.editingBreakpoint)
  const setEditingBreakpoint = useBuilderStore(s => s.setEditingBreakpoint)
  const canUndo              = useBuilderStore(s => s.canUndo())
  const canRedo              = useBuilderStore(s => s.canRedo())
  const undo                 = useBuilderStore(s => s.undo)
  const redo                 = useBuilderStore(s => s.redo)
  const del                  = useBuilderStore(s => s.deleteNode)
  const dup                  = useBuilderStore(s => s.duplicateNode)
  const controlPanelTab      = useBuilderStore(s => s.controlPanelTab)
  const setControlPanelTab   = useBuilderStore(s => s.setControlPanelTab)
  const locale                = useBuilderStore(s => s.locale)
  const dir                   = directionForLocale(locale)
  const t                     = useT()

  const [toast, setToast]         = useState<string | null>(null)
  const [menuOpen, setMenuOpen]   = useState(false)
  const [hasSave, setHasSave]     = useState(false)
  const menuRef                   = useRef<HTMLDivElement>(null)
  const importRef                 = useRef<HTMLInputElement>(null)
  const replayAnimations = useBuilderStore(s => s.replayAnimations) 


  useEffect(() => {
    setHasSave(hasLocalStorageSave())
  }, [])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  // Switching into Preview mode also snaps previewWidth to whatever
  // breakpoint you were just editing — so Preview always opens showing the
  // same width you were actively working on, instead of silently defaulting
  // back to desktop regardless of what you'd been editing.
  function handleSetMode(next: 'edit' | 'preview') {
    if (next === 'preview') setPreviewWidth(editingBreakpoint)
    setMode(next)
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const meta   = e.metaKey || e.ctrlKey
      const active = document.activeElement as HTMLElement
      if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA' || active?.isContentEditable) return

      if (meta && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (meta && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
      if (meta && e.key === 'd') {
        e.preventDefault()
        const id = useBuilderStore.getState().selectedId
        if (id) dup(id)
      }
      if (meta && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !meta) {
        const { selectedId, rootId } = useBuilderStore.getState()
        if (selectedId && selectedId !== rootId && document.activeElement === document.body) del(selectedId)
      }
      if (e.key === 'Escape') useBuilderStore.getState().selectNode(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, del, dup])

  function handleSave() {
    const { nodes, rootId } = useBuilderStore.getState()
    const ok = saveToLocalStorage(nodes, rootId)
    setHasSave(true)
    showToast(ok ? t('toastSaved') : t('toastSaveFailed'))
    setMenuOpen(false)
  }

  function handleLoadLocal() {
    const saved = loadFromLocalStorage()
    if (!saved) { showToast(t('toastNoSavedPage')); return }
    useBuilderStore.setState(prev => ({
      nodes:      saved.nodes,
      rootId:     saved.rootId,
      selectedId: null,
      past:       [JSON.parse(JSON.stringify(prev.nodes))],
      future:     [],
    }))
    showToast(t('toastPageLoaded'))
    setMenuOpen(false)
  }

function handleExportJSON() {
  const {
    nodes,
    rootId,
    globalColors,
    globalTypography,
    globalCustomCss,
    seo,
  } = useBuilderStore.getState()

  downloadJSON(nodes, rootId, 'page.json', {
    globalColors,
    globalTypography,
    globalCustomCss,
    seo,
  })

  setMenuOpen(false)
}

function handleExportHTML() {
  const {
    nodes,
    rootId,
    globalColors,
    globalTypography,
    globalCustomCss,
    seo,
  } = useBuilderStore.getState()

  downloadHtml(nodes, rootId, 'page.html', {
    title: seo.title || 'My Page',
    globalColors,
    globalCustomCss,
    seo,
  })

  setMenuOpen(false)
}

  async function handleImportJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text   = await readFileAsText(file)
      const result = parseImportedJSON(text)
      if (!result.success || !result.nodes || !result.rootId) {
        showToast(t('toastImportError', result.error))
        return
      }
      useBuilderStore.setState(prev => ({
        nodes:      result.nodes!,
        rootId:     result.rootId!,
        selectedId: null,
        past:       [JSON.parse(JSON.stringify(prev.nodes))],
        future:     [],
      }))
      showToast(t('toastPageImported'))
    } catch {
      showToast(t('toastCouldNotRead'))
    } finally {
      // Reset so the same file can be re-imported if needed
      if (importRef.current) importRef.current.value = ''
      setMenuOpen(false)
    }
  }

  return (
    <header dir={dir} className="h-12 flex items-center justify-between px-4 bg-white border-b border-neutral-200 shrink-0 z-50 gap-4">
      {/* Logo */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">B</span>
        </div>
        <span className="text-sm font-semibold text-neutral-800 hidden sm:block">{t('appName')}</span>
      </div>

      {/* Undo / redo — pinned to ltr regardless of page direction. These
          curved arrows encode a TIME relationship (back/forward through
          history), not a reading-direction one — letting the ambient
          dir="rtl" mirror this cluster would swap which side each button
          sits on, but the ↩/↪ glyphs themselves never mirror, so the two
          arrows would end up pointing at each other instead of both
          "forward" in the same rotational sense. Keeping this one cluster
          fixed-LTR is the standard fix (same convention as most editors'
          undo/redo controls, which don't mirror under RTL either). */}
      <div dir="ltr" className="flex items-center gap-1 shrink-0">
        <TopBtn onClick={undo} disabled={!canUndo} title={t('undoTitle')}>↩</TopBtn>
        <TopBtn onClick={redo} disabled={!canRedo} title={t('redoTitle')}>↪</TopBtn>
      </div>

      {/* Theme / SEO — these switch the sidebar's ControlPanel to its Theme
          or SEO tab from out here, since neither one gets its own button in
          ControlPanel's own tab bar anymore (that bar only ever shows
          Layers/Style/Content — see ControlPanel.tsx). The tab CONTENT is
          unchanged; only its switcher moved. */}
      <div className="flex bg-neutral-100 rounded-lg p-0.5 gap-0.5 shrink-0">
        <button
          onClick={() => setControlPanelTab('theme')}
          title={t('themeTabTitle')}
          className={[
            'px-3 py-1 rounded-md text-xs font-medium transition-colors',
            controlPanelTab === 'theme' ? 'bg-white text-violet-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700',
          ].join(' ')}
        >
          {t('themeTabLabel')}
        </button>
        <button
          onClick={() => setControlPanelTab('seo')}
          title={t('seoTabTitle')}
          className={[
            'px-3 py-1 rounded-md text-xs font-medium transition-colors',
            controlPanelTab === 'seo' ? 'bg-white text-violet-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700',
          ].join(' ')}
        >
          {t('seoTabLabel')}
        </button>
      </div>

      {/* Centre: mode + responsive width */}
      <div className="flex items-center gap-2 flex-1 justify-center">
        <div className="flex bg-neutral-100 rounded-lg p-0.5">
          <ModeBtn active={mode === 'edit'}    onClick={() => handleSetMode('edit')}>{t('editModeLabel')}</ModeBtn>
          <ModeBtn active={mode === 'preview'} onClick={() => handleSetMode('preview')}>{t('previewModeLabel')}</ModeBtn>
        </div>

        {/* Edit mode: which breakpoint's styles you're currently authoring.
            This drives useNodeStyle/patchNodeStyle everywhere (see
            responsive.ts) — it's independent from the Preview-mode width
            switcher below, though switching into Preview snaps that one to
            match (see handleSetMode above). */}
        {mode === 'edit' && (
          <div className="flex bg-neutral-100 rounded-lg p-0.5 gap-0.5">
            {(Object.entries(PREVIEW_WIDTHS) as [PreviewWidth, typeof PREVIEW_WIDTHS[PreviewWidth]][]).map(([key, cfg]) => (
              <button
                key={key}
                title={t('editBreakpointTitle', t(BP_LABEL_KEY[key]), cfg.px)}
                onClick={() => setEditingBreakpoint(key)}
                className={[
                  'w-8 h-7 flex items-center justify-center rounded-md text-sm transition-colors',
                  editingBreakpoint === key ? 'bg-white text-violet-600 shadow-sm' : 'text-neutral-400 hover:text-neutral-600',
                ].join(' ')}
              >
                {cfg.icon}
              </button>
            ))}
          </div>
        )}



{mode === 'preview' && (
  <button
    onClick={replayAnimations}
    title={t('replayTitle')}
    className="w-8 h-7 flex items-center justify-center rounded-md text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 transition-colors"
  >
    ↻
  </button>
)}

        {mode === 'edit' && editingBreakpoint !== 'desktop' && (
          <span className="text-xs text-violet-500 font-medium hidden md:block">
            {t('editingBreakpointLabel', t(BP_LABEL_KEY[editingBreakpoint]))}
          </span>
        )}

        {mode === 'preview' && (
          <div className="flex bg-neutral-100 rounded-lg p-0.5 gap-0.5">
            {(Object.entries(PREVIEW_WIDTHS) as [PreviewWidth, typeof PREVIEW_WIDTHS[PreviewWidth]][]).map(([key, cfg]) => (
              <button
                key={key}
                title={t('previewWidthTitle', t(BP_LABEL_KEY[key]), cfg.px)}
                onClick={() => setPreviewWidth(key)}
                className={[
                  'w-8 h-7 flex items-center justify-center rounded-md text-sm transition-colors',
                  previewWidth === key ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-400 hover:text-neutral-600',
                ].join(' ')}
              >
                {cfg.icon}
              </button>
            ))}
          </div>
        )}

        {mode === 'preview' && (
          <span className="text-xs text-neutral-400 tabular-nums hidden md:block">
            {PREVIEW_WIDTHS[previewWidth].px}px
          </span>
        )}
      </div>

      {/* Right: language + save menu + publish */}
      <div className="flex items-center gap-2 shrink-0 relative" ref={menuRef}>
        {/* Language toggle — the one switch that cascades direction
            (dir="rtl"/"ltr" on the Editor canvas and every Preview root,
            see Renderer.tsx), the builder's own UI strings (useT(), see
            panelComponents.tsx/ControlPanel.tsx/DropSlot.tsx/
            TemplatePicker.tsx/TopBar.tsx), and which language's content
            pack the Farsi-enabled templates render in (templates.ts's
            getTemplates(locale)). See LanguageToggle.tsx for the full
            rundown of what flipping it actually touches. */}
        <LanguageToggle />

        {/* Save/export menu */}
        <button
          onClick={() => setMenuOpen(v => !v)}
          title={t('saveExportTitle')}
          className={[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
            menuOpen
              ? 'bg-neutral-100 border-neutral-300 text-neutral-800'
              : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800',
          ].join(' ')}
        >
          <span>💾</span>
          <span className="hidden sm:inline">{t('saveLabel')}</span>
          <span className="text-neutral-400">▾</span>
        </button>

        {menuOpen && (
          <div
            dir={dir}
            className="absolute end-0 top-10 w-56 bg-white rounded-xl border border-neutral-200 shadow-xl py-1.5 z-50"
          >
            {/* Browser save */}
            <MenuSection label={t('browserStorageSection')} />
            <MenuItem
              icon="💾"
              label={t('saveToBrowserLabel')}
              sublabel={t('saveToBrowserSub')}
              onClick={handleSave}
            />
            {hasSave && (
              <MenuItem
                icon="📂"
                label={t('loadFromBrowserLabel')}
                sublabel={t('loadFromBrowserSub')}
                onClick={handleLoadLocal}
              />
            )}
            <div className="my-1 border-t border-neutral-100" />

            {/* JSON */}
            <MenuSection label={t('jsonFileSection')} />
            <MenuItem
              icon="⬇"
              label={t('exportJsonLabel')}
              sublabel={t('exportJsonSub')}
              onClick={handleExportJSON}
            />
            <MenuItem
              icon="⬆"
              label={t('importJsonLabel')}
              sublabel={t('importJsonSub')}
              onClick={() => importRef.current?.click()}
            />
            <div className="my-1 border-t border-neutral-100" />

            {/* HTML */}
            <MenuSection label={t('staticHtmlSection')} />
            <MenuItem
              icon="🌐"
              label={t('exportHtmlLabel')}
              sublabel={t('exportHtmlSub')}
              onClick={handleExportHTML}
            />
          </div>
        )}

        {/* Hidden file input for JSON import */}
        <input
          ref={importRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportJSON}
        />

        <button className="px-4 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors">
          {t('publishLabel')}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-xl z-[99999] pointer-events-none">
          {toast}
        </div>
      )}
    </header>
  )
}

function TopBtn({ children, onClick, disabled, title }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; title?: string
}) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      className="w-8 h-8 flex items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
    >
      {children}
    </button>
  )
}

function ModeBtn({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3 py-1 rounded-md text-xs font-medium transition-colors',
        active ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function MenuSection({ label }: { label: string }) {
  return (
    <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400 text-start">
      {label}
    </p>
  )
}

function MenuItem({ icon, label, sublabel, onClick }: {
  icon: string; label: string; sublabel: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-violet-50 transition-colors text-start"
    >
      <span className="shrink-0 w-5 text-center text-sm">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-neutral-700 leading-tight">{label}</p>
        <p className="text-[10px] text-neutral-400 truncate">{sublabel}</p>
      </div>
    </button>
  )
}