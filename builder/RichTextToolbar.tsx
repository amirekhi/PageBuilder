'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Editor } from '@tiptap/react'
import { FONT_FAMILIES, FONT_SIZES, FONT_WEIGHTS, HIGHLIGHT_COLORS } from './richText'

const MARGIN = 8  // gap kept from viewport edges when clamping
const GAP    = 8  // vertical gap kept between the toolbar and the text itself

export function RichTextToolbar({
  editor: editorProp, allowBlocks = true,
}: {
  editor: Editor | null
  allowBlocks?: boolean
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState<'above' | 'below'>('above')
  const [leftOffset, setLeftOffset] = useState(0)
  const [maxWidth, setMaxWidth] = useState<number | undefined>(undefined)

  // Repositions AND resizes the toolbar so it (a) never gets clipped off
  // the top/side of the browser window, and (b) wraps into more rows
  // instead of overflowing sideways as the block it's attached to gets
  // narrower — whether that's a genuinely small browser window, or this
  // app's own Desktop/Tablet/Mobile breakpoint switcher shrinking the
  // simulated canvas without the real window changing size at all.
  //
  // TWO ResizeObservers are needed, watching two DIFFERENT things:
  //   - the block's own wrapper (`parent`): tells us how much width is
  //     actually available to wrap against. This is what changes when you
  //     switch breakpoints or resize the real window.
  //   - the toolbar itself (`el`): once maxWidth is applied and the toolbar
  //     wraps to 2-3 rows, ITS height changes — and that new height is
  //     exactly what "above" placement needs to offset by. Without
  //     watching this too, a freshly-wrapped 3-row toolbar would still
  //     offset itself as if it were 1 row tall, overlapping the text below.
  useEffect(() => {
    const el = wrapRef.current
    const parent = el?.parentElement
    if (!el || !parent) return

    function reposition() {
      if (!el || !parent) return

      const parentRect   = parent.getBoundingClientRect()
      const viewportW     = window.innerWidth

      // Width to wrap against: never wider than the block itself, and
      // never wider than the actual viewport (minus margins) either — a
      // wide desktop block still shouldn't push the toolbar off-screen.
      const nextMaxWidth = Math.max(200, Math.min(parentRect.width, viewportW - MARGIN * 2))
      setMaxWidth(nextMaxWidth)

      // Measure the toolbar's OWN current size (post-wrap) to decide
      // placement and vertical offset — a hardcoded "one row" constant
      // only worked back when it could never wrap at all.
      const toolbarRect = el.getBoundingClientRect()
      setPlacement(parentRect.top - toolbarRect.height - GAP < MARGIN ? 'below' : 'above')

      let nextLeft = 0
      const overflowRight = (parentRect.left + toolbarRect.width) - (viewportW - MARGIN)
      if (overflowRight > 0) nextLeft -= overflowRight
      const wouldGoOffLeft = parentRect.left + nextLeft - MARGIN
      if (wouldGoOffLeft < 0) nextLeft -= wouldGoOffLeft
      setLeftOffset(nextLeft)
    }

    reposition()
    const parentRO  = new ResizeObserver(reposition)
    const toolbarRO = new ResizeObserver(reposition)
    parentRO.observe(parent)
    toolbarRO.observe(el)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      parentRO.disconnect()
      toolbarRO.disconnect()
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [])

  if (!editorProp) return null
  const editor = editorProp

  function setLink() {
    const previousUrl = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', previousUrl ?? 'https://')
    if (url === null) return
    if (url === '') { editor.chain().focus().unsetLink().run(); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  function insertImage() {
    const url = window.prompt('Image URL', 'https://')
    if (!url) return
    editor.chain().focus().setImage({ src: url }).run()
  }

  function insertTable() {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  function insertDetails() {
    editor.chain().focus().setDetails().run()
  }

  function setTextColor(hex: string) {
    if (!hex) { editor.chain().focus().unsetColor().run(); return }
    editor.chain().focus().setColor(hex).run()
  }

  const inTable = editor.isActive('table')

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'absolute',
        top: placement === 'above' ? undefined : '100%',
        bottom: placement === 'above' ? '100%' : undefined,
        marginTop: placement === 'above' ? -GAP : GAP,
        // marginTop with a negative value while anchored via `bottom: 100%`
        // pulls the toolbar UP off the text by GAP px, same visual result
        // the old fixed `top: -46` gave for the single-row case — except
        // this now works regardless of how tall the (possibly wrapped)
        // toolbar actually is, since `bottom: 100%` anchors to its OWN
        // bottom edge sitting right at the text's top edge, not to a
        // guessed height.
        left: leftOffset,
        zIndex: 1000,
        width: maxWidth,
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="flex flex-wrap items-center gap-1 bg-white border border-neutral-200 rounded-lg shadow-lg px-1.5 py-1">
        <ToolBtn active={editor.isActive('bold')}      title="Bold (⌘B)"          onClick={() => editor.chain().focus().toggleBold().run()}>B</ToolBtn>
        <ToolBtn active={editor.isActive('italic')}    title="Italic (⌘I)"        onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></ToolBtn>
        <ToolBtn active={editor.isActive('underline')} title="Underline (⌘U)"     onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></ToolBtn>
        <ToolBtn active={editor.isActive('strike')}    title="Strikethrough"      onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></ToolBtn>

        <Divider />

        <ToolBtn active={editor.isActive('link')} title="Link" onClick={setLink}>🔗</ToolBtn>

        <Divider />

        <select
          value={(editor.getAttributes('textStyle').fontFamily as string) ?? ''}
          onChange={e => {
            const v = e.target.value
            if (v) editor.chain().focus().setFontFamily(v).run()
            else editor.chain().focus().unsetFontFamily().run()
          }}
          title="Font family"
          className="h-7 text-xs border border-neutral-200 rounded pl-1.5 pr-1 bg-white text-neutral-600 focus:outline-none w-[104px] shrink-0"
        >
          {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        <select
          value={(editor.getAttributes('textStyle').fontSize as string) ?? ''}
          onChange={e => {
            const v = e.target.value
            if (v) editor.chain().focus().setFontSize(v).run()
            else editor.chain().focus().unsetFontSize().run()
          }}
          title="Font size"
          className="h-7 text-xs border border-neutral-200 rounded pl-1.5 pr-4 bg-white text-neutral-600 focus:outline-none w-[72px] shrink-0"
        >
          {FONT_SIZES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        <select
          value={(editor.getAttributes('textStyle').fontWeight as string) ?? ''}
          onChange={e => {
            const v = e.target.value
            if (v) (editor.chain().focus() as any).setFontWeight(v).run()
            else (editor.chain().focus() as any).unsetFontWeight().run()
          }}
          title="Font weight"
          className="h-7 text-xs border border-neutral-200 rounded pl-1.5 pr-1 bg-white text-neutral-600 focus:outline-none w-[100px] shrink-0"
        >
          {FONT_WEIGHTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        <Divider />

        <input
          type="color"
          value={(editor.getAttributes('textStyle').color as string) || '#000000'}
          onChange={e => setTextColor(e.target.value)}
          title="Text color"
          className="w-7 h-7 rounded border border-neutral-200 cursor-pointer p-0 bg-transparent shrink-0"
        />
        {editor.getAttributes('textStyle').color && (
          <ToolBtn title="Clear text color" onClick={() => editor.chain().focus().unsetColor().run()}>×</ToolBtn>
        )}

        <div className="flex items-center gap-0.5 shrink-0">
          {HIGHLIGHT_COLORS.map(h => (
            <button
              key={h.value}
              type="button"
              title={h.label}
              onMouseDown={e => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleHighlight({ color: h.value }).run()}
              className={[
                'w-5 h-5 rounded-full border transition-transform hover:scale-110 shrink-0',
                editor.isActive('highlight', { color: h.value }) ? 'ring-2 ring-offset-1 ring-violet-500 border-transparent' : 'border-neutral-300',
              ].join(' ')}
              style={{ backgroundColor: h.value }}
            />
          ))}
          {editor.isActive('highlight') && (
            <ToolBtn title="Remove highlight" onClick={() => editor.chain().focus().unsetHighlight().run()}>×</ToolBtn>
          )}
        </div>

        {allowBlocks && (
          <>
            <Divider />
            <ToolBtn active={editor.isActive('bulletList')}  title="Bullet list"   onClick={() => editor.chain().focus().toggleBulletList().run()}>•≡</ToolBtn>
            <ToolBtn active={editor.isActive('orderedList')} title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.≡</ToolBtn>
            <ToolBtn active={editor.isActive('blockquote')}  title="Quote"         onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</ToolBtn>

            <Divider />
            <ToolBtn title="Insert image" onClick={insertImage}>🖼</ToolBtn>
            <ToolBtn title="Insert table" onClick={insertTable}>⊞</ToolBtn>
            <ToolBtn title="Insert collapsible section" onClick={insertDetails}>▸</ToolBtn>

            {inTable && (
              <>
                <Divider />
                <ToolBtn title="Add column after" onClick={() => editor.chain().focus().addColumnAfter().run()}>+col</ToolBtn>
                <ToolBtn title="Add row after"    onClick={() => editor.chain().focus().addRowAfter().run()}>+row</ToolBtn>
                <ToolBtn title="Delete column"    onClick={() => editor.chain().focus().deleteColumn().run()} danger>-col</ToolBtn>
                <ToolBtn title="Delete row"       onClick={() => editor.chain().focus().deleteRow().run()} danger>-row</ToolBtn>
                <ToolBtn title="Delete table"     onClick={() => editor.chain().focus().deleteTable().run()} danger>✕table</ToolBtn>
              </>
            )}
          </>
        )}

        <Divider />

        <ToolBtn active={editor.isActive({ textAlign: 'left' })}    title="Align left"   onClick={() => editor.chain().focus().setTextAlign('left').run()}>⇤</ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: 'center' })}  title="Align center" onClick={() => editor.chain().focus().setTextAlign('center').run()}>↔</ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: 'right' })}   title="Align right"  onClick={() => editor.chain().focus().setTextAlign('right').run()}>⇥</ToolBtn>

        <Divider />

        <ToolBtn title="Undo" onClick={() => editor.chain().focus().undo().run()}>↩</ToolBtn>
        <ToolBtn title="Redo" onClick={() => editor.chain().focus().redo().run()}>↪</ToolBtn>

        <Divider />

        <span className="text-[10px] text-neutral-400 px-1 shrink-0 select-none" title="Character count">
          {editor.storage.characterCount?.characters?.() ?? 0}
        </span>
      </div>
    </div>
  )
}

function ToolBtn({ children, title, onClick, active, danger }: {
  children: React.ReactNode; title: string; onClick: () => void; active?: boolean; danger?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      className={[
        'h-7 px-1.5 flex items-center justify-center rounded text-xs font-semibold transition-colors shrink-0',
        danger
          ? 'text-red-400 hover:text-red-600 hover:bg-red-50'
          : active ? 'bg-violet-100 text-violet-700' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-4 bg-neutral-200 mx-0.5 shrink-0 self-stretch" />
}