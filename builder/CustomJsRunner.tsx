'use client'

import { useEffect } from 'react'
import { useBuilderStore } from './store'
import { hasCustomJs, nodeScriptElement, runCustomJs } from './customJs'

// Preview-only. Render this as a sibling inside PreviewRenderer, keyed off
// the SAME previewReplayNonce that already force-remounts the rest of
// Preview's tree on Replay:
//
//   <CustomJsRunner key={previewReplayNonce} />
//
// Keying it this way means this component gets torn down and recreated
// together with the DOM it depends on — exactly the semantics Custom JS
// needs: old elements are gone, their scripts' cleanup functions run
// naturally via this component's own unmount, and the fresh elements get
// their scripts (re-)bound on the new mount. Same remount-via-key
// mechanism Preview's own CSS-animation replay already relies on.
//
// NEVER render this inside EditorRenderer — see the doc comment at the top
// of customJs.ts for why the canvas never executes Custom JS at all.
export function CustomJsRunner() {
  const nodes          = useBuilderStore(s => s.nodes)
  const globalCustomJs = useBuilderStore(s => s.globalCustomJs)

  useEffect(() => {
    const cleanups: Array<() => void> = []

    if (globalCustomJs.trim()) {
      const cleanup = runCustomJs(globalCustomJs, undefined, 'page-wide script error')
      if (cleanup) cleanups.push(cleanup)
    }

    for (const id in nodes) {
      const node = nodes[id]
      if (!hasCustomJs(node)) continue
      const el = nodeScriptElement(node)
      if (!el) continue
      const cleanup = runCustomJs(node.props.customJs as string, el, `error in block ${id}`)
      if (cleanup) cleanups.push(cleanup)
    }

    return () => {
      cleanups.forEach(fn => {
        try { fn() } catch { /* teardown errors are non-fatal, same as run errors */ }
      })
    }
    // Deliberately run-once-per-mount: this component is remounted wholesale
    // via the `key={previewReplayNonce}` prop its PARENT applies (see the
    // usage note above) whenever a fresh run is actually needed — reacting
    // to every store change here instead (e.g. via [nodes, globalCustomJs]
    // deps) would re-execute every script on the page far more often than
    // intended, since `nodes` changes reference on essentially every store
    // update. The remount-via-key approach is the correct, already-
    // established pattern for this in this codebase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}