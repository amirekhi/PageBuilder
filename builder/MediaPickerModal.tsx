'use client'

import React, { useState, useRef, useCallback } from 'react'
import { useBuilderStore } from './store'
import { MEDIA_CATEGORIES, MediaItem, fakeUploadFile } from './Media'

export function MediaPickerModal() {
  const isOpen      = useBuilderStore(s => s.isMediaPickerOpen)
  const callback    = useBuilderStore(s => s.mediaPickCallback)
  const close        = useBuilderStore(s => s.closeMediaPicker)
  const library      = useBuilderStore(s => s.mediaLibrary)
  const addUploaded  = useBuilderStore(s => s.addUploadedMedia)

  const [category, setCategory] = useState<MediaItem['category'] | 'all'>('all')
  const [query, setQuery]       = useState('')
  const [isUploading, setUploading] = useState(false)
  const [isDragOver, setDragOver]   = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        const item = await fakeUploadFile(file)
        addUploaded(item)
      }
    } catch {
      // Fail silently in this dummy implementation — a real backend would surface a toast here
    } finally {
      setUploading(false)
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // All hooks must run on every render — only branch on isOpen after this point
  if (!isOpen) return null

  function handlePick(item: MediaItem) {
    callback?.(item)
    close()
  }

  const filtered = library.filter(m => {
    if (category !== 'all' && m.category !== category) return false
    if (query && !m.name.toLowerCase().includes(query.toLowerCase()) && !m.alt.toLowerCase().includes(query.toLowerCase())) return false
    return true
  })

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6"
      style={{ background: 'rgba(15,15,20,0.45)', zIndex: 10000 }}
      onClick={close}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 880, maxWidth: '100%', height: 600, maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-neutral-800">Media Library</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Choose an existing file or upload a new one</p>
          </div>
          <button
            onClick={close}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Toolbar: search + categories + upload button */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-neutral-100 shrink-0">
          <input
            placeholder="Search media…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
          <div className="flex bg-neutral-100 rounded-lg p-0.5 shrink-0">
            {MEDIA_CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={[
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                  category === c.key ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700',
                ].join(' ')}
              >
                {c.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="shrink-0 px-3.5 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            {isUploading ? (
              <>
                <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Uploading…
              </>
            ) : (
              <>↑ Upload</>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
        </div>

        {/* Grid + drop zone */}
        <div
          className="flex-1 overflow-y-auto p-6 relative"
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {isDragOver && (
            <div className="absolute inset-3 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-violet-400 bg-violet-50/90 pointer-events-none">
              <p className="text-violet-600 text-sm font-medium">Drop images to upload</p>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-neutral-400 gap-2">
              <span className="text-3xl">🖼️</span>
              <p className="text-sm">No media found</p>
              <p className="text-xs">Try a different search or upload a new file</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {filtered.map(item => (
                <button
                  key={item.id}
                  onClick={() => handlePick(item)}
                  className="group relative rounded-lg overflow-hidden border border-neutral-200 hover:border-violet-400 hover:ring-2 hover:ring-violet-100 transition-all text-left bg-neutral-50"
                  style={{ aspectRatio: '1 / 1' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={item.alt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-[10px] font-medium truncate">{item.name}</p>
                    <p className="text-white/70 text-[9px]">{item.width}×{item.height} · {item.sizeLabel}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-6 py-2.5 border-t border-neutral-100 shrink-0">
          <p className="text-[11px] text-neutral-400">
            This is a demo media library — uploads stay in this session only and aren&apos;t saved to a server.
          </p>
        </div>
      </div>
    </div>
  )
}