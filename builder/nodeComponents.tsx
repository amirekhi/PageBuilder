'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { NodeComponentProps, PanelProps, PageNode } from './types'
import { StyleProps, buildClassName, buildInlineStyle, buildOverlayStyle } from './styleMapper'
import { FieldGroup, SelectField, SpacingField, AlignField, ColorField, GradientField, StylePanel } from './panelComponents'
import { useBuilderStore } from './store'

// ─── Helper ───────────────────────────────────────────────────────────────────

function getStyle(node: PageNode): StyleProps {
  return (node.props.style as StyleProps) ?? {}
}

function patchStyle(node: PageNode, onChange: PanelProps['onChange'], partial: Partial<StyleProps>) {
  onChange({ style: { ...getStyle(node), ...partial } })
}

// ─── Inline editable hook ─────────────────────────────────────────────────────

function useInlineEdit(node: PageNode, prop: string = 'content') {
  const updateProps = useBuilderStore(s => s.updateProps)
  const selectedId  = useBuilderStore(s => s.selectedId)
  const isSelected  = selectedId === node.id
  const ref         = useRef<HTMLElement>(null)
  const isFocused   = useRef(false)

  useEffect(() => {
    if (!ref.current || isFocused.current) return
    const val = (node.props[prop] as string) ?? ''
    if (ref.current.textContent !== val) ref.current.textContent = val
  }, [node.props, prop])

  const onFocus = useCallback(() => { isFocused.current = true }, [])

  const onBlur = useCallback(() => {
    isFocused.current = false
    if (!ref.current) return
    updateProps(node.id, { [prop]: ref.current.textContent ?? '' })
  }, [node.id, prop, updateProps])

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Escape') ref.current?.blur()
    if (e.key === 'Enter' && !e.shiftKey && node.type === 'heading') {
      e.preventDefault()
      ref.current?.blur()
    }
  }, [node.type])

  const onInput = useCallback(() => {
    if (!ref.current) return
    updateProps(node.id, { [prop]: ref.current.textContent ?? '' })
  }, [node.id, prop, updateProps])

  return { ref, isSelected, onFocus, onBlur, onKeyDown, onInput }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION
// ═══════════════════════════════════════════════════════════════════════════════

export const SectionEditor: React.FC<NodeComponentProps> = ({ node, children }) => {
  const s = getStyle(node)
  const overlayStyle  = buildOverlayStyle(s.bgOverlay)
  const hasBackground = !!(s.bgImage || s.bgGradient)

  return (
    <section
      className={buildClassName(s, 'w-full relative')}
      style={{ ...buildInlineStyle(s), minHeight: s.minHeight ? undefined : 64 }}
    >
      {overlayStyle && <div style={overlayStyle} aria-hidden />}
      <div className={hasBackground ? 'relative z-10 w-full' : undefined}>
        {children}
      </div>
    </section>
  )
}

export const SectionPreview: React.FC<NodeComponentProps> = ({ node, children }) => {
  const s = getStyle(node)
  const overlayStyle  = buildOverlayStyle(s.bgOverlay)
  const hasBackground = !!(s.bgImage || s.bgGradient)

  return (
    <section className={buildClassName(s, 'w-full relative')} style={buildInlineStyle(s)}>
      {overlayStyle && <div style={overlayStyle} aria-hidden />}
      <div className={hasBackground ? 'relative z-10 w-full' : undefined}>
        {children}
      </div>
    </section>
  )
}

export const SectionPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = getStyle(node)
  const openMediaPicker = useBuilderStore(st => st.openMediaPicker)

  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Layout">
        <SelectField label="Display"   value={s.display ?? 'flex'} options={['flex','block','grid']} onChange={v => patchStyle(node, onChange, { display: v as StyleProps['display'] })} />
        <SelectField label="Direction" value={s.flexDir ?? 'col'}  options={['col','row','row-reverse','col-reverse']} onChange={v => patchStyle(node, onChange, { flexDir: v as StyleProps['flexDir'] })} />
        <SelectField label="Justify"   value={s.justify ?? 'start'} options={['start','center','end','between','around','evenly']} onChange={v => patchStyle(node, onChange, { justify: v as StyleProps['justify'] })} />
        <SelectField label="Align"     value={s.align ?? 'start'} options={['start','center','end','stretch']} onChange={v => patchStyle(node, onChange, { align: v as StyleProps['align'] })} />
        <SpacingField label="Gap"      value={s.gap} onChange={v => patchStyle(node, onChange, { gap: v })} />
      </FieldGroup>
      <FieldGroup label="Spacing">
        <SpacingField label="Padding X" value={s.px} onChange={v => patchStyle(node, onChange, { px: v })} />
        <SpacingField label="Padding Y" value={s.py} onChange={v => patchStyle(node, onChange, { py: v })} />
      </FieldGroup>
      <FieldGroup label="Width">
        <SelectField label="Max Width" value={s.maxWidth as string ?? ''} options={[{label:'—',value:''},'sm','md','lg','xl','2xl','3xl','4xl','5xl','6xl','7xl','full']} onChange={v => patchStyle(node, onChange, { maxWidth: (v || undefined) as StyleProps['maxWidth'] })} />
        <AlignField style={s} onChange={partial => patchStyle(node, onChange, partial)} />
      </FieldGroup>

      <FieldGroup label="Background">
        <ColorField label="Flat color" value={s.bgColor} onChange={v => patchStyle(node, onChange, { bgColor: v || undefined })} />

        <GradientField
          value={s.bgGradient}
          onChange={v => patchStyle(node, onChange, { bgGradient: v || undefined })}
        />

        {/* Background image picker */}
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Image</label>
          <button
            onClick={() => openMediaPicker(item => patchStyle(node, onChange, { bgImage: item.url }))}
            className="w-full rounded-lg border-2 border-dashed border-neutral-200 hover:border-violet-300 hover:bg-violet-50/40 transition-colors overflow-hidden"
            style={{ aspectRatio: '16/5' }}
          >
            {s.bgImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.bgImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-neutral-400">
                <span className="text-lg">🖼️</span>
                <span className="text-xs font-medium">Choose background image</span>
              </div>
            )}
          </button>
          {s.bgImage && (
            <div className="flex gap-2 mt-1.5">
              <button
                onClick={() => openMediaPicker(item => patchStyle(node, onChange, { bgImage: item.url }))}
                className="flex-1 text-xs font-medium text-violet-600 hover:text-violet-700 py-1 rounded-md hover:bg-violet-50 transition-colors"
              >
                Replace
              </button>
              <button
                onClick={() => patchStyle(node, onChange, { bgImage: undefined })}
                className="flex-1 text-xs font-medium text-neutral-400 hover:text-red-500 py-1 rounded-md hover:bg-red-50 transition-colors"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Size, position, overlay — only when a bg image is set */}
        {s.bgImage && (
          <>
            <SelectField
              label="Size"
              value={s.bgSize ?? 'cover'}
              options={[
                { label: 'Cover (fill)',  value: 'cover' },
                { label: 'Contain',       value: 'contain' },
                { label: 'Auto',          value: 'auto' },
              ]}
              onChange={v => patchStyle(node, onChange, { bgSize: v as StyleProps['bgSize'] })}
            />
            <SelectField
              label="Position"
              value={s.bgPos ?? 'center'}
              options={['center','top','bottom','left','right']}
              onChange={v => patchStyle(node, onChange, { bgPos: v as StyleProps['bgPos'] })}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 w-20 shrink-0">Overlay</span>
              <input
                type="range" min={0} max={80} step={5}
                className="flex-1 accent-violet-600"
                value={s.bgOverlay ?? 0}
                onChange={e => patchStyle(node, onChange, { bgOverlay: +e.target.value })}
              />
              <span className="text-xs text-neutral-400 w-8 text-right">{s.bgOverlay ?? 0}%</span>
            </div>
            <p className="text-[10px] text-neutral-400 -mt-1">Overlay darkens the image so text stays readable</p>
          </>
        )}
      </FieldGroup>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// AVATAR
// ═══════════════════════════════════════════════════════════════════════════════

function AvatarRender({ node }: { node: PageNode }) {
  const src      = node.props.src as string
  const size     = (node.props.size as number) ?? 56
  const initials = (node.props.initials as string) || ''
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={(node.props.alt as string) || ''} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-semibold shrink-0 select-none" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials || '?'}
    </div>
  )
}

export const AvatarEditor:  React.FC<NodeComponentProps> = ({ node }) => <AvatarRender node={node} />
export const AvatarPreview: React.FC<NodeComponentProps> = ({ node }) => <AvatarRender node={node} />

export const AvatarPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const openMediaPicker = useBuilderStore(st => st.openMediaPicker)
  const src = (node.props.src as string) ?? ''
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Image">
        <button onClick={() => openMediaPicker(item => onChange({ src: item.url, alt: item.alt }))} className="w-32 h-32 mx-auto block rounded-full border-2 border-dashed border-neutral-200 hover:border-violet-300 hover:bg-violet-50/40 transition-colors overflow-hidden">
          {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xl">🙂</div>}
        </button>
        {src && <button onClick={() => onChange({ src: '' })} className="w-full mt-2 text-xs font-medium text-neutral-400 hover:text-red-500 py-1.5 rounded-md hover:bg-red-50 transition-colors">Remove photo (use initials)</button>}
        <label className="block text-xs text-neutral-500 mt-3 mb-1">Initials (shown if no image)</label>
        <input maxLength={2} className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400" value={(node.props.initials as string) ?? ''} onChange={e => onChange({ initials: e.target.value.toUpperCase() })} />
      </FieldGroup>
      <FieldGroup label="Size">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 w-20 shrink-0">Diameter (px)</span>
          <input type="number" min={24} max={200} step={4} className="flex-1 border border-neutral-200 rounded text-xs p-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400" value={(node.props.size as number) ?? 56} onChange={e => onChange({ size: +e.target.value || 56 })} />
        </div>
        <p className="text-[10px] text-neutral-400">Tip: drag the corner handle on the canvas to resize instead</p>
      </FieldGroup>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUOTE
// ═══════════════════════════════════════════════════════════════════════════════

function QuoteRender({ node }: { node: PageNode }) {
  const s         = getStyle(node)
  const avatarSrc = node.props.avatarSrc as string
  const initials  = (node.props.initials as string) || (node.props.name as string)?.[0] || '?'
  return (
    <div className={buildClassName(s, 'flex flex-col gap-4')} style={buildInlineStyle(s)}>
      <p className="text-lg leading-relaxed text-neutral-700">"{(node.props.quote as string) || 'A short, glowing quote from a happy customer.'}"</p>
      <div className="flex items-center gap-3">
        {avatarSrc
          ? <img src={avatarSrc} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
          : <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-semibold shrink-0">{initials}</div>}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-800 truncate">{(node.props.name as string) || 'Jordan Lee'}</p>
          <p className="text-xs text-neutral-400 truncate">{(node.props.role as string) || 'Customer'}</p>
        </div>
      </div>
    </div>
  )
}

export const QuoteEditor:  React.FC<NodeComponentProps> = ({ node }) => <QuoteRender node={node} />
export const QuotePreview: React.FC<NodeComponentProps> = ({ node }) => <QuoteRender node={node} />

export const QuotePanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = getStyle(node)
  const openMediaPicker = useBuilderStore(st => st.openMediaPicker)
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Content">
        <label className="block text-xs text-neutral-500 mb-1">Quote</label>
        <textarea className="w-full border border-neutral-200 rounded-md text-sm p-2 resize-y min-h-20 focus:outline-none focus:ring-1 focus:ring-violet-400" value={(node.props.quote as string) ?? ''} onChange={e => onChange({ quote: e.target.value })} />
        <label className="block text-xs text-neutral-500 mt-2 mb-1">Name</label>
        <input className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400" value={(node.props.name as string) ?? ''} onChange={e => onChange({ name: e.target.value })} />
        <label className="block text-xs text-neutral-500 mt-2 mb-1">Role / company</label>
        <input className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400" value={(node.props.role as string) ?? ''} onChange={e => onChange({ role: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Avatar">
        <button onClick={() => openMediaPicker(item => onChange({ avatarSrc: item.url }))} className="w-16 h-16 rounded-full border-2 border-dashed border-neutral-200 hover:border-violet-300 hover:bg-violet-50/40 transition-colors overflow-hidden">
          {node.props.avatarSrc
            ? <img src={node.props.avatarSrc as string} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-neutral-400 text-sm">+</div>}
        </button>
      </FieldGroup>
      <StylePanel style={s} onChange={partial => patchStyle(node, onChange, partial)} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO
// ═══════════════════════════════════════════════════════════════════════════════

function toEmbedUrl(url: string): string | null {
  if (!url) return null
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{6,})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return url
}

function VideoRender({ node }: { node: PageNode }) {
  const s     = getStyle(node)
  const raw   = (node.props.url as string) || ''
  const embed = toEmbedUrl(raw)
  const ratio = (s.aspectRatio && s.aspectRatio !== 'auto') ? s.aspectRatio : '16/9'
  if (!embed) return (
    <div className={buildClassName(s, 'bg-neutral-100 border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center gap-1.5 text-neutral-400 text-sm')} style={{ ...buildInlineStyle(s), aspectRatio: ratio, minHeight: 160 }}>
      <span className="text-xl">▶</span>
      <span className="text-xs font-medium">Paste a YouTube or Vimeo link</span>
    </div>
  )
  return (
    <div className={buildClassName(s, 'overflow-hidden')} style={{ ...buildInlineStyle(s), aspectRatio: ratio }}>
      <iframe src={embed} className="w-full h-full" style={{ border: 0 }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
    </div>
  )
}

export const VideoEditor:  React.FC<NodeComponentProps> = ({ node }) => <VideoRender node={node} />
export const VideoPreview: React.FC<NodeComponentProps> = ({ node }) => <VideoRender node={node} />

export const VideoPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = getStyle(node)
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Source">
        <label className="block text-xs text-neutral-500 mb-1">YouTube / Vimeo URL</label>
        <input className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400" placeholder="https://youtube.com/watch?v=…" value={(node.props.url as string) ?? ''} onChange={e => onChange({ url: e.target.value })} />
        <p className="text-[10px] text-neutral-400 mt-1">Paste any YouTube or Vimeo link — it&apos;s converted to an embed automatically.</p>
      </FieldGroup>
      <FieldGroup label="Frame">
        <SelectField label="Aspect ratio" value={s.aspectRatio ?? '16/9'} options={[{ label:'Wide 16:9',value:'16/9' },{ label:'Standard 4:3',value:'4/3' },{ label:'Square 1:1',value:'1/1' },{ label:'Ultra 21:9',value:'21/9' }]} onChange={v => patchStyle(node, onChange, { aspectRatio: v as StyleProps['aspectRatio'] })} />
        <SelectField label="Rounded" value={s.rounded ?? 'lg'} options={['none','sm','md','lg','xl','2xl']} onChange={v => patchStyle(node, onChange, { rounded: v as StyleProps['rounded'] })} />
        <SelectField label="Shadow"  value={s.shadow ?? 'none'} options={['none','sm','md','lg','xl','2xl']} onChange={v => patchStyle(node, onChange, { shadow: v as StyleProps['shadow'] })} />
      </FieldGroup>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCORDION
// ═══════════════════════════════════════════════════════════════════════════════

interface AccordionItem { q: string; a: string }

function accordionItems(node: PageNode): AccordionItem[] {
  const raw = node.props.items as AccordionItem[] | undefined
  return raw && raw.length ? raw : [
    { q: 'What is included in the free plan?', a: 'One project, all core blocks, and community support.' },
    { q: 'Can I cancel anytime?',               a: 'Yes — there are no contracts or cancellation fees.' },
  ]
}

function AccordionRender({ node }: { node: PageNode }) {
  const s     = getStyle(node)
  const items = accordionItems(node)
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  return (
    <div className={buildClassName(s, 'w-full divide-y divide-neutral-200 border-t border-b border-neutral-200')} style={buildInlineStyle(s)}>
      {items.map((item, i) => {
        const isOpen = openIdx === i
        return (
          <div key={i}>
            <button type="button" onClick={e => { e.stopPropagation(); setOpenIdx(isOpen ? null : i) }} className="w-full flex items-center justify-between gap-4 py-4 text-left">
              <span className="text-sm font-medium text-neutral-800">{item.q}</span>
              <span className={['shrink-0 text-neutral-400 transition-transform duration-150', isOpen ? 'rotate-45' : ''].join(' ')}>+</span>
            </button>
            <div className="overflow-hidden transition-all duration-200" style={{ maxHeight: isOpen ? 240 : 0 }}>
              <p className="pb-4 text-sm text-neutral-500 leading-relaxed pr-8">{item.a}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const AccordionEditor:  React.FC<NodeComponentProps> = ({ node }) => <AccordionRender node={node} />
export const AccordionPreview: React.FC<NodeComponentProps> = ({ node }) => <AccordionRender node={node} />

export const AccordionPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s     = getStyle(node)
  const items = accordionItems(node)
  function updateItem(i: number, partial: Partial<AccordionItem>) {
    onChange({ items: items.map((it, idx) => idx === i ? { ...it, ...partial } : it) })
  }
  function addItem() { onChange({ items: [...items, { q: 'New question', a: 'Answer goes here.' }] }) }
  function removeItem(i: number) { onChange({ items: items.filter((_, idx) => idx !== i) }) }
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Items">
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="border border-neutral-200 rounded-lg p-2.5 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <input className="flex-1 border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400" placeholder="Question" value={item.q} onChange={e => updateItem(i, { q: e.target.value })} />
                <button onClick={() => removeItem(i)} className="shrink-0 w-7 h-7 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors text-sm" aria-label="Remove item">✕</button>
              </div>
              <textarea className="w-full border border-neutral-200 rounded-md text-sm p-2 resize-y min-h-14 focus:outline-none focus:ring-1 focus:ring-violet-400" placeholder="Answer" value={item.a} onChange={e => updateItem(i, { a: e.target.value })} />
            </div>
          ))}
        </div>
        <button onClick={addItem} className="w-full mt-1 text-xs font-medium text-violet-600 hover:text-violet-700 py-1.5 rounded-md hover:bg-violet-50 transition-colors">+ Add question</button>
      </FieldGroup>
      <StylePanel style={s} onChange={partial => patchStyle(node, onChange, partial)} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIST
// ═══════════════════════════════════════════════════════════════════════════════

function listItems(node: PageNode): string[] {
  const raw = node.props.items as string[] | undefined
  return raw && raw.length ? raw : ['First item', 'Second item', 'Third item']
}

const LIST_MARKERS: Record<string, string> = { bullet: '•', check: '✓', arrow: '→', number: '' }

function ListRender({ node }: { node: PageNode }) {
  const s          = getStyle(node)
  const items      = listItems(node)
  const markerType = (node.props.markerType as string) || 'bullet'
  return (
    <ul className={buildClassName(s, 'space-y-2 list-none')} style={buildInlineStyle(s)}>
      {items.map((text, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="shrink-0 text-violet-600 font-medium leading-6">{markerType === 'number' ? `${i + 1}.` : LIST_MARKERS[markerType] ?? '•'}</span>
          <span className="leading-6">{text}</span>
        </li>
      ))}
    </ul>
  )
}

export const ListEditor:  React.FC<NodeComponentProps> = ({ node }) => <ListRender node={node} />
export const ListPreview: React.FC<NodeComponentProps> = ({ node }) => <ListRender node={node} />

export const ListPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s     = getStyle(node)
  const items = listItems(node)
  function updateItem(i: number, value: string) { const next = [...items]; next[i] = value; onChange({ items: next }) }
  function addItem()    { onChange({ items: [...items, 'New item'] }) }
  function removeItem(i: number) { onChange({ items: items.filter((_, idx) => idx !== i) }) }
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Items">
        <div className="space-y-1.5">
          {items.map((text, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input className="flex-1 border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400" value={text} onChange={e => updateItem(i, e.target.value)} />
              <button onClick={() => removeItem(i)} className="shrink-0 w-7 h-7 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors text-sm" aria-label="Remove item">✕</button>
            </div>
          ))}
        </div>
        <button onClick={addItem} className="w-full mt-1 text-xs font-medium text-violet-600 hover:text-violet-700 py-1.5 rounded-md hover:bg-violet-50 transition-colors">+ Add item</button>
        <SelectField label="Marker" value={(node.props.markerType as string) ?? 'bullet'} options={[{ label:'Bullet',value:'bullet' },{ label:'Check',value:'check' },{ label:'Arrow',value:'arrow' },{ label:'Number',value:'number' }]} onChange={v => onChange({ markerType: v })} />
      </FieldGroup>
      <StylePanel style={s} onChange={partial => patchStyle(node, onChange, partial)} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// BADGE
// ═══════════════════════════════════════════════════════════════════════════════
// NOTE: previously this rendered with hardcoded classes only and never read
// node.props.style at all, which meant a resize handle here would visually
// do nothing. Now wired through buildClassName/buildInlineStyle like every
// other block, so width/height (and bg/rounded/shadow etc.) actually apply.

const BADGE_VARIANTS: Record<string, string> = {
  solid:   'bg-violet-600 text-white',
  soft:    'bg-violet-100 text-violet-700',
  outline: 'border border-violet-300 text-violet-700',
}

function BadgeRender({ node }: { node: PageNode }) {
  const s        = getStyle(node)
  const variant  = (node.props.variant as string) || 'soft'
  const varClass = BADGE_VARIANTS[variant] ?? BADGE_VARIANTS.soft
  return (
    <span
      className={buildClassName(s, `inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${varClass}`)}
      style={buildInlineStyle(s)}
    >
      {(node.props.label as string) || 'Badge'}
    </span>
  )
}

export const BadgeEditor:  React.FC<NodeComponentProps> = ({ node }) => <BadgeRender node={node} />
export const BadgePreview: React.FC<NodeComponentProps> = ({ node }) => <BadgeRender node={node} />

export const BadgePanel: React.FC<PanelProps> = ({ node, onChange }) => (
  <div className="space-y-5 p-4">
    <FieldGroup label="Content">
      <label className="block text-xs text-neutral-500 mb-1">Label</label>
      <input className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400" value={(node.props.label as string) ?? ''} onChange={e => onChange({ label: e.target.value })} />
    </FieldGroup>
    <FieldGroup label="Style">
      <SelectField label="Variant" value={(node.props.variant as string) ?? 'soft'} options={['solid','soft','outline']} onChange={v => onChange({ variant: v })} />
    </FieldGroup>
  </div>
)

// ═══════════════════════════════════════════════════════════════════════════════
// COLUMNS
// ═══════════════════════════════════════════════════════════════════════════════

export const ColumnsEditor: React.FC<NodeComponentProps> = ({ node, children }) => {
  const s = getStyle(node)
  return <div className={buildClassName(s, 'w-full flex flex-row')} style={{ ...buildInlineStyle(s), minHeight: 48 }}>{children}</div>
}

export const ColumnsPreview: React.FC<NodeComponentProps> = ({ node, children }) => {
  const s = getStyle(node)
  return <div className={buildClassName(s, 'w-full flex flex-row')} style={buildInlineStyle(s)}>{children}</div>
}

export const ColumnsPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = getStyle(node)
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Layout">
        <SpacingField label="Gap"     value={s.gap}    onChange={v => patchStyle(node, onChange, { gap: v })} />
        <SelectField  label="Align"   value={s.align ?? 'stretch'} options={['start','center','end','stretch']} onChange={v => patchStyle(node, onChange, { align: v as StyleProps['align'] })} />
        <SelectField  label="Justify" value={s.justify ?? 'between'} options={['start','center','end','between','around','evenly']} onChange={v => patchStyle(node, onChange, { justify: v as StyleProps['justify'] })} />
      </FieldGroup>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLUMN
// ═══════════════════════════════════════════════════════════════════════════════

export const ColumnEditor: React.FC<NodeComponentProps> = ({ node, children }) => {
  const s = getStyle(node)
  return <div className={buildClassName(s, 'flex-1 min-w-0 min-h-12')} style={buildInlineStyle(s)}>{children}</div>
}

export const ColumnPreview: React.FC<NodeComponentProps> = ({ node, children }) => {
  const s = getStyle(node)
  return <div className={buildClassName(s, 'flex-1 min-w-0')} style={buildInlineStyle(s)}>{children}</div>
}

export const ColumnPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = getStyle(node)
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Spacing">
        <SpacingField label="Padding X" value={s.px} onChange={v => patchStyle(node, onChange, { px: v })} />
        <SpacingField label="Padding Y" value={s.py} onChange={v => patchStyle(node, onChange, { py: v })} />
      </FieldGroup>
      <FieldGroup label="Background">
        <ColorField label="Color" value={s.bgColor} onChange={v => patchStyle(node, onChange, { bgColor: v || undefined })} />
      </FieldGroup>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT
// ═══════════════════════════════════════════════════════════════════════════════

export const TextEditor: React.FC<NodeComponentProps> = ({ node }) => {
  const s = getStyle(node)
  const { ref, isSelected, onFocus, onBlur, onKeyDown, onInput } = useInlineEdit(node, 'content')
  return (
    <p
      ref={ref as React.RefObject<HTMLParagraphElement>}
      contentEditable={isSelected}
      suppressContentEditableWarning
      onFocus={onFocus} onBlur={onBlur} onKeyDown={onKeyDown} onInput={onInput}
      className={buildClassName(s, ['outline-none', isSelected ? 'cursor-text ring-1 ring-violet-300 ring-inset rounded' : '', !node.props.content && !isSelected ? 'text-neutral-300 italic' : ''].join(' '))}
      style={buildInlineStyle(s)}
      data-placeholder="Click to edit text…"
    />
  )
}

export const TextPreview: React.FC<NodeComponentProps> = ({ node }) => {
  const s = getStyle(node)
  return <p className={buildClassName(s)} style={buildInlineStyle(s)}>{node.props.content as string}</p>
}

export const TextPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = getStyle(node)
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Content">
        <label className="block text-xs text-neutral-500 mb-1">Text</label>
        <textarea className="w-full border border-neutral-200 rounded-md text-sm p-2 resize-y min-h-20 focus:outline-none focus:ring-1 focus:ring-violet-400" value={(node.props.content as string) ?? ''} onChange={e => onChange({ content: e.target.value })} />
        <p className="text-[10px] text-neutral-400 mt-1">Tip: click text on the canvas to edit inline</p>
      </FieldGroup>
      <StylePanel style={s} onChange={partial => patchStyle(node, onChange, partial)} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEADING
// ═══════════════════════════════════════════════════════════════════════════════

type HTag = 'h1'|'h2'|'h3'|'h4'|'h5'|'h6'

export const HeadingEditor: React.FC<NodeComponentProps> = ({ node }) => {
  const s   = getStyle(node)
  const Tag = ((node.props.tag as HTag) || 'h2') as HTag
  const { ref, isSelected, onFocus, onBlur, onKeyDown, onInput } = useInlineEdit(node, 'content')
  return (
    <Tag
      ref={ref as React.RefObject<HTMLHeadingElement>}
      contentEditable={isSelected}
      suppressContentEditableWarning
      onFocus={onFocus} onBlur={onBlur} onKeyDown={onKeyDown} onInput={onInput}
      className={buildClassName(s, ['outline-none', isSelected ? 'cursor-text ring-1 ring-violet-300 ring-inset rounded' : ''].join(' '))}
      style={buildInlineStyle(s)}
    />
  )
}

export const HeadingPreview: React.FC<NodeComponentProps> = ({ node }) => {
  const s   = getStyle(node)
  const Tag = ((node.props.tag as HTag) || 'h2') as HTag
  return <Tag className={buildClassName(s)} style={buildInlineStyle(s)}>{node.props.content as string}</Tag>
}

export const HeadingPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = getStyle(node)
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Content">
        <label className="block text-xs text-neutral-500 mb-1">Text</label>
        <input className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400" value={(node.props.content as string) ?? ''} onChange={e => onChange({ content: e.target.value })} />
        <SelectField label="Tag" value={(node.props.tag as string) ?? 'h2'} options={['h1','h2','h3','h4','h5','h6']} onChange={v => onChange({ tag: v })} />
        <p className="text-[10px] text-neutral-400 mt-1">Tip: click the heading on the canvas to edit inline</p>
      </FieldGroup>
      <StylePanel style={s} onChange={partial => patchStyle(node, onChange, partial)} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE
// ═══════════════════════════════════════════════════════════════════════════════

export const ImageEditor: React.FC<NodeComponentProps> = ({ node }) => {
  const s               = getStyle(node)
  const src             = node.props.src as string
  const openMediaPicker = useBuilderStore(st => st.openMediaPicker)
  const updateProps     = useBuilderStore(st => st.updateProps)

  function handleEmptyClick(e: React.MouseEvent) {
    e.stopPropagation()
    openMediaPicker(item => {
      updateProps(node.id, { src: item.url, alt: item.alt || node.props.alt, style: { ...s, aspectRatio: s.aspectRatio ?? '4/3', objectFit: s.objectFit ?? 'cover' } })
    })
  }

  if (!src) return (
    <div onClick={handleEmptyClick} className={buildClassName(s, 'bg-neutral-100 border-2 border-dashed border-neutral-300 hover:border-violet-300 hover:bg-violet-50/40 flex flex-col items-center justify-center gap-1.5 text-neutral-400 text-sm cursor-pointer transition-colors')} style={{ ...buildInlineStyle(s), aspectRatio: s.aspectRatio && s.aspectRatio !== 'auto' ? s.aspectRatio : '16 / 9', minHeight: 128 }}>
      <span className="text-xl">🖼️</span>
      <span className="text-xs font-medium">Click to choose an image</span>
    </div>
  )

  const hasFixedWidth = typeof s.width === 'number'
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={(node.props.alt as string) || ''} className={buildClassName(s, hasFixedWidth ? 'block' : 'max-w-full block')} style={{ width: hasFixedWidth ? s.width : '100%', height: 'auto', ...buildInlineStyle(s) }} />
}

export const ImagePreview: React.FC<NodeComponentProps> = ({ node }) => {
  const s             = getStyle(node)
  const hasFixedWidth = typeof s.width === 'number'
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={node.props.src as string} alt={(node.props.alt as string) || ''} className={buildClassName(s, hasFixedWidth ? 'block' : 'max-w-full block')} style={{ width: hasFixedWidth ? s.width : '100%', height: 'auto', ...buildInlineStyle(s) }} />
}

export const ImagePanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s               = getStyle(node)
  const openMediaPicker = useBuilderStore(st => st.openMediaPicker)
  const src             = (node.props.src as string) ?? ''

  function handleBrowse() {
    openMediaPicker(item => {
      onChange({ src: item.url, alt: item.alt || node.props.alt, style: { ...s, aspectRatio: s.aspectRatio ?? '4/3', objectFit: s.objectFit ?? 'cover' } })
    })
  }

  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Source">
        <button onClick={handleBrowse} className="w-full rounded-lg border-2 border-dashed border-neutral-200 hover:border-violet-300 hover:bg-violet-50/40 transition-colors overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
          {src
            ? <img src={src} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-neutral-400"><span className="text-xl">🖼️</span><span className="text-xs font-medium">Browse media library</span></div>}
        </button>
        {src && <button onClick={handleBrowse} className="w-full mt-2 text-xs font-medium text-violet-600 hover:text-violet-700 py-1.5 rounded-md hover:bg-violet-50 transition-colors">Replace image</button>}
        <label className="block text-xs text-neutral-500 mt-3 mb-1">URL (or paste a link)</label>
        <input className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400" placeholder="https://…" value={src} onChange={e => onChange({ src: e.target.value })} />
        <label className="block text-xs text-neutral-500 mt-2 mb-1">Alt text</label>
        <input className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400" value={(node.props.alt as string) ?? ''} onChange={e => onChange({ alt: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Size">
        <SelectField label="Width mode" value={typeof s.width === 'number' ? 'fixed' : (s.width as string) || 'full'} options={[{ label:'Fill container',value:'full' },{ label:'Fixed pixels',value:'fixed' },{ label:'Half',value:'1/2' },{ label:'Third',value:'1/3' },{ label:'Two thirds',value:'2/3' },{ label:'Quarter',value:'1/4' },{ label:'Three quarters',value:'3/4' },{ label:'Auto',value:'auto' }]}
          onChange={v => { if (v === 'fixed') { patchStyle(node, onChange, { width: typeof s.width === 'number' ? s.width : 320 }) } else { patchStyle(node, onChange, { width: v as StyleProps['width'] }) } }}
        />
        {typeof s.width === 'number' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 w-20 shrink-0">Width (px)</span>
            <input type="number" min={20} max={2000} step={10} className="flex-1 border border-neutral-200 rounded text-xs p-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400" value={s.width} onChange={e => patchStyle(node, onChange, { width: +e.target.value || 0 })} />
          </div>
        )}
        <p className="text-[10px] text-neutral-400">Fixed pixels keeps this image the same size no matter what container it&apos;s placed in</p>
        <SelectField label="Aspect ratio" value={s.aspectRatio ?? '4/3'} options={[{ label:'Original',value:'auto' },{ label:'Square 1:1',value:'1/1' },{ label:'Standard 4:3',value:'4/3' },{ label:'Wide 16:9',value:'16/9' },{ label:'Classic 3:2',value:'3/2' },{ label:'Ultra 21:9',value:'21/9' }]} onChange={v => patchStyle(node, onChange, { aspectRatio: v as StyleProps['aspectRatio'] })} />
        <SelectField label="Fit" value={s.objectFit ?? 'cover'} options={[{ label:'Cover (fill & crop)',value:'cover' },{ label:'Contain (fit inside)',value:'contain' },{ label:'Fill (stretch)',value:'fill' },{ label:'None (original size)',value:'none' }]} onChange={v => patchStyle(node, onChange, { objectFit: v as StyleProps['objectFit'] })} />
        {s.objectFit !== 'fill' && <SelectField label="Focal point" value={s.objectPosition ?? 'center'} options={['center','top','bottom','left','right','top left','top right','bottom left','bottom right']} onChange={v => patchStyle(node, onChange, { objectPosition: v as StyleProps['objectPosition'] })} />}
        <SelectField label="Rounded" value={s.rounded ?? 'none'} options={['none','sm','md','lg','xl','2xl','full']} onChange={v => patchStyle(node, onChange, { rounded: v as StyleProps['rounded'] })} />
      </FieldGroup>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUTTON
// ═══════════════════════════════════════════════════════════════════════════════
// NOTE: same fix as Badge above — now honors node.props.style so the resize
// handles (and any future StylePanel usage) actually have an effect.

const VARIANTS: Record<string, string> = {
  solid:   'bg-violet-600 text-white hover:bg-violet-700',
  outline: 'border-2 border-violet-600 text-violet-600 hover:bg-violet-50',
  ghost:   'text-violet-600 hover:bg-violet-50',
}

function ButtonRender({ node }: { node: PageNode }) {
  const s        = getStyle(node)
  const variant  = (node.props.variant as string) || 'solid'
  const varClass = VARIANTS[variant] ?? VARIANTS.solid
  return (
    <button
      className={buildClassName(s, `inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-medium transition-colors text-sm ${varClass}`)}
      style={buildInlineStyle(s)}
    >
      {(node.props.label as string) || 'Button'}
    </button>
  )
}

export const ButtonEditor:  React.FC<NodeComponentProps> = ({ node }) => <ButtonRender node={node} />
export const ButtonPreview: React.FC<NodeComponentProps> = ({ node }) => <ButtonRender node={node} />

export const ButtonPanel: React.FC<PanelProps> = ({ node, onChange }) => (
  <div className="space-y-5 p-4">
    <FieldGroup label="Content">
      <label className="block text-xs text-neutral-500 mb-1">Label</label>
      <input className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400" value={(node.props.label as string) ?? ''} onChange={e => onChange({ label: e.target.value })} />
      <label className="block text-xs text-neutral-500 mt-2 mb-1">Link (href)</label>
      <input className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400" placeholder="https://…" value={(node.props.href as string) ?? ''} onChange={e => onChange({ href: e.target.value })} />
    </FieldGroup>
    <FieldGroup label="Style">
      <SelectField label="Variant" value={(node.props.variant as string) ?? 'solid'} options={['solid','outline','ghost']} onChange={v => onChange({ variant: v })} />
    </FieldGroup>
  </div>
)

// ═══════════════════════════════════════════════════════════════════════════════
// SPACER
// ═══════════════════════════════════════════════════════════════════════════════

export const SpacerEditor: React.FC<NodeComponentProps> = ({ node }) => (
  <div style={{ height: (node.props.height as number) ?? 40 }} className="w-full bg-violet-50 border border-dashed border-violet-200 flex items-center justify-center text-violet-300 text-xs select-none">
    spacer {(node.props.height as number) ?? 40}px
  </div>
)

export const SpacerPreview: React.FC<NodeComponentProps> = ({ node }) => (
  <div style={{ height: (node.props.height as number) ?? 40 }} className="w-full" />
)

export const SpacerPanel: React.FC<PanelProps> = ({ node, onChange }) => (
  <div className="space-y-4 p-4">
    <FieldGroup label="Size">
      <label className="block text-xs text-neutral-500 mb-1">Height (px)</label>
      <input type="number" min={4} max={400} step={4} className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400" value={(node.props.height as number) ?? 40} onChange={e => onChange({ height: +e.target.value })} />
      <p className="text-[10px] text-neutral-400">Tip: drag the bottom handle on the canvas to resize instead</p>
    </FieldGroup>
  </div>
)

// ═══════════════════════════════════════════════════════════════════════════════
// DIVIDER
// ═══════════════════════════════════════════════════════════════════════════════

export const DividerEditor:  React.FC<NodeComponentProps> = ({ node }) => {
  const s = getStyle(node)
  return <hr className={buildClassName(s, 'w-full border-neutral-200')} style={buildInlineStyle(s)} />
}
export const DividerPreview: React.FC<NodeComponentProps> = ({ node }) => {
  const s = getStyle(node)
  return <hr className={buildClassName(s, 'w-full')} style={buildInlineStyle(s)} />
}
export const DividerPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = getStyle(node)
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Style">
        <SelectField label="Style" value={s.borderStyle ?? 'solid'} options={['solid','dashed','dotted']} onChange={v => patchStyle(node, onChange, { borderStyle: v as StyleProps['borderStyle'] })} />
        <ColorField  label="Color" value={s.borderColor} onChange={v => patchStyle(node, onChange, { borderColor: v || undefined })} />
      </FieldGroup>
      <FieldGroup label="Spacing">
        <SpacingField label="Margin Y" value={s.my} onChange={v => patchStyle(node, onChange, { my: v })} />
      </FieldGroup>
    </div>
  )
}