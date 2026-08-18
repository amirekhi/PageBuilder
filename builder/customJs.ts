import { PageNode } from './types'
import { wrapperClassFor } from './customCss'

// ─── Custom JS ──────────────────────────────────────────────────────────────
// The Content tab's per-node escape hatch (node.props.customJs), plus the
// store's globalCustomJs (see store.ts) for page-wide code. Both mirror
// Custom CSS's exact shape and philosophy (see customCss.ts's own header
// comment): a plain textarea, no sandboxing/parsing, runs exactly as
// written — the same trust model Webflow/Wix/Squarespace's own "custom
// code" panels already use.
//
// EXECUTION MODEL (see CustomJsRunner.tsx and exportImport.ts's own
// script-building for where each of these actually happens):
//   - Editor canvas: NEVER. Same rule Preview's animations already follow
//     — the canvas always shows a static, predictable DOM so drag/resize/
//     selection/rich-text-editing never has to fight code a user wrote
//     running against a tree that's also being actively mutated by React's
//     own drag-and-drop.
//   - Preview: yes, once per mount (and again on Replay, since Preview's
//     whole tree remounts via a key bump — see CustomJsRunner.tsx).
//   - Exported static HTML: yes, once, via a plain <script> block appended
//     the same way INTERACTIVE_SCRIPT already is in exportImport.ts.
//
// BINDING: a per-node script is called as `fn(el)` with `el` bound to that
// exact block's own DOM element — found via wrapperClassFor(node.id), the
// SAME class Custom CSS/hover styles already use (see customCssClass in
// customCss.ts, which now also triggers whenever Custom JS is set — see
// its own comment there). Reusing that one class means Custom JS needed
// zero new addressing mechanism: document.getElementById(...) already
// works for any OTHER named block via the existing Element ID field
// (elementId.ts). The page-wide globalCustomJs script gets no `el` at all
// — it isn't scoped to one block, so document.getElementById(...) is how
// it reaches anything.
//
// CLEANUP: if a script (per-node or global) RETURNS a function, that
// function is treated as cleanup/teardown — the same convention a React
// useEffect already uses, so it's a mental model anyone touching this
// field already has. Called when Preview's tree unmounts (navigating
// away, switching back to Edit mode, or a Replay-triggered remount) or,
// for the exported page, never explicitly (a real page navigation/reload
// tears everything down anyway — there's no SPA-style unmount to hook).
//
// SECURITY NOTE (documented, not solved here): Preview renders inline,
// same-origin, in the same document as the builder app itself — fine for
// a single-user tool, but if this app is ever exposed as a multi-tenant
// hosted product where someone else's saved JS could run inside a session
// that isn't theirs, Preview would need to move into a sandboxed
// <iframe sandbox="allow-scripts"> before shipping this feature further —
// same-origin script execution is a real session/cookie exposure vector
// in that scenario. Not a concern for this app as it exists today.

export function hasCustomJs(node: PageNode): boolean {
  return !!(node.props.customJs as string | undefined)?.trim()
}

export function nodeScriptElement(node: PageNode): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.querySelector<HTMLElement>(`.${wrapperClassFor(node.id)}`)
}

// Runs one script — either a per-node script (elBinding provided, called
// as fn(el)) or the page-wide script (elBinding undefined, called as
// fn()) — swallowing and logging any error so one broken block's script
// can never take down the rest of the page's other scripts or Preview
// itself. Returns the script's own cleanup function if it returned one,
// else undefined.
export function runCustomJs(
  code: string,
  elBinding: HTMLElement | undefined,
  errorLabel: string,
): (() => void) | undefined {
  try {
    // eslint-disable-next-line no-new-func
    const fn = elBinding ? new Function('el', code) : new Function(code)
    const result = elBinding ? fn(elBinding) : fn()
    return typeof result === 'function' ? result : undefined
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[Custom JS] ${errorLabel}:`, err)
    return undefined
  }
}

// Escapes any literal "</script" sequence inside user-authored code before
// it's embedded in a STATIC exported <script> tag — without this, code
// containing that substring (even inside a string literal, or a comment
// mentioning some HTML) would prematurely close the real <script> tag as
// far as the HTML PARSER is concerned. This is parsed before any JS ever
// runs, so it's not something valid/invalid JavaScript syntax can protect
// against — it has to be handled at the text level, here. Standard
// technique: break up the sequence so the HTML parser never sees it
// intact, while the browser's JS engine still sees the original text back
// (`<\/script` is a valid, harmless escape sequence in JS source, so the
// author's code behaves identically after this transform).
export function escapeScriptClose(code: string): string {
  return code.replace(/<\/script/gi, '<\\/script')
}