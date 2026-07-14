import '@testing-library/jest-dom/vitest'

// ─── Tiptap / ProseMirror jsdom shims ───────────────────────────────────────
// jsdom doesn't implement real layout, so Range.getClientRects/
// getBoundingClientRect and Element.getBoundingClientRect are missing or
// return zeros — ProseMirror's EditorView calls these internally during
// mount/selection handling and throws without them. This is a well-known
// requirement for testing Tiptap/ProseMirror outside a real browser, not
// something specific to this app's code.

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom@27's CSS color parser (@asamuzakjp/css-color -> @csstools/css-calc)
    // ships ESM-only. Vitest's default "forks" pool loads test files via
    // require(), which chokes on that with ERR_REQUIRE_ESM. The "threads"
    // pool uses real ESM import() instead, which resolves it correctly.
    pool: 'threads',
    environment: 'node', // per-file `// @vitest-environment jsdom` pragma opts into jsdom only where needed
    globals: false,
  },
})
if (typeof document !== 'undefined') {
  if (!(document.createRange as any).__patchedForTiptap) {
    const originalCreateRange = document.createRange.bind(document)
    document.createRange = () => {
      const range = originalCreateRange()
      range.getBoundingClientRect = () => ({
        bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0, x: 0, y: 0, toJSON() { return this },
      })
      range.getClientRects = () => ({
        item: () => null, length: 0,
        [Symbol.iterator]: function* () {},
      }) as any
      return range
    }
    ;(document.createRange as any).__patchedForTiptap = true
  }
}

if (typeof Element !== 'undefined' && !Element.prototype.getBoundingClientRect.toString().includes('__patchedForTiptap')) {
  Element.prototype.getBoundingClientRect = function patchedForTiptap() {
    return { bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0, x: 0, y: 0, toJSON() { return this } }
  }
}