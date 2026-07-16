'use client'

import { useEffect, useRef, useState } from 'react'
import { useBuilderStore } from './store'
import { mediaItemFromDataUrl } from './Media'
import type { TuiImageEditorInstance } from 'tui-image-editor'

// TOAST UI's shipped CSS uses old IE "star hack" syntax (`*display: inline;`)
// that Turbopack's built-in CSS parser rejects as a syntax error. Loading
// these as plain static assets via <link> tags at runtime instead of a JS
// import means Turbopack never touches their contents. Copy these two
// files into /public/vendor first:
//   node_modules/tui-color-picker/dist/tui-color-picker.css
//   node_modules/tui-image-editor/dist/tui-image-editor.css
const VENDOR_STYLESHEETS = ['/vendor/tui-color-picker.css', '/vendor/tui-image-editor.css']

function ensureStylesheet(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)
}

const EDITOR_MENU = ['crop', 'flip', 'rotate', 'draw', 'shape', 'icon', 'text', 'filter'] as const

export function ImageEditorModalClient() {
  const isOpen   = useBuilderStore(s => s.isImageEditorOpen)
  const src      = useBuilderStore(s => s.imageEditorSrc)
  const callback = useBuilderStore(s => s.imageEditorCallback)
  const close    = useBuilderStore(s => s.closeImageEditor)
  const addUploadedMedia = useBuilderStore(s => s.addUploadedMedia)

  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef     = useRef<TuiImageEditorInstance | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isOpen || !src || !containerRef.current) return

    const currentSrc = src
    let cancelled = false
    setIsReady(false)

    async function mount() {
      VENDOR_STYLESHEETS.forEach(ensureStylesheet)

      const { default: ImageEditor } = await import('tui-image-editor')
      if (cancelled || !containerRef.current) return

      const editor = new ImageEditor(containerRef.current, {
        includeUI: {
          loadImage: { path: currentSrc, name: 'image' },
          menu: [...EDITOR_MENU],
          initMenu: 'filter',
          menuBarPosition: 'bottom',
          uiSize: { width: '100%', height: '100%' },
        },
        cssMaxWidth: 10000,
        cssMaxHeight: 10000,
        usageStatistics: false,
      })

      editorRef.current = editor
      setIsReady(true)
    }

    mount()

    return () => {
      cancelled = true
      editorRef.current?.destroy?.()
      editorRef.current = null
      setIsReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, src])

  async function handleSave() {
    const editor = editorRef.current
    if (!editor) return
    setIsSaving(true)
    try {
      const dataUrl = editor.toDataURL()
      callback?.(dataUrl)
      try {
        const item = await mediaItemFromDataUrl(dataUrl)
        addUploadedMedia(item)
      } catch {
        // Non-fatal
      }
      editor.destroy()
      editorRef.current = null
      close()
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancel() {
    editorRef.current?.destroy?.()
    editorRef.current = null
    close()
  }

  if (!isOpen || !src) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,15,20,0.6)', zIndex: 10001 }}
    >
      <div className="bg-white rounded-lg overflow-hidden w-full max-w-6xl h-[90vh] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-200 shrink-0">
          <h2 className="text-sm font-semibold text-neutral-800">Edit image</h2>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="px-3.5 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isReady || isSaving}
              className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-medium rounded-md transition-colors"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        <div ref={containerRef} className="flex-1 min-h-0" />
      </div>
    </div>
  )
}