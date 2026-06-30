'use client'

import React, { useEffect } from 'react'
import { useBuilderStore, PREVIEW_WIDTHS, PreviewWidth } from './store'

export function TopBar() {
  const mode         = useBuilderStore(s => s.mode)
  const setMode      = useBuilderStore(s => s.setMode)
  const previewWidth = useBuilderStore(s => s.previewWidth)
  const setPreviewWidth = useBuilderStore(s => s.setPreviewWidth)
  const canUndo      = useBuilderStore(s => s.canUndo())
  const canRedo      = useBuilderStore(s => s.canRedo())
  const undo         = useBuilderStore(s => s.undo)
  const redo         = useBuilderStore(s => s.redo)
  const del          = useBuilderStore(s => s.deleteNode)
  const dup          = useBuilderStore(s => s.duplicateNode)

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
      if ((e.key === 'Delete' || e.key === 'Backspace') && !meta) {
        const { selectedId, rootId } = useBuilderStore.getState()
        if (selectedId && selectedId !== rootId && document.activeElement === document.body) del(selectedId)
      }
      if (e.key === 'Escape') useBuilderStore.getState().selectNode(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, del, dup])

  return (
    <header className="h-12 flex items-center justify-between px-4 bg-white border-b border-neutral-200 shrink-0 z-50 gap-4">
      {/* Logo */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">B</span>
        </div>
        <span className="text-sm font-semibold text-neutral-800 hidden sm:block">Page Builder</span>
      </div>

      {/* Undo / redo */}
      <div className="flex items-center gap-1 shrink-0">
        <TopBtn onClick={undo} disabled={!canUndo} title="Undo (⌘Z)">↩</TopBtn>
        <TopBtn onClick={redo} disabled={!canRedo} title="Redo (⌘Y)">↪</TopBtn>
      </div>

      {/* Centre: mode toggle + responsive width switcher */}
      <div className="flex items-center gap-2 flex-1 justify-center">
        {/* Edit / Preview toggle */}
        <div className="flex bg-neutral-100 rounded-lg p-0.5">
          <ModeBtn active={mode === 'edit'}    onClick={() => setMode('edit')}>Edit</ModeBtn>
          <ModeBtn active={mode === 'preview'} onClick={() => setMode('preview')}>Preview</ModeBtn>
        </div>

        {/* Responsive width switcher — only relevant in preview */}
        {mode === 'preview' && (
          <div className="flex bg-neutral-100 rounded-lg p-0.5 gap-0.5">
            {(Object.entries(PREVIEW_WIDTHS) as [PreviewWidth, typeof PREVIEW_WIDTHS[PreviewWidth]][]).map(([key, cfg]) => (
              <button
                key={key}
                title={`${cfg.label} (${cfg.px}px)`}
                onClick={() => setPreviewWidth(key)}
                className={[
                  'w-8 h-7 flex items-center justify-center rounded-md text-sm transition-colors',
                  previewWidth === key
                    ? 'bg-white text-neutral-800 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-600',
                ].join(' ')}
              >
                {cfg.icon}
              </button>
            ))}
          </div>
        )}

        {/* Width badge in preview */}
        {mode === 'preview' && (
          <span className="text-xs text-neutral-400 tabular-nums hidden md:block">
            {PREVIEW_WIDTHS[previewWidth].px}px
          </span>
        )}
      </div>

      {/* Publish */}
      <div className="shrink-0">
        <button className="px-4 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors">
          Publish
        </button>
      </div>
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