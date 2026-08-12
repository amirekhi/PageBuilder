'use client'

import { useCallback, useEffect } from 'react'
import { useEditor, type Editor, type AnyExtension } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle, FontFamily, FontSize, Color } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import { CharacterCount } from '@tiptap/extensions'
import { TableKit } from '@tiptap/extension-table'
import Image from '@tiptap/extension-image'
import { Details, DetailsSummary, DetailsContent } from '@tiptap/extension-details'
import DOMPurify from 'dompurify'
import { useState } from 'react'
import { useBuilderStore } from './store'
import type { Locale } from './store'
import { PageNode } from './types'
import { directionForLocale } from './i18n'
import {
  resolveContentForBreakpoint, commitContentForBreakpoint,
  clearContentOverride, hasContentOverrideAt,
} from './richTextResponsive'

// ─── Toolbar dropdown option shape ─────────────────────────────────────────
// Shared shape for every *_EN/*_FA pair below (Font Family, Font Weight,
// Font Size) — kept as a single named interface rather than repeating the
// inline `{ label: string; value: string }[]` shape at each declaration,
// since RichTextToolbar.tsx maps over all of them identically.
export interface FontOption {
  label: string
  value: string
}

// ─── Font Family choices for the toolbar dropdown ──────────────────────────
// Two parallel lists — EN and FA — selected via getFontFamilies(locale)
// rather than a single flat list, for the same reason templates.ts keeps a
// separate _COPY object per locale instead of trying to force one array to
// serve both languages: Latin web-safe fonts (Arial, Times New Roman, …)
// have no Persian glyphs at all, so showing them as "options" while editing
// Farsi content would be actively misleading, not just untranslated labels.
//
// FONT_FAMILIES_EN is unchanged from before — still the plain Latin/system
// font set for English content.
export const FONT_FAMILIES_EN: FontOption[] = [
  { label: 'Default',     value: '' },
  { label: 'Sans Serif',  value: 'ui-sans-serif, system-ui, sans-serif' },
  { label: 'Serif',       value: 'ui-serif, Georgia, serif' },
  { label: 'Mono',        value: 'ui-monospace, "SF Mono", monospace' },
  { label: 'Arial',       value: 'Arial, sans-serif' },
  { label: 'Georgia',     value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Verdana',     value: 'Verdana, sans-serif' },
]

// Persian/Farsi web fonts, all pulled from Google Fonts (see
// PERSIAN_GOOGLE_FONTS / ensurePersianFontsLoaded below) rather than
// bundled locally — this app is a client-only module with no build step of
// its own to vendor font files into, so a CDN stylesheet is the same
// "let the platform do it" approach already used for Tailwind itself (see
// the <script src="https://cdn.tailwindcss.com"> tag in exportImport.ts).
//
// Vazirmatn is listed first (used as the visible "پیش‌فرض" / Default-ish
// entry) because it has full, high-quality Persian AND Latin glyph
// coverage — mixed Persian/English text (a phone number, an email address
// inside a Farsi paragraph) still renders correctly in it, unlike the more
// specialized options below, which fall back to the browser's generic
// Latin font for non-Persian characters.
export const FONT_FAMILIES_FA: FontOption[] = [
  { label: 'پیش‌فرض',                     value: '' },
  { label: 'وزیرمتن (Vazirmatn)',          value: "'Vazirmatn', ui-sans-serif, system-ui, sans-serif" },
  { label: 'نسخ (Noto Naskh Arabic)',      value: "'Noto Naskh Arabic', serif" },
  { label: 'سنس عربی (Noto Sans Arabic)',  value: "'Noto Sans Arabic', ui-sans-serif, sans-serif" },
  { label: 'مرکزی (Markazi Text)',         value: "'Markazi Text', serif" },
  { label: 'لاله‌زار — تیتر (Lalezar)',    value: "'Lalezar', cursive" },
  { label: 'Sans Serif (لاتین)',           value: 'ui-sans-serif, system-ui, sans-serif' },
  { label: 'Serif (لاتین)',                value: 'ui-serif, Georgia, serif' },
]

export function getFontFamilies(locale: Locale): FontOption[] {
  return locale === 'fa' ? FONT_FAMILIES_FA : FONT_FAMILIES_EN
}

// ─── Google Fonts loading (Persian set only) ───────────────────────────────
// One combined stylesheet request for the whole Persian family set, rather
// than one request per font — cheaper, and means a document mixing e.g.
// Vazirmatn body text with a Lalezar heading only ever costs one network
// round trip. Injected on demand (see ensurePersianFontsLoaded) rather than
// unconditionally in some root layout, since this module has no root
// layout of its own to hook into and an English-only page should never pay
// for fonts it never uses.
const PERSIAN_GOOGLE_FONTS: { family: string; weights?: string }[] = [
  { family: 'Vazirmatn',         weights: '300;400;500;600;700;800' },
  { family: 'Noto Naskh Arabic', weights: '400;700' },
  { family: 'Noto Sans Arabic',  weights: '400;500;700' },
  { family: 'Markazi Text',      weights: '400;500;600;700' },
  { family: 'Lalezar' },
]

export function buildPersianGoogleFontsHref(): string {
  const parts = PERSIAN_GOOGLE_FONTS.map(f => {
    const familyParam = f.family.replace(/ /g, '+')
    return f.weights ? `family=${familyParam}:wght@${f.weights}` : `family=${familyParam}`
  })
  return `https://fonts.googleapis.com/css2?${parts.join('&')}&display=swap`
}

const PERSIAN_FONTS_LINK_ID = 'pb-persian-fonts-stylesheet'

// Injects the Google Fonts stylesheet for the Persian font set exactly
// once per page load — same dedup-before-inject pattern
// ImageEditorModalClient.tsx already uses for TOAST UI's own CSS
// (ensureStylesheet there checks for an existing <link href>; this checks
// by id instead, since this is one combined multi-family URL rather than
// several separate per-library files). Safe to call on every render or
// toolbar mount — it's a no-op after the first successful call. Browser-
// only, same `typeof document === 'undefined'` guard every other
// DOM-touching helper in this codebase already uses (e.g.
// saveToLocalStorage in exportImport.ts).
export function ensurePersianFontsLoaded(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(PERSIAN_FONTS_LINK_ID)) return
  const link = document.createElement('link')
  link.id = PERSIAN_FONTS_LINK_ID
  link.rel = 'stylesheet'
  link.href = buildPersianGoogleFontsHref()
  document.head.appendChild(link)
}

// ─── Font Size choices ──────────────────────────────────────────────────────
// Only the "Default" label differs by locale — the numeric size labels
// ('12', '14', …) deliberately stay as plain Latin digits in both
// languages, same convention already used for stats/dates/prices
// throughout templates.ts (numeric figures aren't transliterated).
export const FONT_SIZES_EN: FontOption[] = [
  { label: 'Default', value: '' },
  { label: '12',  value: '12px' },
  { label: '14',  value: '14px' },
  { label: '16',  value: '16px' },
  { label: '18',  value: '18px' },
  { label: '20',  value: '20px' },
  { label: '24',  value: '24px' },
  { label: '30',  value: '30px' },
  { label: '36',  value: '36px' },
  { label: '48',  value: '48px' },
  { label: '60',  value: '60px' },
]

const FONT_SIZES_FA: FontOption[] = [
  { label: 'پیش‌فرض', value: '' },
  ...FONT_SIZES_EN.slice(1),
]

export function getFontSizes(locale: Locale): FontOption[] {
  return locale === 'fa' ? FONT_SIZES_FA : FONT_SIZES_EN
}

// ─── Font Weight ("boldness") ───────────────────────────────────────────────
const FontWeight = Extension.create({
  name: 'fontWeight',

  addOptions() {
    return { types: ['textStyle'] }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontWeight: {
            default: null,
            parseHTML: element => element.style.fontWeight || null,
            renderHTML: attributes => {
              if (!attributes.fontWeight) return {}
              return { style: `font-weight: ${attributes.fontWeight}` }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontWeight: (weight: string) => ({ chain }: any) =>
        chain().setMark('textStyle', { fontWeight: weight }).run(),
      unsetFontWeight: () => ({ chain }: any) =>
        chain().setMark('textStyle', { fontWeight: null }).run(),
    } as any
  },
})

export const FONT_WEIGHTS_EN: FontOption[] = [
  { label: 'Default',    value: '' },
  { label: 'Light',      value: '300' },
  { label: 'Normal',     value: '400' },
  { label: 'Medium',     value: '500' },
  { label: 'Semibold',   value: '600' },
  { label: 'Bold',       value: '700' },
  { label: 'Extra Bold', value: '800' },
  { label: 'Black',      value: '900' },
]

// Same numeric `value`s as the EN list — only the visible label changes,
// since font-weight itself is a CSS number with no locale of its own.
const FONT_WEIGHTS_FA: FontOption[] = [
  { label: 'پیش‌فرض',   value: '' },
  { label: 'باریک',     value: '300' },
  { label: 'نرمال',     value: '400' },
  { label: 'متوسط',     value: '500' },
  { label: 'نیمه‌ضخیم', value: '600' },
  { label: 'ضخیم',      value: '700' },
  { label: 'خیلی ضخیم', value: '800' },
  { label: 'سیاه',       value: '900' },
]

export function getFontWeights(locale: Locale): FontOption[] {
  return locale === 'fa' ? FONT_WEIGHTS_FA : FONT_WEIGHTS_EN
}

// ─── Highlight color choices ────────────────────────────────────────────────
export const HIGHLIGHT_COLORS_EN: FontOption[] = [
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green',  value: '#bbf7d0' },
  { label: 'Blue',   value: '#bfdbfe' },
  { label: 'Pink',   value: '#fbcfe8' },
  { label: 'Orange', value: '#fed7aa' },
]

const HIGHLIGHT_COLORS_FA: FontOption[] = [
  { label: 'زرد',    value: '#fef08a' },
  { label: 'سبز',    value: '#bbf7d0' },
  { label: 'آبی',    value: '#bfdbfe' },
  { label: 'صورتی',  value: '#fbcfe8' },
  { label: 'نارنجی', value: '#fed7aa' },
]

export function getHighlightColors(locale: Locale): FontOption[] {
  return locale === 'fa' ? HIGHLIGHT_COLORS_FA : HIGHLIGHT_COLORS_EN
}

// ─── Legacy flat exports ────────────────────────────────────────────────────
// Kept pointing at the EN lists so anything importing the old flat names
// directly (rather than the new getFontFamilies(locale)-style functions
// above) keeps compiling unchanged. RichTextToolbar.tsx itself has been
// updated to call the locale-aware functions instead — see that file.
export const FONT_FAMILIES    = FONT_FAMILIES_EN
export const FONT_SIZES       = FONT_SIZES_EN
export const FONT_WEIGHTS     = FONT_WEIGHTS_EN
export const HIGHLIGHT_COLORS = HIGHLIGHT_COLORS_EN

// ─── Sanitization ────────────────────────────────────────────────────────────
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'br', 'span', 'blockquote', 'code',
    'mark',
    'table', 'tbody', 'thead', 'tr', 'td', 'th', 'colgroup', 'col',
    'img',
    'details', 'summary', 'div',
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'style', 'class',
    'colspan', 'rowspan', 'colwidth',
    'src', 'alt', 'width', 'height',
    'open', 'data-type',
    'data-color',
  ],
}

export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, SANITIZE_CONFIG)
}

// ─── Extension sets ──────────────────────────────────────────────────────────

export function buildTextExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: false,
    }),
    Underline,
    Link.configure({ openOnClick: false, autolink: true }),
    TextAlign.configure({ types: ['paragraph'] }),
    Placeholder.configure({ placeholder: 'Click to edit text…' }),
    TextStyle,
    FontFamily,
    FontSize,
    Color,
    FontWeight,
    Highlight.configure({ multicolor: true }),
    CharacterCount,
    TableKit.configure({
      table: { resizable: true },
    }),
    Image.configure({
      inline: false,
    }),
    Details.configure({ persist: true }),
    DetailsSummary,
    DetailsContent,
  ]
}

export function buildHeadingExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      blockquote: false,
      codeBlock: false,
    }),
    Underline,
    Link.configure({ openOnClick: false, autolink: true }),
    TextAlign.configure({ types: ['paragraph'] }),
    TextStyle,
    FontFamily,
    FontSize,
    Color,
    FontWeight,
    Highlight.configure({ multicolor: true }),
  ]
}

// ─── useRichTextEdit ─────────────────────────────────────────────────────────
// CHANGED: Tiptap's own `onBlur` option used to call commitAndClose directly
// — but that fires the INSTANT the ProseMirror contenteditable loses focus
// for ANY reason, including a click landing on the toolbar's own <select>/
// <input type="color"> (which MUST be able to steal focus to open their
// native dropdown/picker — see RichTextToolbar's comment on why
// preventDefault can't live on the toolbar's container anymore). Result:
// picking a font/size/weight/color closed the whole editor instantly,
// before the change could even register.
//
// Fix: stop using Tiptap's onBlur entirely. Instead, expose `handleBlur` —
// a plain REACT blur handler meant to be attached to the outer wrapper div
// that contains BOTH the toolbar AND the EditorContent (see
// TextEditor/HeadingEditor in nodeComponents.tsx). React's onBlur bubbles
// from any descendant, so this fires whenever focus leaves ANYTHING inside
// that wrapper — but it checks event.relatedTarget (the element ABOUT TO
// receive focus): if that element is still somewhere inside the same
// wrapper (e.g. focus is only moving from the text into the toolbar's font
// dropdown), it's not a real "done editing" — skip the commit. Only commit
// when focus is leaving the wrapper for good (relatedTarget is null, or
// outside the wrapper entirely — clicking elsewhere on the canvas, a panel
// field, etc.).
//
// NEW (breakpoint-aware content): this hook used to read/write
// node.props[prop] directly — a single copy shared by every breakpoint,
// which is exactly what caused editing font size while viewing Mobile to
// silently change Desktop too (there was only ever one string to edit).
// Fixed via richTextResponsive.ts's three-bucket cascade
// (content/contentTablet/contentMobile), mirroring the exact pattern
// style/animation already use:
//   - LOADING: the content-sync effect below now resolves against
//     resolveContentForBreakpoint(node, prop, editingBreakpoint) instead of
//     reading node.props[prop] directly, so opening the editor while
//     viewing Mobile loads Mobile's own snapshot (or falls back up the
//     chain if Mobile has none yet).
//   - COMMITTING: commitAndClose now writes through
//     commitContentForBreakpoint, which — like patchNodeStyle — always
//     targets whichever breakpoint is ACTIVE AT COMMIT TIME, reading
//     editingBreakpoint fresh off the store rather than a stale closure
//     value.
//   - SWITCHING BREAKPOINTS MID-EDIT: if the user changes
//     Desktop/Tablet/Mobile while the editor is still open, the "switch
//     breakpoint while mid-edit" effect below auto-commits and closes
//     first — the same safe, predictable behavior as switching away to a
//     different selected block (see the existing commit-on-deselect
//     effect), rather than leaving the editor open showing stale content
//     while writes silently get attributed to a different breakpoint.
//   - RESETTING: hasOverride/clearOverride are exposed so callers (the
//     RichTextToolbar's breakpoint pill, and TextPanel/HeadingPanel's
//     plain-textarea fallback) can show the familiar "differs from
//     Desktop" pill + reset button StyleTab/AnimationPanel already have.
//
// NEW: dir attribute on the underlying ProseMirror contenteditable, kept in
// sync with the current locale (see directionForLocale in i18n.ts) via a
// plain imperative DOM update in an effect — NOT via editorProps.attributes
// at editor-creation time, since useEditor's own deps array below is `[]`
// (the editor is intentionally created once and never recreated, to avoid
// losing undo history/selection every time something re-renders). Setting
// it imperatively lets the caret/selection behavior correctly follow
// whichever direction is active right now without ever tearing down and
// rebuilding the whole editor instance.
export function useRichTextEdit(node: PageNode, prop: string, extensions: AnyExtension[]) {
  const updateProps       = useBuilderStore(s => s.updateProps)
  const selectedId        = useBuilderStore(s => s.selectedId)
  const setRichEditing    = useBuilderStore(s => s.setRichEditing)
  const locale             = useBuilderStore(s => s.locale)
  const editingBreakpoint  = useBuilderStore(s => s.editingBreakpoint)
  const [isRichEditing, setIsRichEditing] = useState(false)

  const isOverrideBreakpoint = editingBreakpoint !== 'desktop'
  const hasOverride = isOverrideBreakpoint && hasContentOverrideAt(node, prop, editingBreakpoint)

  const editor = useEditor({
    extensions,
    content: resolveContentForBreakpoint(node, prop, editingBreakpoint),
    editable: false,
    immediatelyRender: false, // avoids an SSR/hydration mismatch in Next.js
    // NOTE: no onBlur here anymore — see handleBlur below, attached at the
    // wrapper level instead of Tiptap's own contenteditable-only blur.
    editorProps: {
      handleKeyDown: (_view, event) => {
        if (event.key === 'Enter' && !event.shiftKey && node.type === 'heading') {
          event.preventDefault()
          editor?.commands.blur()
          return true
        }
        return false
      },
    },
  }, [])

  // Keeps the editable DOM element's dir attribute in sync with the current
  // locale — see the NEW comment above useRichTextEdit for why this is
  // imperative rather than part of the editorProps passed to useEditor.
  useEffect(() => {
    if (!editor) return
    editor.view.dom.setAttribute('dir', directionForLocale(locale))
  }, [editor, locale])

  // Loads the Persian Google Fonts stylesheet as soon as Farsi typing
  // starts anywhere in the app — same trigger point RichTextToolbar.tsx
  // also uses (see its own effect), kept here too so the fonts are already
  // available the moment someone opens the font-family dropdown, rather
  // than only after they've clicked into it once.
  useEffect(() => {
    if (locale === 'fa') ensurePersianFontsLoaded()
  }, [locale])

  const commitAndClose = useCallback((ed: Editor) => {
    const html = sanitizeRichText(ed.getHTML())
    commitContentForBreakpoint(node, prop, p => updateProps(node.id, p), html)
    setIsRichEditing(false)
    setRichEditing(null)
    ed.setEditable(false)
  }, [node, prop, updateProps, setRichEditing])

  // Wrapper-level blur handler — see the big comment above. Attach this to
  // the outer div that wraps both the toolbar and EditorContent.
  const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if (!editor) return
    const goingTo = e.relatedTarget as Node | null
    if (goingTo && e.currentTarget.contains(goingTo)) return // still inside toolbar/editor — not really leaving
    commitAndClose(editor)
  }, [editor, commitAndClose])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(isRichEditing)
    if (isRichEditing) requestAnimationFrame(() => editor.commands.focus('end'))
  }, [isRichEditing, editor])

  // Keeps the Tiptap document in sync with whichever breakpoint's snapshot
  // is currently RESOLVED (not just node.props[prop] directly — see the
  // big comment above) whenever something changes it externally (undo/
  // redo, a different collaborator, the plain-textarea fallback in
  // TextPanel/HeadingPanel) while this editor isn't actively being typed
  // into. Depends on all three buckets AND editingBreakpoint, so switching
  // Desktop/Tablet/Mobile while NOT mid-edit correctly reloads whichever
  // snapshot that breakpoint resolves to.
  useEffect(() => {
    if (!editor || isRichEditing) return
    const incoming = resolveContentForBreakpoint(node, prop, editingBreakpoint)
    if (editor.getHTML() !== incoming) editor.commands.setContent(incoming, { emitUpdate: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.props[prop], node.props[`${prop}Tablet`], node.props[`${prop}Mobile`], editor, isRichEditing, editingBreakpoint])

  // Commit-on-breakpoint-switch — if the user changes Desktop/Tablet/
  // Mobile while this exact editor is still open, close it out first
  // rather than leaving it open showing stale content while any further
  // typing would get silently attributed to the NEW breakpoint. Mirrors
  // commit-on-deselect below exactly, just keyed off editingBreakpoint
  // instead of selectedId.
  useEffect(() => {
    if (isRichEditing && editor) {
      commitAndClose(editor)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingBreakpoint])

  // Commit-on-deselect — unrelated to the blur fix above, still needed for
  // the case where a different block is selected entirely (e.g. via the
  // Layers panel) without any DOM blur event happening at all.
  useEffect(() => {
    if (isRichEditing && selectedId !== node.id && editor) {
      commitAndClose(editor)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const startEditing = useCallback(() => {
    setIsRichEditing(true)
    setRichEditing(node.id)
  }, [node.id, setRichEditing])

  const clearOverride = useCallback(() => {
    clearContentOverride(node, prop, p => updateProps(node.id, p), editingBreakpoint)
  }, [node.id, prop, updateProps, editingBreakpoint])

  return {
    isRichEditing, startEditing, editor, handleBlur,
    editingBreakpoint, hasOverride, clearOverride,
  }
}