'use client'

import React, { useEffect, useState } from 'react'
import { useBuilderStore } from './store'
import { loadFromLocalStorage, clearLocalStorageSave, hasLocalStorageSave } from './exportImport'
import { useT } from './i18n'

// Offers to restore whatever this browser last autosaved, the instant the
// app boots — before the person has made a single edit in THIS session.
// A fresh page load always starts from the empty INITIAL_NODES page (see
// store.ts) with no memory of any previous visit, so this is the one
// chance to catch a prior session's unsaved work before useAutosave's own
// debounced writes start overwriting that exact slot the moment the
// person makes their first edit here (whether they restored or dismissed
// this banner).
//
// Deliberately local component state rather than a store field — nothing
// else in the app needs to know this banner is open (unlike
// MediaPickerModal/ImageEditorModal, which are opened from many different
// call sites across the codebase), so there's nothing to gain from routing
// it through the global store.
export function RestoreBanner() {
  const [visible, setVisible] = useState(false)
  const t = useT()

  useEffect(() => {
    setVisible(hasLocalStorageSave())
  }, [])

  if (!visible) return null

  function handleRestore() {
    const saved = loadFromLocalStorage()
    setVisible(false)
    if (!saved) return
    useBuilderStore.setState(prev => ({
      nodes:            saved.nodes,
      rootId:           saved.rootId,
      globalColors:     saved.globalColors     ?? prev.globalColors,
      globalTypography: saved.globalTypography ?? prev.globalTypography,
      globalCustomCss:  saved.globalCustomCss  ?? prev.globalCustomCss,
      globalCustomJs:   saved.globalCustomJs   ?? prev.globalCustomJs,
      seo:              saved.seo              ?? prev.seo,
      selectedId:       null,
      past:             [],
      future:           [],
    }))
  }

  function handleDiscard() {
    clearLocalStorageSave()
    setVisible(false)
  }

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100001] flex items-center gap-3 bg-white border border-neutral-200 shadow-xl rounded-xl pl-4 pr-2 py-2">
      <span className="text-lg leading-none" aria-hidden>🕒</span>
      <p className="text-xs text-neutral-600 max-w-xs">{t('restoreBannerBody')}</p>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleDiscard}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-500 hover:bg-neutral-100 transition-colors"
        >
          {t('restoreBannerDiscard')}
        </button>
        <button
          onClick={handleRestore}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors"
        >
          {t('restoreBannerRestore')}
        </button>
      </div>
    </div>
  )
}