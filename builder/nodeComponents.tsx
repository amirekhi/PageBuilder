'use client'

import React, { useState } from 'react'
import { NodeComponentProps, PanelProps, PageNode } from './types'
import {
  StyleProps, buildClassName, buildInlineStyle, buildOverlayStyle,
  buildSectionOuterStyle, buildSectionOuterClassName, buildSectionInnerClassName, buildSectionInnerStyle,
} from './styleMapper'
import { FieldGroup, SelectField, SpacingField, AlignField, ColorField, GradientField, BoxSpacingField, AnimationPanel } from './panelComponents'
import { useBuilderStore } from './store'
import { useNodeStyle, patchNodeStyle } from './responsive'
import { AnimationProps } from './animations'
import { EditorContent } from '@tiptap/react'
import { useRichTextEdit, buildTextExtensions, buildHeadingExtensions } from './richText'
import { RichTextToolbar } from './RichTextToolbar'

function patchStyle(node: PageNode, onChange: PanelProps['onChange'], partial: Partial<StyleProps>) {
  patchNodeStyle(node, onChange, partial)
}

// Built once and shared across every Text/Heading node — these are
// stateless extension configs (no per-instance state lives on them), so
// there's no reason to rebuild them per-render or per-node the way the
// editor instance itself (per-node, via useEditor inside useRichTextEdit)
// has to be.
let _textExtensions: ReturnType<typeof buildTextExtensions> | null = null
function getTextExtensions() {
  return _textExtensions ??= buildTextExtensions()
}

let _headingExtensions: ReturnType<typeof buildHeadingExtensions> | null = null
function getHeadingExtensions() {
  return _headingExtensions ??= buildHeadingExtensions()
}

function useRootAdjustedStyle(node: PageNode, s: StyleProps): StyleProps {
  const rootId = useBuilderStore(st => st.rootId)
  const isRoot = node.id === rootId
  if (!isRoot) return s
  return {
    ...s,
    px: undefined, py: undefined,
    pt: undefined, pb: undefined, pl: undefined, pr: undefined,
    gap: undefined,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION
// ═══════════════════════════════════════════════════════════════════════════════
//
// SectionEditor and SectionPreview must mirror EACH OTHER structurally — both
// split into an OUTER band (background/border/rounded/shadow/opacity/margin,
// full width, never a flex/grid container on its own... except that it IS one:
// see buildSectionOuterStyle in styleMapper.ts, which deliberately applies the
// SAME display/justify/align as the inner div. This is what lets Justify="end"/
// Align="end" push the ENTIRE inner content block to the bottom-right of the
// section's own box whenever minHeight gives it extra room (e.g. a hero section
// taller than its content) — while the inner div's OWN justify/align (also
// applied via buildSectionInnerStyle) independently positions that Section's
// actual CHILDREN within the content block itself. Both views must build this
// identically or Editor/Preview will visually disagree.
//
// Preview has no SelectableShell wrapper handling width (Editor does), so its
// outer band applies sizing directly (no skipSizing) while Editor's does
// (skipSizing: true) to avoid double-applying percentage widths.
//
// NOTE ON ANIMATIONS: the editor canvas deliberately never plays animations —
// EditorComponent is never passed animationRef/animationStyle. Animations only
// ever play in Preview (see Renderer.tsx).

export const SectionEditor: React.FC<NodeComponentProps> = ({ node, children }) => {
  const rawStyle       = useNodeStyle(node)
  const s              = useRootAdjustedStyle(node, rawStyle)
  const overlayStyle   = buildOverlayStyle(s.bgOverlay)
  const hasBackground  = !!(s.bgImage || s.bgGradient)

  return (
    <section
      className={buildSectionOuterClassName(s, 'w-full relative')}
      style={{
        ...buildSectionOuterStyle(s, { skipSizing: true }),
        minHeight: typeof s.minHeight === 'number' ? s.minHeight : 64,
      }}
    >
      {overlayStyle && <div style={overlayStyle} aria-hidden />}
      <div
        className={[buildSectionInnerClassName(s), hasBackground ? 'relative z-10' : ''].filter(Boolean).join(' ')}
        style={buildSectionInnerStyle(s)}
      >
        {children}
      </div>
    </section>
  )
}

export const SectionPreview: React.FC<NodeComponentProps> = ({ node, children, animationRef, animationStyle }) => {
  const rawStyle = useNodeStyle(node)
  const s        = useRootAdjustedStyle(node, rawStyle)
  const overlayStyle  = buildOverlayStyle(s.bgOverlay)
  const hasBackground = !!(s.bgImage || s.bgGradient)

  return (
    <section
      ref={animationRef}
      className={buildSectionOuterClassName(s, 'w-full relative')}
      style={{
        ...buildSectionOuterStyle(s),
        minHeight: typeof s.minHeight === 'number' ? s.minHeight : 64,
        ...animationStyle,
      }}
    >
      {overlayStyle && <div style={overlayStyle} aria-hidden />}
      <div
        className={[buildSectionInnerClassName(s), hasBackground ? 'relative z-10' : ''].filter(Boolean).join(' ')}
        style={buildSectionInnerStyle(s)}
      >
        {children}
      </div>
    </section>
  )
}

export const SectionPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = useNodeStyle(node)
  const openMediaPicker = useBuilderStore(st => st.openMediaPicker)
  const display = s.display ?? 'flex'

  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Layout">
        <SelectField label="Display"   value={display} options={['flex','block','grid']} onChange={v => patchStyle(node, onChange, { display: v as StyleProps['display'] })} />

        {display === 'grid' ? (
          <SelectField
            label="Columns"
            value={String(s.gridCols ?? 2)}
            options={['1','2','3','4','5','6']}
            onChange={v => patchStyle(node, onChange, { gridCols: (+v) as StyleProps['gridCols'] })}
          />
        ) : display === 'flex' && (
          <SelectField label="Direction" value={s.flexDir ?? 'col'}  options={['col','row','row-reverse','col-reverse']} onChange={v => patchStyle(node, onChange, { flexDir: v as StyleProps['flexDir'] })} />
        )}

        {display !== 'block' && (
          <>
            <SelectField label="Justify"        value={s.justify ?? 'start'} options={['start','center','end','between','around','evenly']} onChange={v => patchStyle(node, onChange, { justify: v as StyleProps['justify'] })} />
            <SelectField label="Align children" value={s.align ?? 'start'}  options={['start','center','end','stretch','baseline']} onChange={v => patchStyle(node, onChange, { align: v as StyleProps['align'] })} />
          </>
        )}

        <SpacingField label="Gap"      value={s.gap} onChange={v => patchStyle(node, onChange, { gap: v })} />
      </FieldGroup>

      <FieldGroup label="Padding">
        <BoxSpacingField
          label="Padding"
          values={{ top: s.pt ?? s.py, right: s.pr ?? s.px, bottom: s.pb ?? s.py, left: s.pl ?? s.px }}
          onChange={next => patchStyle(node, onChange, {
            pt: next.top as number | undefined, pr: next.right as number | undefined,
            pb: next.bottom as number | undefined, pl: next.left as number | undefined,
          })}
        />
      </FieldGroup>

      <FieldGroup label="Margin">
        <BoxSpacingField
          label="Margin"
          values={{ top: s.mt ?? s.my, right: s.mr ?? s.mx, bottom: s.mb ?? s.my, left: s.ml ?? s.mx }}
          onChange={next => patchStyle(node, onChange, {
            mt: next.top as number | 'auto' | undefined, mr: next.right as number | 'auto' | undefined,
            mb: next.bottom as number | 'auto' | undefined, ml: next.left as number | 'auto' | undefined,
          })}
        />
      </FieldGroup>

      <FieldGroup label="Width">
        <SelectField label="Max Width" value={s.maxWidth as string ?? ''} options={[{label:'—',value:''},'sm','md','lg','xl','2xl','3xl','4xl','5xl','6xl','7xl','full']} onChange={v => patchStyle(node, onChange, { maxWidth: (v || undefined) as StyleProps['maxWidth'] })} />
      </FieldGroup>

      <FieldGroup label="Position">
        <AlignField style={s} onChange={partial => patchStyle(node, onChange, partial)} />
        <p className="text-[10px] text-neutral-400 -mt-1">Where this Section's content block sits within the Section's own box if there's extra room (e.g. minHeight taller than the content)</p>
      </FieldGroup>

      <FieldGroup label="Background">
        <ColorField label="Flat color" value={s.bgColor} onChange={v => patchStyle(node, onChange, { bgColor: v || undefined })} />

        <GradientField
          value={s.bgGradient}
          onChange={v => patchStyle(node, onChange, { bgGradient: v || undefined })}
        />

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

      <AnimationPanel
        value={node.props.animation as AnimationProps}
        onChange={anim => onChange({ animation: anim })}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// AVATAR
// ═══════════════════════════════════════════════════════════════════════════════

function AvatarRender({
  node, animationRef, animationStyle,
}: {
  node: PageNode
  animationRef?: React.Ref<any>
  animationStyle?: React.CSSProperties
}) {
  const src      = node.props.src as string
  const size     = (node.props.size as number) ?? 56
  const initials = (node.props.initials as string) || ''
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={animationRef}
      src={src} alt={(node.props.alt as string) || ''}
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size, ...animationStyle }}
    />
  ) : (
    <div
      ref={animationRef}
      className="rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-semibold shrink-0 select-none"
      style={{ width: size, height: size, fontSize: size * 0.36, ...animationStyle }}
    >
      {initials || '?'}
    </div>
  )
}

export const AvatarEditor:  React.FC<NodeComponentProps> = ({ node }) => <AvatarRender node={node} />
export const AvatarPreview: React.FC<NodeComponentProps> = ({ node, animationRef, animationStyle }) =>
  <AvatarRender node={node} animationRef={animationRef} animationStyle={animationStyle} />

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
      <AnimationPanel
        value={node.props.animation as AnimationProps}
        onChange={anim => onChange({ animation: anim })}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUOTE
// ═══════════════════════════════════════════════════════════════════════════════

function QuoteRender({
  node, skipSizing, animationRef, animationStyle,
}: {
  node: PageNode; skipSizing: boolean
  animationRef?: React.Ref<any>
  animationStyle?: React.CSSProperties
}) {
  const s         = useNodeStyle(node)
  const avatarSrc = node.props.avatarSrc as string
  const initials  = (node.props.initials as string) || (node.props.name as string)?.[0] || '?'
  return (
    <div
      ref={animationRef}
      className={buildClassName(s, 'flex flex-col gap-4')}
      style={{ ...buildInlineStyle(s, { skipSizing }), ...animationStyle }}
    >
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

export const QuoteEditor:  React.FC<NodeComponentProps> = ({ node }) => <QuoteRender node={node} skipSizing={true} />
export const QuotePreview: React.FC<NodeComponentProps> = ({ node, animationRef, animationStyle }) =>
  <QuoteRender node={node} skipSizing={false} animationRef={animationRef} animationStyle={animationStyle} />

// NOTE: also used to embed <StylePanel/> — removed, same reason as TextPanel.
export const QuotePanel: React.FC<PanelProps> = ({ node, onChange }) => {
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
      <AnimationPanel
        value={node.props.animation as AnimationProps}
        onChange={anim => onChange({ animation: anim })}
      />
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

function VideoRender({
  node, skipSizing, animationRef, animationStyle,
}: {
  node: PageNode; skipSizing: boolean
  animationRef?: React.Ref<any>
  animationStyle?: React.CSSProperties
}) {
  const s     = useNodeStyle(node)
  const raw   = (node.props.url as string) || ''
  const embed = toEmbedUrl(raw)
  const ratio = (s.aspectRatio && s.aspectRatio !== 'auto') ? s.aspectRatio : '16/9'
  if (!embed) return (
    <div
      ref={animationRef}
      className={buildClassName(s, 'bg-neutral-100 border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center gap-1.5 text-neutral-400 text-sm')}
      style={{ ...buildInlineStyle(s, { skipSizing }), aspectRatio: ratio, minHeight: 160, ...animationStyle }}
    >
      <span className="text-xl">▶</span>
      <span className="text-xs font-medium">Paste a YouTube or Vimeo link</span>
    </div>
  )
  return (
    <div
      ref={animationRef}
      className={buildClassName(s, 'overflow-hidden')}
      style={{ ...buildInlineStyle(s, { skipSizing }), aspectRatio: ratio, ...animationStyle }}
    >
      <iframe src={embed} className="w-full h-full" style={{ border: 0 }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
    </div>
  )
}

export const VideoEditor:  React.FC<NodeComponentProps> = ({ node }) => <VideoRender node={node} skipSizing={true} />
export const VideoPreview: React.FC<NodeComponentProps> = ({ node, animationRef, animationStyle }) =>
  <VideoRender node={node} skipSizing={false} animationRef={animationRef} animationStyle={animationStyle} />

export const VideoPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = useNodeStyle(node)
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
      <FieldGroup label="Position">
        <AlignField style={s} onChange={partial => patchStyle(node, onChange, partial)} />
        <p className="text-[10px] text-neutral-400 -mt-1">Only visible once this block's width/height is smaller than its container</p>
      </FieldGroup>
      <AnimationPanel
        value={node.props.animation as AnimationProps}
        onChange={anim => onChange({ animation: anim })}
      />
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

function AccordionRender({
  node, skipSizing, animationRef, animationStyle,
}: {
  node: PageNode; skipSizing: boolean
  animationRef?: React.Ref<any>
  animationStyle?: React.CSSProperties
}) {
  const s     = useNodeStyle(node)
  const items = accordionItems(node)
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  return (
    <div
      ref={animationRef}
      className={buildClassName(s, 'w-full divide-y divide-neutral-200 border-t border-b border-neutral-200')}
      style={{ ...buildInlineStyle(s, { skipSizing }), ...animationStyle }}
    >
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

export const AccordionEditor:  React.FC<NodeComponentProps> = ({ node }) => <AccordionRender node={node} skipSizing={true} />
export const AccordionPreview: React.FC<NodeComponentProps> = ({ node, animationRef, animationStyle }) =>
  <AccordionRender node={node} skipSizing={false} animationRef={animationRef} animationStyle={animationStyle} />

// NOTE: also used to embed <StylePanel/> — removed, same reason as TextPanel.
export const AccordionPanel: React.FC<PanelProps> = ({ node, onChange }) => {
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
      <AnimationPanel
        value={node.props.animation as AnimationProps}
        onChange={anim => onChange({ animation: anim })}
      />
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

function ListRender({
  node, skipSizing, animationRef, animationStyle,
}: {
  node: PageNode; skipSizing: boolean
  animationRef?: React.Ref<any>
  animationStyle?: React.CSSProperties
}) {
  const s          = useNodeStyle(node)
  const items      = listItems(node)
  const markerType = (node.props.markerType as string) || 'bullet'
  return (
    <ul
      ref={animationRef}
      className={buildClassName(s, 'space-y-2 list-none')}
      style={{ ...buildInlineStyle(s, { skipSizing }), ...animationStyle }}
    >
      {items.map((text, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="shrink-0 text-violet-600 font-medium leading-6">{markerType === 'number' ? `${i + 1}.` : LIST_MARKERS[markerType] ?? '•'}</span>
          <span className="leading-6">{text}</span>
        </li>
      ))}
    </ul>
  )
}

export const ListEditor:  React.FC<NodeComponentProps> = ({ node }) => <ListRender node={node} skipSizing={true} />
export const ListPreview: React.FC<NodeComponentProps> = ({ node, animationRef, animationStyle }) =>
  <ListRender node={node} skipSizing={false} animationRef={animationRef} animationStyle={animationStyle} />

// NOTE: also used to embed <StylePanel/> — removed, same reason as TextPanel.
export const ListPanel: React.FC<PanelProps> = ({ node, onChange }) => {
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
      <AnimationPanel
        value={node.props.animation as AnimationProps}
        onChange={anim => onChange({ animation: anim })}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// BADGE
// ═══════════════════════════════════════════════════════════════════════════════

const BADGE_VARIANTS: Record<string, string> = {
  solid:   'bg-violet-600 text-white',
  soft:    'bg-violet-100 text-violet-700',
  outline: 'border border-violet-300 text-violet-700',
}

function BadgeRender({
  node, skipSizing, animationRef, animationStyle,
}: {
  node: PageNode; skipSizing: boolean
  animationRef?: React.Ref<any>
  animationStyle?: React.CSSProperties
}) {
  const s        = useNodeStyle(node)
  const variant  = (node.props.variant as string) || 'soft'
  const varClass = BADGE_VARIANTS[variant] ?? BADGE_VARIANTS.soft
  return (
    <span
      ref={animationRef}
      className={buildClassName(s, `inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${varClass}`)}
      style={{ ...buildInlineStyle(s, { skipSizing }), ...animationStyle }}
    >
      {(node.props.label as string) || 'Badge'}
    </span>
  )
}

export const BadgeEditor:  React.FC<NodeComponentProps> = ({ node }) => <BadgeRender node={node} skipSizing={true} />
export const BadgePreview: React.FC<NodeComponentProps> = ({ node, animationRef, animationStyle }) =>
  <BadgeRender node={node} skipSizing={false} animationRef={animationRef} animationStyle={animationStyle} />

export const BadgePanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = useNodeStyle(node)
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Content">
        <label className="block text-xs text-neutral-500 mb-1">Label</label>
        <input className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400" value={(node.props.label as string) ?? ''} onChange={e => onChange({ label: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Style">
        <SelectField label="Variant" value={(node.props.variant as string) ?? 'soft'} options={['solid','soft','outline']} onChange={v => onChange({ variant: v })} />
      </FieldGroup>
      <FieldGroup label="Position">
        <AlignField style={s} onChange={partial => patchStyle(node, onChange, partial)} />
      </FieldGroup>
      <AnimationPanel
        value={node.props.animation as AnimationProps}
        onChange={anim => onChange({ animation: anim })}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLUMNS
// ═══════════════════════════════════════════════════════════════════════════════

export const ColumnsEditor: React.FC<NodeComponentProps> = ({ node, children }) => {
  const s = useNodeStyle(node)
  return <div className={buildClassName(s, 'w-full flex flex-row')} style={{ ...buildInlineStyle(s, { skipSizing: true }), minHeight: 48 }}>{children}</div>
}

export const ColumnsPreview: React.FC<NodeComponentProps> = ({ node, children, animationRef, animationStyle }) => {
  const s = useNodeStyle(node)
  return (
    <div
      ref={animationRef}
      className={buildClassName(s, 'w-full flex flex-row')}
      style={{ ...buildInlineStyle(s), ...animationStyle }}
    >
      {children}
    </div>
  )
}

export const ColumnsPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = useNodeStyle(node)
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Layout">
        <SpacingField label="Gap"          value={s.gap}    onChange={v => patchStyle(node, onChange, { gap: v })} />
        <SelectField  label="Align items"  value={s.align ?? 'stretch'} options={['start','center','end','stretch','baseline']} onChange={v => patchStyle(node, onChange, { align: v as StyleProps['align'] })} />
        <SelectField  label="Justify"      value={s.justify ?? 'between'} options={['start','center','end','between','around','evenly']} onChange={v => patchStyle(node, onChange, { justify: v as StyleProps['justify'] })} />
        <p className="text-[10px] text-neutral-400 -mt-1">Justify only has room to act once at least one Column below is set to something other than its default "Fill evenly" width — otherwise every Column grows to fill the row and there's no leftover space to distribute.</p>
      </FieldGroup>
      <AnimationPanel
        value={node.props.animation as AnimationProps}
        onChange={anim => onChange({ animation: anim })}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLUMN
// ═══════════════════════════════════════════════════════════════════════════════

export const ColumnEditor: React.FC<NodeComponentProps> = ({ node, children }) => {
  const s = useNodeStyle(node)
  return <div className={buildClassName(s, 'flex-1 min-w-0 min-h-12')} style={buildInlineStyle(s, { skipSizing: true })}>{children}</div>
}

export const ColumnPreview: React.FC<NodeComponentProps> = ({ node, children, animationRef, animationStyle }) => {
  const s = useNodeStyle(node)
  return (
    <div
      ref={animationRef}
      className={buildClassName(s, 'flex-1 min-w-0')}
      style={{ ...buildInlineStyle(s), ...animationStyle }}
    >
      {children}
    </div>
  )
}

export const ColumnPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = useNodeStyle(node)

  // "Fill evenly" (no explicit width) is the default and is what makes every
  // un-sized Column share the row equally via the hardcoded flex-1 on
  // ColumnEditor/ColumnPreview (see defaultFlexFill in registry.ts). Picking
  // any other mode here sets an explicit style.width, which opts this Column
  // out of that fill behavior — buildBoxSizingStyle/buildInlineStyle then
  // pin flexGrow/flexShrink to 0 and flexBasis to 'auto' so the explicit
  // width actually sticks instead of being overridden by the flex-1 class.
  const widthMode = typeof s.width === 'number' ? 'fixed' : (s.width as string) || 'fill'

  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Width">
        <SelectField
          label="Mode"
          value={widthMode}
          options={[
            { label: 'Fill evenly (default)', value: 'fill' },
            { label: 'Fixed pixels',          value: 'fixed' },
            { label: 'Half',                  value: '1/2' },
            { label: 'Third',                 value: '1/3' },
            { label: 'Two thirds',            value: '2/3' },
            { label: 'Quarter',               value: '1/4' },
            { label: 'Three quarters',        value: '3/4' },
          ]}
          onChange={v => {
            if (v === 'fill') {
              patchStyle(node, onChange, { width: undefined, widthUnit: undefined })
            } else if (v === 'fixed') {
              patchStyle(node, onChange, { width: typeof s.width === 'number' ? s.width : 240, widthUnit: 'px' })
            } else {
              patchStyle(node, onChange, { width: v as StyleProps['width'], widthUnit: undefined })
            }
          }}
        />
        {widthMode === 'fixed' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 w-20 shrink-0">Width (px)</span>
            <input
              type="number" min={40} max={1000} step={10}
              className="flex-1 border border-neutral-200 rounded text-xs p-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
              value={s.width as number} onChange={e => patchStyle(node, onChange, { width: +e.target.value || 0, widthUnit: 'px' })}
            />
          </div>
        )}
        <p className="text-[10px] text-neutral-400">
          "Fill evenly" makes every un-sized Column in this row share the space equally. Set a Column to anything else here to give the Columns block's own Justify option (in its own panel) room to actually distribute leftover space.
        </p>
      </FieldGroup>

      <FieldGroup label="Padding">
        <BoxSpacingField
          label="Padding"
          values={{ top: s.pt ?? s.py, right: s.pr ?? s.px, bottom: s.pb ?? s.py, left: s.pl ?? s.px }}
          onChange={next => patchStyle(node, onChange, {
            pt: next.top as number | undefined, pr: next.right as number | undefined,
            pb: next.bottom as number | undefined, pl: next.left as number | undefined,
          })}
        />
      </FieldGroup>
      <FieldGroup label="Margin">
        <BoxSpacingField
          label="Margin"
          values={{ top: s.mt ?? s.my, right: s.mr ?? s.mx, bottom: s.mb ?? s.my, left: s.ml ?? s.mx }}
          onChange={next => patchStyle(node, onChange, {
            mt: next.top as number | 'auto' | undefined, mr: next.right as number | 'auto' | undefined,
            mb: next.bottom as number | 'auto' | undefined, ml: next.left as number | 'auto' | undefined,
          })}
        />
      </FieldGroup>
      <FieldGroup label="Background">
        <ColorField label="Color" value={s.bgColor} onChange={v => patchStyle(node, onChange, { bgColor: v || undefined })} />
      </FieldGroup>
      <AnimationPanel
        value={node.props.animation as AnimationProps}
        onChange={anim => onChange({ animation: anim })}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT
// ═══════════════════════════════════════════════════════════════════════════════
// EDITING MODEL: single click selects (outline, drag handle, toolbar) like
// any other block — it does NOT enter text editing. DOUBLE click calls
// startEditing(), which swaps the static <p> out for a live Tiptap
// <EditorContent>. Finishing happens on blur OR on selecting a different
// block (see useRichTextEdit in richText.ts) — either way it commits
// sanitized HTML back into node.props.content and swaps back to static.
//
// content is now an HTML STRING (e.g. "<p>Hello <strong>world</strong></p>"),
// not plain text — TextPreview/the static branch of TextEditor both render
// it via dangerouslySetInnerHTML rather than as a text node. Old
// plain-string content still works fine here: Tiptap parses a plain string
// as a single unformatted paragraph, so nothing needs migrating.

export const TextEditor: React.FC<NodeComponentProps> = ({ node }) => {
  const s = useNodeStyle(node)
  const selectedId = useBuilderStore(st => st.selectedId)
  const isSelected = selectedId === node.id
  const { isRichEditing, startEditing, editor, handleBlur } = useRichTextEdit(node, 'content', getTextExtensions())

if (isRichEditing) {
    return (
      <div className="relative" style={buildInlineStyle(s, { skipSizing: true })} onBlur={handleBlur}>
        <RichTextToolbar editor={editor} allowBlocks />
        <EditorContent
          editor={editor}
          className={buildClassName(s, 'outline-none ring-1 ring-violet-300 ring-inset rounded cursor-text [&_.ProseMirror]:outline-none')}
        />
      </div>
    )
  }

  const hasContent = !!(node.props.content as string)
  return (
    <p
      onDoubleClick={e => { e.stopPropagation(); startEditing() }}
      className={buildClassName(s, ['outline-none', isSelected ? 'cursor-text' : '', !hasContent ? 'text-neutral-300 italic' : ''].join(' '))}
      style={buildInlineStyle(s, { skipSizing: true })}
      dangerouslySetInnerHTML={{ __html: hasContent ? (node.props.content as string) : 'Double-click to edit text…' }}
    />
  )
}

export const TextPreview: React.FC<NodeComponentProps> = ({ node, animationRef, animationStyle }) => {
  const s = useNodeStyle(node)
  return (
    <p
      ref={animationRef}
      className={buildClassName(s)}
      style={{ ...buildInlineStyle(s), ...animationStyle }}
      dangerouslySetInnerHTML={{ __html: (node.props.content as string) ?? '' }}
    />
  )
}

// NOTE: this panel used to also embed a <StylePanel/> call — removed
// because ControlPanel's separate "Style" tab already renders the exact
// same component for whatever's selected, so having it here too meant
// Content and Style tabs showed 100% identical fields. This panel now only
// holds what's actually unique to Text (its content) plus Animation.
//
// The textarea below still works as a plain-text fallback editor for
// people who'd rather type than double-click the canvas — it reads/writes
// the same node.props.content HTML string, just without any formatting
// controls of its own. Typing here bypasses Tiptap entirely, so anything
// typed is treated as plain text (no HTML parsing) — fine for quick edits,
// just not where you'd add bold/links/etc.
export const TextPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Content">
        <label className="block text-xs text-neutral-500 mb-1">Text</label>
        <textarea className="w-full border border-neutral-200 rounded-md text-sm p-2 resize-y min-h-20 focus:outline-none focus:ring-1 focus:ring-violet-400" value={(node.props.content as string) ?? ''} onChange={e => onChange({ content: e.target.value })} />
        <p className="text-[10px] text-neutral-400 mt-1">Tip: double-click the text on the canvas for the full formatting toolbar (bold, links, lists, alignment…)</p>
      </FieldGroup>
      <AnimationPanel
        value={node.props.animation as AnimationProps}
        onChange={anim => onChange({ animation: anim })}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEADING
// ═══════════════════════════════════════════════════════════════════════════════
// Same double-click-to-edit model as Text above, but with a narrower
// extension set (see buildHeadingExtensions in richText.ts — no lists/
// blockquote, since a Heading is one line by design) and Enter commits
// instead of inserting a line break (handled inside useRichTextEdit's
// editorProps.handleKeyDown, checking node.type === 'heading').

type HTag = 'h1'|'h2'|'h3'|'h4'|'h5'|'h6'

export const HeadingEditor: React.FC<NodeComponentProps> = ({ node }) => {
  const s   = useNodeStyle(node)
  const Tag = ((node.props.tag as HTag) || 'h2') as HTag
  const selectedId = useBuilderStore(st => st.selectedId)
  const isSelected = selectedId === node.id
  const { isRichEditing, startEditing, editor, handleBlur } = useRichTextEdit(node, 'content', getHeadingExtensions())

if (isRichEditing) {
    return (
      <div className="relative" style={buildInlineStyle(s, { skipSizing: true })} onBlur={handleBlur}>
        <RichTextToolbar editor={editor} allowBlocks={false} />
        <EditorContent
          editor={editor}
          className={buildClassName(s, 'outline-none ring-1 ring-violet-300 ring-inset rounded cursor-text [&_.ProseMirror]:outline-none')}
        />
      </div>
    )
  }

  const hasContent = !!(node.props.content as string)
  return (
    <Tag
      onDoubleClick={(e: React.MouseEvent) => { e.stopPropagation(); startEditing() }}
      className={buildClassName(s, ['outline-none', isSelected ? 'cursor-text' : '', !hasContent ? 'text-neutral-300 italic' : ''].join(' '))}
      style={buildInlineStyle(s, { skipSizing: true })}
      dangerouslySetInnerHTML={{ __html: hasContent ? (node.props.content as string) : 'Double-click to edit heading…' }}
    />
  )
}

export const HeadingPreview: React.FC<NodeComponentProps> = ({ node, animationRef, animationStyle }) => {
  const s   = useNodeStyle(node)
  const Tag = ((node.props.tag as HTag) || 'h2') as HTag
  return (
    <Tag
      ref={animationRef}
      className={buildClassName(s)}
      style={{ ...buildInlineStyle(s), ...animationStyle }}
      dangerouslySetInnerHTML={{ __html: (node.props.content as string) ?? '' }}
    />
  )
}

// NOTE: also used to embed <StylePanel/> — removed, same reason as TextPanel.
// The text input below is a plain-text fallback (same caveat as TextPanel's
// textarea: bypasses Tiptap, no formatting applied to whatever's typed here).
export const HeadingPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Content">
        <label className="block text-xs text-neutral-500 mb-1">Text</label>
        <input className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400" value={(node.props.content as string) ?? ''} onChange={e => onChange({ content: e.target.value })} />
        <SelectField label="Tag" value={(node.props.tag as string) ?? 'h2'} options={['h1','h2','h3','h4','h5','h6']} onChange={v => onChange({ tag: v })} />
        <p className="text-[10px] text-neutral-400 mt-1">Tip: double-click the heading on the canvas for the full formatting toolbar</p>
      </FieldGroup>
      <AnimationPanel
        value={node.props.animation as AnimationProps}
        onChange={anim => onChange({ animation: anim })}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE
// ═══════════════════════════════════════════════════════════════════════════════

export const ImageEditor: React.FC<NodeComponentProps> = ({ node }) => {
  const s               = useNodeStyle(node)
  const src             = node.props.src as string
  const openMediaPicker = useBuilderStore(st => st.openMediaPicker)
  const updateProps     = useBuilderStore(st => st.updateProps)

  function handleEmptyClick(e: React.MouseEvent) {
    e.stopPropagation()
    openMediaPicker(item => {
      updateProps(node.id, { src: item.url, alt: item.alt || node.props.alt, style: { ...(node.props.style as StyleProps ?? {}), aspectRatio: s.aspectRatio ?? '4/3', objectFit: s.objectFit ?? 'cover' } })
    })
  }

  if (!src) return (
    <div onClick={handleEmptyClick} className={buildClassName(s, 'bg-neutral-100 border-2 border-dashed border-neutral-300 hover:border-violet-300 hover:bg-violet-50/40 flex flex-col items-center justify-center gap-1.5 text-neutral-400 text-sm cursor-pointer transition-colors')} style={{ ...buildInlineStyle(s, { skipSizing: true }), aspectRatio: s.aspectRatio && s.aspectRatio !== 'auto' ? s.aspectRatio : '16 / 9', minHeight: 128 }}>
      <span className="text-xl">🖼️</span>
      <span className="text-xs font-medium">Click to choose an image</span>
    </div>
  )

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={(node.props.alt as string) || ''} className={buildClassName(s, 'block w-full')} style={{ height: 'auto', ...buildInlineStyle(s, { skipSizing: true }) }} />
}

export const ImagePreview: React.FC<NodeComponentProps> = ({ node, animationRef, animationStyle }) => {
  const s             = useNodeStyle(node)
  const hasFixedWidth = typeof s.width === 'number'
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      ref={animationRef}
      src={node.props.src as string}
      alt={(node.props.alt as string) || ''}
      className={buildClassName(s, hasFixedWidth ? 'block' : 'max-w-full block')}
      style={{ width: hasFixedWidth ? s.width : '100%', height: 'auto', ...buildInlineStyle(s), ...animationStyle }}
    />
  )
}

export const ImagePanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s               = useNodeStyle(node)
  const openMediaPicker = useBuilderStore(st => st.openMediaPicker)
  const src             = (node.props.src as string) ?? ''

  function handleBrowse() {
    openMediaPicker(item => {
      onChange({ src: item.url, alt: item.alt || node.props.alt, style: { ...(node.props.style as StyleProps ?? {}), aspectRatio: s.aspectRatio ?? '4/3', objectFit: s.objectFit ?? 'cover' } })
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
          onChange={v => { if (v === 'fixed') { patchStyle(node, onChange, { width: typeof s.width === 'number' ? s.width : 320, widthUnit: 'px' }) } else { patchStyle(node, onChange, { width: v as StyleProps['width'], widthUnit: undefined }) } }}
        />
        {typeof s.width === 'number' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 w-20 shrink-0">Width (px)</span>
            <input type="number" min={20} max={2000} step={10} className="flex-1 border border-neutral-200 rounded text-xs p-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400" value={s.width} onChange={e => patchStyle(node, onChange, { width: +e.target.value || 0, widthUnit: 'px' })} />
          </div>
        )}
        <p className="text-[10px] text-neutral-400">Fixed pixels keeps this image the same size no matter what container it&apos;s placed in — combine with Position below to place it left/center/right in a wider container</p>
        <SelectField label="Aspect ratio" value={s.aspectRatio ?? '4/3'} options={[{ label:'Original',value:'auto' },{ label:'Square 1:1',value:'1/1' },{ label:'Standard 4:3',value:'4/3' },{ label:'Wide 16:9',value:'16/9' },{ label:'Classic 3:2',value:'3/2' },{ label:'Ultra 21:9',value:'21/9' }]} onChange={v => patchStyle(node, onChange, { aspectRatio: v as StyleProps['aspectRatio'] })} />
        <SelectField label="Fit" value={s.objectFit ?? 'cover'} options={[{ label:'Cover (fill & crop)',value:'cover' },{ label:'Contain (fit inside)',value:'contain' },{ label:'Fill (stretch)',value:'fill' },{ label:'None (original size)',value:'none' }]} onChange={v => patchStyle(node, onChange, { objectFit: v as StyleProps['objectFit'] })} />
        {s.objectFit !== 'fill' && <SelectField label="Focal point" value={s.objectPosition ?? 'center'} options={['center','top','bottom','left','right','top left','top right','bottom left','bottom right']} onChange={v => patchStyle(node, onChange, { objectPosition: v as StyleProps['objectPosition'] })} />}
        <SelectField label="Rounded" value={s.rounded ?? 'none'} options={['none','sm','md','lg','xl','2xl','full']} onChange={v => patchStyle(node, onChange, { rounded: v as StyleProps['rounded'] })} />
      </FieldGroup>
      <FieldGroup label="Position">
        <AlignField style={s} onChange={partial => patchStyle(node, onChange, partial)} />
      </FieldGroup>
      <AnimationPanel
        value={node.props.animation as AnimationProps}
        onChange={anim => onChange({ animation: anim })}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

const VARIANTS: Record<string, string> = {
  solid:   'bg-violet-600 text-white hover:bg-violet-700',
  outline: 'border-2 border-violet-600 text-violet-600 hover:bg-violet-50',
  ghost:   'text-violet-600 hover:bg-violet-50',
}

function ButtonRender({
  node, skipSizing, animationRef, animationStyle,
}: {
  node: PageNode; skipSizing: boolean
  animationRef?: React.Ref<any>
  animationStyle?: React.CSSProperties
}) {
  const s        = useNodeStyle(node)
  const variant  = (node.props.variant as string) || 'solid'
  const varClass = VARIANTS[variant] ?? VARIANTS.solid
  return (
    <button
      ref={animationRef}
      className={buildClassName(s, `inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-medium transition-colors text-sm ${varClass}`)}
      style={{ ...buildInlineStyle(s, { skipSizing }), ...animationStyle }}
    >
      {(node.props.label as string) || 'Button'}
    </button>
  )
}

export const ButtonEditor:  React.FC<NodeComponentProps> = ({ node }) => <ButtonRender node={node} skipSizing={true} />
export const ButtonPreview: React.FC<NodeComponentProps> = ({ node, animationRef, animationStyle }) =>
  <ButtonRender node={node} skipSizing={false} animationRef={animationRef} animationStyle={animationStyle} />

export const ButtonPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = useNodeStyle(node)
  return (
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
      <FieldGroup label="Position">
        <AlignField style={s} onChange={partial => patchStyle(node, onChange, partial)} />
        <p className="text-[10px] text-neutral-400 -mt-1">Only visible once this block's container is wider/taller than the button itself</p>
      </FieldGroup>
      <AnimationPanel
        value={node.props.animation as AnimationProps}
        onChange={anim => onChange({ animation: anim })}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPACER
// ═══════════════════════════════════════════════════════════════════════════════

export const SpacerEditor: React.FC<NodeComponentProps> = ({ node }) => (
  <div style={{ height: (node.props.height as number) ?? 40 }} className="w-full bg-violet-50 border border-dashed border-violet-200 flex items-center justify-center text-violet-300 text-xs select-none">
    spacer {(node.props.height as number) ?? 40}px
  </div>
)

export const SpacerPreview: React.FC<NodeComponentProps> = ({ node, animationRef, animationStyle }) => (
  <div
    ref={animationRef}
    style={{ height: (node.props.height as number) ?? 40, ...animationStyle }}
    className="w-full"
  />
)

export const SpacerPanel: React.FC<PanelProps> = ({ node, onChange }) => (
  <div className="space-y-4 p-4">
    <FieldGroup label="Size">
      <label className="block text-xs text-neutral-500 mb-1">Height (px)</label>
      <input type="number" min={4} max={400} step={4} className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400" value={(node.props.height as number) ?? 40} onChange={e => onChange({ height: +e.target.value })} />
      <p className="text-[10px] text-neutral-400">Tip: drag the bottom handle on the canvas to resize instead</p>
    </FieldGroup>
    <AnimationPanel
      value={node.props.animation as AnimationProps}
      onChange={anim => onChange({ animation: anim })}
    />
  </div>
)

// ═══════════════════════════════════════════════════════════════════════════════
// DIVIDER
// ═══════════════════════════════════════════════════════════════════════════════

export const DividerEditor:  React.FC<NodeComponentProps> = ({ node }) => {
  const s = useNodeStyle(node)
  return <hr className={buildClassName(s, 'w-full border-neutral-200')} style={buildInlineStyle(s, { skipSizing: true })} />
}
export const DividerPreview: React.FC<NodeComponentProps> = ({ node, animationRef, animationStyle }) => {
  const s = useNodeStyle(node)
  return (
    <hr
      ref={animationRef}
      className={buildClassName(s, 'w-full')}
      style={{ ...buildInlineStyle(s), ...animationStyle }}
    />
  )
}
export const DividerPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = useNodeStyle(node)
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Style">
        <SelectField label="Style" value={s.borderStyle ?? 'solid'} options={['solid','dashed','dotted']} onChange={v => patchStyle(node, onChange, { borderStyle: v as StyleProps['borderStyle'] })} />
        <ColorField  label="Color" value={s.borderColor} onChange={v => patchStyle(node, onChange, { borderColor: v || undefined })} />
      </FieldGroup>
      <FieldGroup label="Margin">
        <BoxSpacingField
          label="Margin"
          values={{ top: s.mt ?? s.my, right: s.mr ?? s.mx, bottom: s.mb ?? s.my, left: s.ml ?? s.mx }}
          onChange={next => patchStyle(node, onChange, {
            mt: next.top as number | 'auto' | undefined, mr: next.right as number | 'auto' | undefined,
            mb: next.bottom as number | 'auto' | undefined, ml: next.left as number | 'auto' | undefined,
          })}
        />
      </FieldGroup>
      <FieldGroup label="Position">
        <AlignField style={s} onChange={partial => patchStyle(node, onChange, partial)} />
        <p className="text-[10px] text-neutral-400 -mt-1">Only has a visible effect if this Divider's width/height has been resized smaller than its container</p>
      </FieldGroup>
      <AnimationPanel
        value={node.props.animation as AnimationProps}
        onChange={anim => onChange({ animation: anim })}
      />
    </div>
  )
}