'use client'

import { useEffect, useRef } from 'react'
import { useBuilderStore } from './store'
import { saveToLocalStorage } from './exportImport'

const DEBOUNCE_MS = 1200
// Safety net: even during a long burst of rapid edits (each one resetting
// the debounce timer below), force a flush at least this often — so an
// unusually long editing session that never pauses long enough to hit the
// debounce window on its own still can't lose more than this much work.
const MAX_WAIT_MS = 8000

// Cheap array-of-primitive-refs equality — avoids depending on a specific
// zustand minor version's 'zustand/shallow' export path. Only ever called
// with the fixed-length tuple this file builds below, so length checking
// is a formality, not real defensive coding.
function shallowArrayEqual(a: readonly unknown[], b: readonly unknown[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

// Mount via <Autosave /> (see Autosave.tsx) once, anywhere near the app
// root. Subscribes directly to the store (useBuilderStore.subscribe, from
// the subscribeWithSelector middleware already applied in store.ts) rather
// than a React-render-driven useEffect on selector values — this needs to
// react to every qualifying store WRITE, including ones that happen far
// outside React's render cycle (e.g. a rapid sequence of drag-and-drop
// moves), and subscribe's listener fires synchronously on each one with no
// render in between.
//
// WHAT COUNTS AS "a change worth saving": nodes, globalColors,
// globalTypography, globalCustomCss, globalCustomJs, seo — exactly the six
// fields saveToLocalStorage's own `extra` parameter already accepts (see
// exportImport.ts). Deliberately excludes UI-only fields already excluded
// from undo/redo for the same reason (selectedId, locale, controlPanelTab,
// tutorial state, canvasScale, etc.) — none of that is "page content" a
// person would be upset to lose.
export function useAutosave() {
  const setStatus      = useBuilderStore(s => s.setAutosaveStatus)
  const setLastSavedAt = useBuilderStore(s => s.setAutosaveLastSavedAt)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const maxWaitRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef   = useRef(false)

  useEffect(() => {
    function flush() {
      if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null }
      if (maxWaitRef.current)  { clearTimeout(maxWaitRef.current);  maxWaitRef.current = null }
      if (!pendingRef.current) return
      pendingRef.current = false

      const {
        nodes, rootId, globalColors, globalTypography,
        globalCustomCss, globalCustomJs, seo,
      } = useBuilderStore.getState()

      setStatus('saving')
      const ok = saveToLocalStorage(nodes, rootId, {
        globalColors, globalTypography, globalCustomCss, globalCustomJs, seo,
      })
      if (ok) {
        setLastSavedAt(Date.now())
        setStatus('saved')
      } else {
        // Most likely cause: localStorage is full (large embedded images
        // as base64 data URLs — see Media.ts — are the usual culprit).
        // Same failure TopBar's manual Save already surfaces via a toast;
        // this just surfaces it passively via the indicator instead.
        setStatus('error')
      }
    }

    function scheduleSave() {
      pendingRef.current = true
      setStatus('pending')

      // Resets on every qualifying change — this is the actual "debounce":
      // a save only fires once things go quiet for DEBOUNCE_MS.
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(flush, DEBOUNCE_MS)

      // Armed ONCE per burst (never re-armed while already pending) —
      // this caps the total wait since the burst STARTED, rather than
      // resetting on every keystroke the way the debounce timer above
      // deliberately does.
      if (!maxWaitRef.current) {
        maxWaitRef.current = setTimeout(flush, MAX_WAIT_MS)
      }
    }

    // fireImmediately defaults to false, so the untouched initial state on
    // mount never triggers a save — only a genuine edit after that does.
    const unsubscribe = useBuilderStore.subscribe(
      s => [s.nodes, s.globalColors, s.globalTypography, s.globalCustomCss, s.globalCustomJs, s.seo] as const,
      scheduleSave,
      { equalityFn: shallowArrayEqual },
    )

    // Flush immediately (skip the debounce) the moment the tab is actually
    // going away — the two realistic "leaving right now" signals a browser
    // gives. visibilitychange is the reliable one on mobile (backgrounding
    // an app tab there often never fires beforeunload/pagehide at all);
    // pagehide covers desktop tab close/navigation. Both are cheap no-ops
    // when nothing is pending.
    function onVisibility() { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      unsubscribe()
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (maxWaitRef.current)  clearTimeout(maxWaitRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}