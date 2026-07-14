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
import { PageNode } from './types'

// ─── Font Family choices for the toolbar dropdown ──────────────────────────
export const FONT_FAMILIES: { label: string; value: string }[] = [
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

// ─── Font Size choices ──────────────────────────────────────────────────────
export const FONT_SIZES: { label: string; value: string }[] = [
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

export const FONT_WEIGHTS: { label: string; value: string }[] = [
  { label: 'Default',    value: '' },
  { label: 'Light',      value: '300' },
  { label: 'Normal',     value: '400' },
  { label: 'Medium',     value: '500' },
  { label: 'Semibold',   value: '600' },
  { label: 'Bold',       value: '700' },
  { label: 'Extra Bold', value: '800' },
  { label: 'Black',      value: '900' },
]

// ─── Highlight color choices ────────────────────────────────────────────────
export const HIGHLIGHT_COLORS: { label: string; value: string }[] = [
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green',  value: '#bbf7d0' },
  { label: 'Blue',   value: '#bfdbfe' },
  { label: 'Pink',   value: '#fbcfe8' },
  { label: 'Orange', value: '#fed7aa' },
]

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
export function useRichTextEdit(node: PageNode, prop: string, extensions: AnyExtension[]) {
  const updateProps    = useBuilderStore(s => s.updateProps)
  const selectedId     = useBuilderStore(s => s.selectedId)
  const setRichEditing = useBuilderStore(s => s.setRichEditing)
  const [isRichEditing, setIsRichEditing] = useState(false)

  const editor = useEditor({
    extensions,
    content: (node.props[prop] as string) ?? '',
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

  const commitAndClose = useCallback((ed: Editor) => {
    const html = sanitizeRichText(ed.getHTML())
    updateProps(node.id, { [prop]: html })
    setIsRichEditing(false)
    setRichEditing(null)
    ed.setEditable(false)
  }, [node.id, prop, updateProps, setRichEditing])

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

  useEffect(() => {
    if (!editor || isRichEditing) return
    const incoming = (node.props[prop] as string) ?? ''
    if (editor.getHTML() !== incoming) editor.commands.setContent(incoming, { emitUpdate: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.props[prop], editor, isRichEditing])

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

  return { isRichEditing, startEditing, editor, handleBlur }
}