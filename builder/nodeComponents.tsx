'use client'

import React, { useState, useEffect } from 'react'
import { NodeComponentProps, PanelProps, PageNode } from './types'
import {
  StyleProps, buildClassName, buildInlineStyle, buildOverlayStyle,
  buildSectionOuterStyle, buildSectionOuterClassName, buildSectionInnerClassName, buildSectionInnerStyle,
} from './styleMapper'
import { FieldGroup, SelectField, SpacingField, AlignField, ColorField, GradientField, BoxSpacingField, AnimationPanel, HoverToggle, CheckField } from './panelComponents'
import { useBuilderStore } from './store'
import { useNodeStyle, patchNodeStyle } from './responsive'
import { AnimationProps } from './animations'
import { EditorContent } from '@tiptap/react'
import { useRichTextEdit, buildTextExtensions, buildHeadingExtensions } from './richText'
import { RichTextToolbar } from './RichTextToolbar'
import { customCssClass, buildHoverTransitionStyle } from './customCss'
import type { HoverStyleProps } from './customCss'
import { elementId } from './elementId'
import { resolveHref, type LinkType } from './links'



function patchStyle(node: PageNode, onChange: PanelProps['onChange'], partial: Partial<StyleProps>) {
  patchNodeStyle(node, onChange, partial)
}

// Lazy, memoized singletons — NOT built eagerly at module-load time. See
// the comment block below for why.
let _textExtensions: ReturnType<typeof buildTextExtensions> | null = null
function getTextExtensions() {
  return _textExtensions ??= buildTextExtensions()
}

let _headingExtensions: ReturnType<typeof buildHeadingExtensions> | null = null
function getHeadingExtensions() {
  return _headingExtensions ??= buildHeadingExtensions()
}
// Calling buildTextExtensions()/buildHeadingExtensions() at module
// EVALUATION time used to put that call in the middle of a real import
// cycle: richText.ts → store.ts → registry.tsx → nodeComponents.tsx →
// richText.ts. If something enters that cycle via richText.ts first (e.g.
// a test importing it directly), richText.ts's own top-level execution
// pauses mid-file to resolve store.ts → registry.tsx → nodeComponents.tsx —
// and this file used to immediately call buildTextExtensions() right then,
// before richText.ts had reached its own later const declarations (like
// FontWeight) further down. Building lazily on first actual RENDER instead
// means the whole module graph has already finished loading by the time
// this ever runs, so the cycle can never be caught mid-evaluation again.

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

// Small helper used throughout this file: merges the node's Custom CSS
// wrapper class (see customCss.ts) into whatever literal `extra` classes a
// component already passes to buildClassName — filters out empties so
// nodes with no customCss set (the vast majority) pay zero cost.
function withCustomCss(node: PageNode, extra: string): string {
  return [extra, customCssClass(node)].filter(Boolean).join(' ')
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION
// ═══════════════════════════════════════════════════════════════════════════════

export const SectionEditor: React.FC<NodeComponentProps> = ({ node, children }) => {
  const rawStyle       = useNodeStyle(node)
  const s              = useRootAdjustedStyle(node, rawStyle)
  const overlayStyle   = buildOverlayStyle(s.bgOverlay)
  const hasBackground  = !!(s.bgImage || s.bgGradient)

  return (
    <section
      id={elementId(node)}
      className={buildSectionOuterClassName(s, withCustomCss(node, 'w-full relative'))}
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
      id={elementId(node)}
      className={buildSectionOuterClassName(s, withCustomCss(node, 'w-full relative'))}
      style={{
        ...buildSectionOuterStyle(s),
        minHeight: typeof s.minHeight === 'number' ? s.minHeight : 64,
        ...buildHoverTransitionStyle(node),
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

  // Section's flat background color AND gradient each get their own
  // hover toggle here (image backgrounds are left Custom-CSS-only for
  // hover). Tracked as two separate booleans rather than the multi-field
  // object StylePanel uses, since this panel only ever has these two
  // hover-capable fields.
  const [bgHover, setBgHover] = useState(false)
  const [gradientHover, setGradientHover] = useState(false)
  const hover = (node.props.styleHover as HoverStyleProps) ?? {}
  const bgColorValue = bgHover ? hover.bgColor : s.bgColor
  const setBgColor = (v: string) =>
    bgHover
      ? onChange({ styleHover: { ...hover, bgColor: v || undefined } })
      : patchStyle(node, onChange, { bgColor: v || undefined })
  const gradientValue = gradientHover ? hover.bgGradient : s.bgGradient
  const setGradient = (v: string) =>
    gradientHover
      ? onChange({ styleHover: { ...hover, bgGradient: v || undefined } })
      : patchStyle(node, onChange, { bgGradient: v || undefined })

  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Layout">
        <SelectField label="Display"   value={display} options={['flex','block','grid']} onChange={v => patchStyle(node, onChange, { display: v as StyleProps['display'] })} />

        {display === 'grid' ? (
          <>
            <SelectField
              label="Columns"
              value={String(s.gridCols ?? 2)}
              options={['1','2','3','4','5','6']}
              onChange={v => patchStyle(node, onChange, { gridCols: (+v) as StyleProps['gridCols'] })}
            />
            <SelectField
              label="Rows"
              value={String(s.gridRows ?? 'auto')}
              options={[{ label: 'Auto (as needed)', value: 'auto' }, '1','2','3','4','5','6']}
              onChange={v => patchStyle(node, onChange, { gridRows: (v === 'auto' ? 'auto' : +v) as StyleProps['gridRows'] })}
            />
          </>
        ) : display === 'flex' && (
          <SelectField label="Direction" value={s.flexDir ?? 'col'}  options={['col','row','row-reverse','col-reverse']} onChange={v => patchStyle(node, onChange, { flexDir: v as StyleProps['flexDir'] })} />
        )}

        {display !== 'block' && (
          <>
            {display === 'grid' ? (
              <SelectField
                label="Justify items"
                value={s.justifyItems ?? 'stretch'}
                options={['start','center','end','stretch']}
                onChange={v => patchStyle(node, onChange, { justifyItems: v as StyleProps['justifyItems'] })}
              />
            ) : (
              <SelectField label="Justify" value={s.justify ?? 'start'} options={['start','center','end','between','around','evenly']} onChange={v => patchStyle(node, onChange, { justify: v as StyleProps['justify'] })} />
            )}
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
        <p className="text-[10px] text-neutral-400 -mt-1">Vertical Position defaults to "·" (None), which stretches this Section's content to fill the full box so Justify/Align actually has room to space children apart. Pick Top/Middle/Bottom instead to shrink-wrap the content and position it within extra room (e.g. minHeight taller than the content).</p>
      </FieldGroup>

      <FieldGroup label="Background">
        <ColorField
          label={bgHover ? 'Flat color (hover)' : 'Flat color'}
          value={bgColorValue}
          onChange={setBgColor}
          hoverAdornment={
            <HoverToggle active={bgHover} hasValue={!!hover.bgColor} onToggle={() => setBgHover(v => !v)} />
          }
        />
        {bgHover && (
          <p className="text-[10px] text-neutral-400 -mt-1">
            Editing the hover color.
          </p>
        )}

        <GradientField
          label={gradientHover ? 'Gradient (hover)' : 'Gradient'}
          value={gradientValue}
          onChange={setGradient}
          hoverAdornment={
            <HoverToggle active={gradientHover} hasValue={!!hover.bgGradient} onToggle={() => setGradientHover(v => !v)} />
          }
        />
        {gradientHover && (
          <p className="text-[10px] text-neutral-400 -mt-1">
            Editing the hover gradient. Image backgrounds below still don&apos;t have a hover variant — use Custom CSS for those.
          </p>
        )}

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
        node={node}
        onChange={onChange}
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
      id={elementId(node)}
      src={src} alt={(node.props.alt as string) || ''}
      className={withCustomCss(node, 'rounded-full object-cover shrink-0')}
      style={{ width: size, height: size, ...animationStyle }}
    />
  ) : (
    <div
      ref={animationRef}
      id={elementId(node)}
      className={withCustomCss(node, 'rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-semibold shrink-0 select-none')}
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
        node={node}
        onChange={onChange}
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
      id={elementId(node)}
      className={buildClassName(s, withCustomCss(node, 'flex flex-col gap-4'))}
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
        node={node}
        onChange={onChange}
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
      id={elementId(node)}
      className={buildClassName(s, withCustomCss(node, 'bg-neutral-100 border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center gap-1.5 text-neutral-400 text-sm'))}
      style={{ ...buildInlineStyle(s, { skipSizing }), aspectRatio: ratio, minHeight: 160, ...animationStyle }}
    >
      <span className="text-xl">▶</span>
      <span className="text-xs font-medium">Paste a YouTube or Vimeo link</span>
    </div>
  )
  return (
    <div
      ref={animationRef}
      id={elementId(node)}
      className={buildClassName(s, withCustomCss(node, 'overflow-hidden'))}
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
        node={node}
        onChange={onChange}
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
      id={elementId(node)}
      className={buildClassName(s, withCustomCss(node, 'w-full divide-y divide-neutral-200 border-t border-b border-neutral-200'))}
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
        node={node}
        onChange={onChange}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════════════════════════════
// Unlike Accordion (a single self-contained component owning both its
// header buttons AND its simple text content), Tabs is a real CONTAINER —
// each tab's content is an arbitrary, independently nested block tree (its
// own Section, Columns, images, whatever), stored as an ordinary `tabpane`
// child node. See the doc comment on activeIndex/onActiveIndexChange in
// types.ts, and the 'tabs' special-case in Renderer.tsx's RenderEditorNode,
// for why the active tab is tracked as component-local state one level up
// in Renderer.tsx rather than here or in node.props.
//
// `children` here is an opaque, already-rendered ReactNode Fragment built
// by Renderer.tsx from node.children in order (with NO DropSlots mixed in,
// unlike every other container) — React.Children.toArray(...) turns that
// back into an ordered, indexable array so panes[i] lines up 1:1 with
// node.children[i] and this component can pick which one to show.

function tabLabel(nodes: Record<string, PageNode>, paneId: string, index: number): string {
  const pane = nodes[paneId]
  return (pane?.props.label as string) || `Tab ${index + 1}`
}

function TabHeaderRow({
  paneIds, activeIndex, onSelect,
}: {
  paneIds: string[]
  activeIndex: number
  onSelect: (i: number) => void
}) {
  const nodes = useBuilderStore(st => st.nodes)
  return (
    <div className="flex border-b border-neutral-200 mb-4 gap-1 overflow-x-auto">
      {paneIds.map((paneId, i) => {
        const isActive = i === activeIndex
        return (
          <button
            key={paneId}
            type="button"
            onClick={e => { e.stopPropagation(); onSelect(i) }}
            className={[
              'px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer',
              isActive ? 'border-violet-600 text-violet-700' : 'border-transparent text-neutral-500 hover:text-neutral-700',
            ].join(' ')}
          >
            {tabLabel(nodes, paneId, i)}
          </button>
        )
      })}
    </div>
  )
}

export const TabsEditor: React.FC<NodeComponentProps> = ({ node, children, activeIndex, onActiveIndexChange }) => {
  const s       = useNodeStyle(node)
  const addNode = useBuilderStore(st => st.addNode)
  const paneIds = node.children
  const safeIndex = paneIds.length > 0 ? Math.min(activeIndex ?? 0, paneIds.length - 1) : 0

  if (paneIds.length === 0) {
    return (
      <div id={elementId(node)} className={buildClassName(s, withCustomCss(node, 'w-full'))} style={buildInlineStyle(s, { skipSizing: true })}>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); addNode('tabpane', node.id, 0) }}
          className="w-full py-6 rounded-lg border-2 border-dashed border-neutral-200 hover:border-violet-300 hover:bg-violet-50/40 text-neutral-400 hover:text-violet-500 text-sm transition-colors"
        >
          + Add a tab
        </button>
      </div>
    )
  }

  // NOTE: which pane is actually visible is decided in Renderer.tsx, NOT
  // here — each child arriving via `children` is already individually
  // wrapped in its own display:none/block div by RenderEditorNode, right
  // at the point where activeIndex's state lives. This component only
  // renders the header row and passes children straight through — see the
  // comment in Renderer.tsx's RenderEditorNode for why doing the
  // hide/show wrapping HERE (one layer further from the state) turned out
  // to be unreliable.
  return (
    <div id={elementId(node)} className={buildClassName(s, withCustomCss(node, 'w-full'))} style={buildInlineStyle(s, { skipSizing: true })}>
      <TabHeaderRow paneIds={paneIds} activeIndex={safeIndex} onSelect={i => onActiveIndexChange?.(i)} />
      {children}
    </div>
  )
}

export const TabsPreview: React.FC<NodeComponentProps> = ({
  node, children, animationRef, animationStyle, activeIndex, onActiveIndexChange,
}) => {
  const s       = useNodeStyle(node)
  const paneIds = node.children
  const safeIndex = paneIds.length > 0 ? Math.min(activeIndex ?? 0, paneIds.length - 1) : 0

  if (paneIds.length === 0) return null

  // Same note as TabsEditor above — visibility per pane is decided in
  // Renderer.tsx's RenderPreviewNode, right where activeIndex's state
  // lives. This component just renders the header row and children as-is.
  return (
    <div
      ref={animationRef}
      id={elementId(node)}
      className={buildClassName(s, withCustomCss(node, 'w-full'))}
      style={{ ...buildInlineStyle(s), ...buildHoverTransitionStyle(node), ...animationStyle }}
    >
      <TabHeaderRow paneIds={paneIds} activeIndex={safeIndex} onSelect={i => onActiveIndexChange?.(i)} />
      {children}
    </div>
  )
}

export const TabsPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s          = useNodeStyle(node)
  const nodes      = useBuilderStore(st => st.nodes)
  const addNode    = useBuilderStore(st => st.addNode)
  const deleteNode = useBuilderStore(st => st.deleteNode)
  const updateProps = useBuilderStore(st => st.updateProps)
  const paneIds    = node.children

  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Tabs">
        <div className="space-y-1.5">
          {paneIds.map((paneId, i) => (
            <div key={paneId} className="flex items-center gap-1.5">
              <input
                className="flex-1 border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
                value={(nodes[paneId]?.props.label as string) ?? ''}
                placeholder={`Tab ${i + 1}`}
                onChange={e => updateProps(paneId, { label: e.target.value })}
              />
              <button
                onClick={() => deleteNode(paneId)}
                disabled={paneIds.length <= 1}
                title={paneIds.length <= 1 ? 'Tabs needs at least one tab' : 'Remove this tab'}
                className="shrink-0 w-7 h-7 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors text-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400"
                aria-label="Remove tab"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => addNode('tabpane', node.id, paneIds.length)}
          className="w-full mt-1 text-xs font-medium text-violet-600 hover:text-violet-700 py-1.5 rounded-md hover:bg-violet-50 transition-colors"
        >
          + Add tab
        </button>
        <p className="text-[10px] text-neutral-400 -mt-1">
          Click a tab's header on the canvas to switch to it and edit its contents — each tab can hold any blocks, nested as deeply as you like, exactly like a Column.
        </p>
      </FieldGroup>

      <FieldGroup label="Layout">
        <SpacingField label="Gap" value={s.gap} onChange={v => patchStyle(node, onChange, { gap: v })} />
      </FieldGroup>

      <AnimationPanel
        node={node}
        onChange={onChange}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB PANE
// ═══════════════════════════════════════════════════════════════════════════════
// The content of a single tab — an ordinary container otherwise, closely
// modeled on Column (padding/background/rounded all work identically), plus
// one extra field: `label`, the text shown on Tabs' own header button for
// this pane (read directly off this node by TabHeaderRow above via a store
// lookup, not passed down through the opaque `children` blob).

export const TabPaneEditor: React.FC<NodeComponentProps> = ({ node, children }) => {
  const s = useNodeStyle(node)
  return (
    <div id={elementId(node)} className={buildClassName(s, withCustomCss(node, 'w-full min-h-12'))} style={buildInlineStyle(s, { skipSizing: true })}>
      {children}
    </div>
  )
}

export const TabPanePreview: React.FC<NodeComponentProps> = ({ node, children, animationRef, animationStyle }) => {
  const s = useNodeStyle(node)
  return (
    <div
      ref={animationRef}
      id={elementId(node)}
      className={buildClassName(s, withCustomCss(node, 'w-full'))}
      style={{ ...buildInlineStyle(s), ...buildHoverTransitionStyle(node), ...animationStyle }}
    >
      {children}
    </div>
  )
}

export const TabPanePanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = useNodeStyle(node)
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Tab">
        <label className="block text-xs text-neutral-500 mb-1">Tab label</label>
        <input
          className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
          value={(node.props.label as string) ?? ''}
          onChange={e => onChange({ label: e.target.value })}
        />
        <p className="text-[10px] text-neutral-400 -mt-1">Shown on this tab's header button in the parent Tabs block.</p>
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
      <FieldGroup label="Background">
        <ColorField label="Color" value={s.bgColor} onChange={v => patchStyle(node, onChange, { bgColor: v || undefined })} />
      </FieldGroup>
      <AnimationPanel
        node={node}
        onChange={onChange}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAROUSEL
// ═══════════════════════════════════════════════════════════════════════════════
// Same "switched container" pattern as Tabs (see the comments in
// Renderer.tsx's RenderEditorNode/RenderPreviewNode) — children are always
// `slide` nodes, added exclusively via a dedicated "+ Add slide" action, and
// only the active one is visible (the rest stay mounted, hidden via
// display:none, wrapped by Renderer.tsx itself). Two things ARE new here,
// since Carousel is the first element with genuine autonomous runtime
// behavior:
//   - Autoplay is entirely self-contained inside CarouselPreview — a local
//     useEffect/setTimeout that just calls the activeIndex setter Renderer.tsx
//     already hands down. No back-channel needed, unlike the hide/show
//     wrapping (which genuinely had to live in Renderer.tsx). This keeps
//     the autoplay timer in the one place that actually needs it.
//   - CarouselEditor never autoplays at all — no interval effect exists
//     there — matching the established rule that the editor canvas never
//     auto-advances/animates on its own, so drag/selection/rich-text-editing
//     never has to fight a moving target. Autoplay only ever runs in
//     Preview.

function CarouselArrows({
  count, onPrev, onNext, stopPropagation,
}: {
  count: number
  onPrev: () => void
  onNext: () => void
  stopPropagation?: boolean
}) {
  if (count <= 1) return null
  function handle(fn: () => void) {
    return (e: React.MouseEvent) => { if (stopPropagation) e.stopPropagation(); fn() }
  }
  return (
    <>
      <button
        type="button"
        onClick={handle(onPrev)}
        aria-label="Previous slide"
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center text-neutral-700 text-sm transition-colors"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={handle(onNext)}
        aria-label="Next slide"
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center text-neutral-700 text-sm transition-colors"
      >
        ›
      </button>
    </>
  )
}

function CarouselDots({
  slideIds, activeIndex, onSelect, stopPropagation,
}: {
  slideIds: string[]
  activeIndex: number
  onSelect: (i: number) => void
  stopPropagation?: boolean
}) {
  if (slideIds.length <= 1) return null
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
      {slideIds.map((sid, i) => (
        <button
          key={sid}
          type="button"
          onClick={e => { if (stopPropagation) e.stopPropagation(); onSelect(i) }}
          aria-label={`Go to slide ${i + 1}`}
          className={[
            'w-2 h-2 rounded-full transition-colors',
            i === activeIndex ? 'bg-white' : 'bg-white/50 hover:bg-white/80',
          ].join(' ')}
        />
      ))}
    </div>
  )
}

export const CarouselEditor: React.FC<NodeComponentProps> = ({ node, children, activeIndex, onActiveIndexChange }) => {
  const s        = useNodeStyle(node)
  const addNode  = useBuilderStore(st => st.addNode)
  const selectNode = useBuilderStore(st => st.selectNode)
  const slideIds = node.children
  const count    = slideIds.length
  const safeIndex = count > 0 ? Math.min(activeIndex ?? 0, count - 1) : 0
  const showArrows = node.props.showArrows !== false
  const showDots   = node.props.showDots !== false

  if (count === 0) {
    return (
      <div id={elementId(node)} className={buildClassName(s, withCustomCss(node, 'w-full'))} style={buildInlineStyle(s, { skipSizing: true })}>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); addNode('slide', node.id, 0) }}
          className="w-full py-6 rounded-lg border-2 border-dashed border-neutral-200 hover:border-violet-300 hover:bg-violet-50/40 text-neutral-400 hover:text-violet-500 text-sm transition-colors"
        >
          + Add a slide
        </button>
      </div>
    )
  }

  function goTo(i: number) {
    onActiveIndexChange?.(((i % count) + count) % count)
  }

  // `children` here is already the fully-positioned sliding track — built
  // directly in Renderer.tsx's RenderEditorNode (see buildSlidingTrack
  // there), NOT by this component. Building it here instead, via
  // React.Children.toArray, was tried and reintroduced the exact failure
  // mode that originally broke Tabs (positioning logic living one layer
  // away from the state that drives it doesn't reliably reach the DOM).
  // This component only adds the clipping viewport (overflow-hidden) and
  // the arrows/dots controls around the track.
  return (
    <div
      id={elementId(node)}
      className={buildClassName(s, withCustomCss(node, 'w-full relative overflow-hidden'))}
      style={buildInlineStyle(s, { skipSizing: true })}
    >
      {children}
      {/* Carousel-select handle — every pixel of a slide's own content is
          covered by that slide's own SelectableShell (Slide is an ordinary
          container, rendered through RenderEditorNode just like Section/
          Column), so there's no "empty chrome" left for a click to land on
          and select the Carousel itself the way there is for e.g. Section's
          padding or Tabs' header row. This badge is that missing surface:
          a small always-present handle, absolutely positioned so it never
          overlaps the arrows (top-1/2) or dots (bottom-3), that selects the
          Carousel node directly and stops the click from reaching the slide
          underneath. Editor-only — CarouselPreview has no equivalent and
          shouldn't, since Preview has no selection concept at all. */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); selectNode(node.id) }}
        className="absolute top-2 left-2 z-20 px-2 py-1 rounded-md bg-neutral-900/80 hover:bg-neutral-900 text-white text-[10px] font-medium tracking-wide backdrop-blur-sm transition-colors"
        title="Select Carousel"
      >
        ⤢ Carousel
      </button>
      {showArrows && (
        <CarouselArrows count={count} onPrev={() => goTo(safeIndex - 1)} onNext={() => goTo(safeIndex + 1)} stopPropagation />
      )}
      {showDots && <CarouselDots slideIds={slideIds} activeIndex={safeIndex} onSelect={goTo} stopPropagation />}
    </div>
  )
}

export const CarouselPreview: React.FC<NodeComponentProps> = ({
  node, children, animationRef, animationStyle, activeIndex, onActiveIndexChange,
}) => {
  const s        = useNodeStyle(node)
  const slideIds = node.children
  const count    = slideIds.length
  const safeIndex = count > 0 ? Math.min(activeIndex ?? 0, count - 1) : 0

  const autoplay    = !!node.props.autoplay
  const intervalMs  = (node.props.autoplayInterval as number) ?? 4000
  const loop        = node.props.loop !== false
  const showArrows  = node.props.showArrows !== false
  const showDots    = node.props.showDots !== false

  const [paused, setPaused] = useState(false)

  // Self-contained autoplay: advances one slide per tick, re-arming a
  // fresh timer of the same duration each time safeIndex changes (so there
  // is no drift — this isn't a single long-lived interval, it's a chain of
  // one-shot timeouts, each scheduled fresh right after the previous step).
  // Skipped entirely whenever autoplay is off, there's nothing to cycle
  // through, or the user is hovering (paused). Never runs in
  // CarouselEditor — this effect exists ONLY in the Preview component, so
  // the editor canvas never auto-advances on its own.
  useEffect(() => {
    if (!autoplay || count <= 1 || paused || !onActiveIndexChange) return
    const timer = setTimeout(() => {
      const next = safeIndex + 1
      if (next >= count) {
        if (loop) onActiveIndexChange(0)
        // else: intentionally stop advancing, stays on the last slide
      } else {
        onActiveIndexChange(next)
      }
    }, Math.max(1000, intervalMs))
    return () => clearTimeout(timer)
  }, [autoplay, count, paused, safeIndex, intervalMs, loop, onActiveIndexChange])

  if (count === 0) return null

  function goTo(i: number) {
    onActiveIndexChange?.(((i % count) + count) % count)
  }

  // Same as CarouselEditor above: `children` is already the fully-
  // positioned sliding track, built in Renderer.tsx's RenderPreviewNode.
  return (
    <div
      ref={animationRef}
      id={elementId(node)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={buildClassName(s, withCustomCss(node, 'w-full relative overflow-hidden'))}
      style={{ ...buildInlineStyle(s), ...buildHoverTransitionStyle(node), ...animationStyle }}
    >
      {children}
      {showArrows && <CarouselArrows count={count} onPrev={() => goTo(safeIndex - 1)} onNext={() => goTo(safeIndex + 1)} />}
      {showDots && <CarouselDots slideIds={slideIds} activeIndex={safeIndex} onSelect={goTo} />}
    </div>
  )
}

export const CarouselPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s          = useNodeStyle(node)
  const addNode    = useBuilderStore(st => st.addNode)
  const deleteNode = useBuilderStore(st => st.deleteNode)
  const slideIds   = node.children

  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Slides">
        <div className="space-y-1.5">
          {slideIds.map((sid, i) => (
            <div key={sid} className="flex items-center justify-between border border-neutral-200 rounded-md px-2.5 py-1.5">
              <span className="text-xs text-neutral-600">Slide {i + 1}</span>
              <button
                onClick={() => deleteNode(sid)}
                disabled={slideIds.length <= 1}
                title={slideIds.length <= 1 ? 'Carousel needs at least one slide' : 'Remove this slide'}
                className="shrink-0 w-6 h-6 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors text-xs disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400"
                aria-label="Remove slide"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => addNode('slide', node.id, slideIds.length)}
          className="w-full mt-1 text-xs font-medium text-violet-600 hover:text-violet-700 py-1.5 rounded-md hover:bg-violet-50 transition-colors"
        >
          + Add slide
        </button>
        <p className="text-[10px] text-neutral-400 -mt-1">
          Click a slide's dot or arrow on the canvas to switch to it and edit its contents — each slide can hold any blocks, exactly like a Column.
        </p>
      </FieldGroup>

      <FieldGroup label="Autoplay">
        <CheckField label="Autoplay in Preview" value={!!node.props.autoplay} onChange={v => onChange({ autoplay: v })} />
        {!!node.props.autoplay && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 w-20 shrink-0">Speed</span>
            <input
              type="range" min={1500} max={10000} step={500}
              className="flex-1 accent-violet-600"
              value={(node.props.autoplayInterval as number) ?? 4000}
              onChange={e => onChange({ autoplayInterval: +e.target.value })}
            />
            <span className="text-xs text-neutral-400 w-12 text-right">{(((node.props.autoplayInterval as number) ?? 4000) / 1000).toFixed(1)}s</span>
          </div>
        )}
        <CheckField label="Loop back to first slide" value={node.props.loop !== false} onChange={v => onChange({ loop: v })} />
        <p className="text-[10px] text-neutral-400 -mt-1">
          Autoplay only ever runs in Preview — the editor canvas never auto-advances on its own, so drag/selection/editing stay predictable. Automatically pauses while the mouse hovers the carousel in Preview.
        </p>
      </FieldGroup>

      <FieldGroup label="Controls">
        <CheckField label="Show arrows" value={node.props.showArrows !== false} onChange={v => onChange({ showArrows: v })} />
        <CheckField label="Show dots" value={node.props.showDots !== false} onChange={v => onChange({ showDots: v })} />
      </FieldGroup>

      <FieldGroup label="Layout">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 w-20 shrink-0">Min height</span>
          <input
            type="number" min={0} max={800} step={10}
            placeholder="Auto"
            className="flex-1 border border-neutral-200 rounded text-xs p-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
            value={typeof s.minHeight === 'number' ? s.minHeight : ''}
            onChange={e => {
              const raw = e.target.value
              patchStyle(node, onChange, { minHeight: raw === '' ? undefined : Math.max(0, +raw || 0) })
            }}
          />
          <span className="text-xs text-neutral-400 shrink-0">px</span>
        </div>
        <p className="text-[10px] text-neutral-400 -mt-1">
          Keeps the carousel a stable height across slides of different content lengths — leave blank to size to each slide's own content instead.
        </p>
      </FieldGroup>

      <AnimationPanel
        node={node}
        onChange={onChange}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE
// ═══════════════════════════════════════════════════════════════════════════════
// The content of a single carousel slide — an ordinary container otherwise,
// closely modeled on Tab Pane minus the `label` field (a slide has no text
// header to label; dot indicators are purely visual). Deliberately kept
// minimal here — no dedicated Background field like Tab Pane/Column have —
// since the generic Style tab's own Background field already covers this
// and a slide's most common content (a single edge-to-edge Image, or a
// self-contained Quote card) rarely needs it duplicated in the Content tab.

export const SlideEditor: React.FC<NodeComponentProps> = ({ node, children }) => {
  const s = useNodeStyle(node)
  return (
    <div id={elementId(node)} className={buildClassName(s, withCustomCss(node, 'w-full min-h-12'))} style={buildInlineStyle(s, { skipSizing: true })}>
      {children}
    </div>
  )
}

export const SlidePreview: React.FC<NodeComponentProps> = ({ node, children, animationRef, animationStyle }) => {
  const s = useNodeStyle(node)
  return (
    <div
      ref={animationRef}
      id={elementId(node)}
      className={buildClassName(s, withCustomCss(node, 'w-full'))}
      style={{ ...buildInlineStyle(s), ...buildHoverTransitionStyle(node), ...animationStyle }}
    >
      {children}
    </div>
  )
}

export const SlidePanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = useNodeStyle(node)
  return (
    <div className="space-y-5 p-4">
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
      <AnimationPanel
        node={node}
        onChange={onChange}
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
      id={elementId(node)}
      className={buildClassName(s, withCustomCss(node, 'space-y-2 list-none'))}
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
        node={node}
        onChange={onChange}
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
      id={elementId(node)}
      className={buildClassName(s, withCustomCss(node, `inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${varClass}`))}
      style={{ ...buildInlineStyle(s, { skipSizing }), ...buildHoverTransitionStyle(node), ...animationStyle }}
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
        node={node}
        onChange={onChange}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLUMNS
// ═══════════════════════════════════════════════════════════════════════════════

export const ColumnsEditor: React.FC<NodeComponentProps> = ({ node, children }) => {
  const s = useNodeStyle(node)
  return <div id={elementId(node)} className={buildClassName(s, withCustomCss(node, 'w-full flex flex-row'))} style={{ ...buildInlineStyle(s, { skipSizing: true }), minHeight: 48 }}>{children}</div>
}

export const ColumnsPreview: React.FC<NodeComponentProps> = ({ node, children, animationRef, animationStyle }) => {
  const s = useNodeStyle(node)
  return (
    <div
      ref={animationRef}
      id={elementId(node)}
      className={buildClassName(s, withCustomCss(node, 'w-full flex flex-row'))}
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
        node={node}
        onChange={onChange}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLUMN
// ═══════════════════════════════════════════════════════════════════════════════

export const ColumnEditor: React.FC<NodeComponentProps> = ({ node, children }) => {
  const s = useNodeStyle(node)
  return <div id={elementId(node)} className={buildClassName(s, withCustomCss(node, 'flex-1 min-w-0 min-h-12'))} style={buildInlineStyle(s, { skipSizing: true })}>{children}</div>
}

export const ColumnPreview: React.FC<NodeComponentProps> = ({ node, children, animationRef, animationStyle }) => {
  const s = useNodeStyle(node)
  return (
    <div
      ref={animationRef}
      id={elementId(node)}
      className={buildClassName(s, withCustomCss(node, 'flex-1 min-w-0'))}
      style={{ ...buildInlineStyle(s), ...buildHoverTransitionStyle(node), ...animationStyle }}
    >
      {children}
    </div>
  )
}

export const ColumnPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = useNodeStyle(node)
  const widthMode = typeof s.width === 'number' ? 'fixed' : (s.width as string) || 'fill'

  // Same pattern as SectionPanel: Column's background lives here in the
  // Content tab (the Style tab's own Background field is hidden for
  // Column — see ControlPanel.tsx — since this is the single source of
  // truth for it), so both the flat color and gradient hover toggles
  // live here too instead of in StylePanel.
  const [bgHover, setBgHover] = useState(false)
  const [gradientHover, setGradientHover] = useState(false)
  const hover = (node.props.styleHover as HoverStyleProps) ?? {}
  const bgColorValue = bgHover ? hover.bgColor : s.bgColor
  const setBgColor = (v: string) =>
    bgHover
      ? onChange({ styleHover: { ...hover, bgColor: v || undefined } })
      : patchStyle(node, onChange, { bgColor: v || undefined })
  const gradientValue = gradientHover ? hover.bgGradient : s.bgGradient
  const setGradient = (v: string) =>
    gradientHover
      ? onChange({ styleHover: { ...hover, bgGradient: v || undefined } })
      : patchStyle(node, onChange, { bgGradient: v || undefined })

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
        <ColorField
          label={bgHover ? 'Color (hover)' : 'Color'}
          value={bgColorValue}
          onChange={setBgColor}
          hoverAdornment={
            <HoverToggle active={bgHover} hasValue={!!hover.bgColor} onToggle={() => setBgHover(v => !v)} />
          }
        />
        <GradientField
          label={gradientHover ? 'Gradient (hover)' : 'Gradient'}
          value={gradientValue}
          onChange={setGradient}
          hoverAdornment={
            <HoverToggle active={gradientHover} hasValue={!!hover.bgGradient} onToggle={() => setGradientHover(v => !v)} />
          }
        />
      </FieldGroup>
      <AnimationPanel
        node={node}
        onChange={onChange}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRID
// ═══════════════════════════════════════════════════════════════════════════════
// A real "bento"-style layout container. Unlike Section's own Display:Grid
// mode (plain CSS grid auto-placement, no way to make one child bigger than
// its siblings), Grid pairs auto-placement with a per-CHILD "Cell span"
// control (GridCellSpanField, in panelComponents.tsx — wired into
// ControlPanel's ContentTab whenever the selected block's direct parent is
// a Grid). Children stay ordinary ordered nodes: no coordinate map on the
// parent, so add/delete/duplicate/drag-reorder all keep working exactly as
// they already do for Columns and Section — a child's visual cell falls
// out of its position in that order plus however many cells it's told to
// span. gridAutoFlow:'dense' (see buildFlexInlineProps in styleMapper.ts)
// is what lets a smaller sibling automatically fill the gap a spanning
// child leaves behind, instead of leaving a hole.
//
// Renderer.tsx needs NO changes to support this: its container-rendering
// logic already keys off `resolvedStyle.display === 'grid'` (not off
// node.type) to decide how to wrap DropSlots and the empty-state/
// persistent "Add block" prompt — Grid inherits all of that for free by
// simply defaulting to style.display:'grid' (see registry.tsx).

const GRID_PICKER_MAX = 6

// Interactive "insert table"-style size picker — hover previews the N×M
// grid that clicking would commit to, exactly like the classic Office
// insert-table control. Gives GridPanel a genuine visual instead of two
// bare number dropdowns for something inherently spatial.
function GridSizePicker({
  cols, rows, onChange,
}: {
  cols: number
  rows: number
  onChange: (cols: number, rows: number) => void
}) {
  const [hover, setHover] = useState<{ c: number; r: number } | null>(null)
  const previewCols = hover?.c ?? cols
  const previewRows = hover?.r ?? rows

  return (
    <div>
      <div
        className="inline-grid gap-1 p-2 bg-neutral-50 rounded-md border border-neutral-200"
        style={{
          gridTemplateColumns: `repeat(${GRID_PICKER_MAX}, 18px)`,
          gridTemplateRows: `repeat(${GRID_PICKER_MAX}, 18px)`,
        }}
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: GRID_PICKER_MAX * GRID_PICKER_MAX }).map((_, i) => {
          const c = (i % GRID_PICKER_MAX) + 1
          const r = Math.floor(i / GRID_PICKER_MAX) + 1
          const active = c <= previewCols && r <= previewRows
          return (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setHover({ c, r })}
              onClick={() => onChange(c, r)}
              aria-label={`${c} columns by ${r} rows`}
              className={[
                'rounded-sm transition-colors',
                active ? 'bg-violet-500' : 'bg-white border border-neutral-200 hover:border-violet-300',
              ].join(' ')}
            />
          )
        })}
      </div>
      <p className="text-xs font-medium text-neutral-500 mt-1.5">{previewCols} × {previewRows} grid</p>
    </div>
  )
}

export const GridEditor: React.FC<NodeComponentProps> = ({ node, children }) => {
  const s = useNodeStyle(node)
  return (
    <div
      id={elementId(node)}
      className={buildClassName(s, withCustomCss(node, 'w-full'))}
      style={{ ...buildInlineStyle(s, { skipSizing: true }), minHeight: 64 }}
    >
      {children}
    </div>
  )
}

export const GridPreview: React.FC<NodeComponentProps> = ({ node, children, animationRef, animationStyle }) => {
  const s = useNodeStyle(node)
  return (
    <div
      ref={animationRef}
      id={elementId(node)}
      className={buildClassName(s, withCustomCss(node, 'w-full'))}
      style={{ ...buildInlineStyle(s), ...buildHoverTransitionStyle(node), ...animationStyle }}
    >
      {children}
    </div>
  )
}

export const GridPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s    = useNodeStyle(node)
  const cols = (s.gridCols as number) ?? 3
  const rows = typeof s.gridRows === 'number' ? s.gridRows : 2

  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Grid size">
        <GridSizePicker
          cols={cols}
          rows={rows}
          onChange={(c, r) => patchStyle(node, onChange, {
            gridCols: c as StyleProps['gridCols'],
            gridRows: r as StyleProps['gridRows'],
          })}
        />
        <p className="text-[10px] text-neutral-400">
          Click a cell above to set the column/row count. Blocks placed inside fill cells in order — select a block sitting in this Grid and use its "Cell span" control (its own Content tab) to make it take up more than one cell.
        </p>
      </FieldGroup>

      <FieldGroup label="Layout">
        <SpacingField label="Gap" value={s.gap} onChange={v => patchStyle(node, onChange, { gap: v })} />
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 w-20 shrink-0">Row height</span>
          <input
            type="number" min={40} max={400} step={10}
            className="flex-1 border border-neutral-200 rounded text-xs p-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
            value={s.gridRowMinHeight ?? 100}
            onChange={e => patchStyle(node, onChange, { gridRowMinHeight: +e.target.value || 100 })}
          />
          <span className="text-xs text-neutral-400 shrink-0">px min</span>
        </div>
        <SelectField
          label="Justify items" value={s.justifyItems ?? 'stretch'}
          options={['start','center','end','stretch']}
          onChange={v => patchStyle(node, onChange, { justifyItems: v as StyleProps['justifyItems'] })}
        />
        <SelectField
          label="Align items" value={s.align ?? 'stretch'}
          options={['start','center','end','stretch','baseline']}
          onChange={v => patchStyle(node, onChange, { align: v as StyleProps['align'] })}
        />
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

      <AnimationPanel
        node={node}
        onChange={onChange}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT
// ═══════════════════════════════════════════════════════════════════════════════

export const TextEditor: React.FC<NodeComponentProps> = ({ node }) => {
  const s = useNodeStyle(node)
  const selectedId = useBuilderStore(st => st.selectedId)
  const isSelected = selectedId === node.id
  const { isRichEditing, startEditing, editor, handleBlur } = useRichTextEdit(node, 'content', getTextExtensions())

  if (isRichEditing) {
    return (
      <div className="relative" id={elementId(node)} style={buildInlineStyle(s, { skipSizing: true })} onBlur={handleBlur}>
        <RichTextToolbar editor={editor} allowBlocks />
        <EditorContent
          editor={editor}
          className={buildClassName(s, withCustomCss(node, 'outline-none ring-1 ring-violet-300 ring-inset rounded cursor-text [&_.ProseMirror]:outline-none'))}
        />
      </div>
    )
  }

  const hasContent = !!(node.props.content as string)
  return (
    <p
      id={elementId(node)}
      onDoubleClick={e => { e.stopPropagation(); startEditing() }}
      className={buildClassName(s, withCustomCss(node, ['outline-none', isSelected ? 'cursor-text' : '', !hasContent ? 'text-neutral-300 italic' : ''].join(' ')))}
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
      id={elementId(node)}
      className={buildClassName(s, customCssClass(node))}
      style={{ ...buildInlineStyle(s), ...buildHoverTransitionStyle(node), ...animationStyle }}
      dangerouslySetInnerHTML={{ __html: (node.props.content as string) ?? '' }}
    />
  )
}

export const TextPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Content">
        <label className="block text-xs text-neutral-500 mb-1">Text</label>
        <textarea className="w-full border border-neutral-200 rounded-md text-sm p-2 resize-y min-h-20 focus:outline-none focus:ring-1 focus:ring-violet-400" value={(node.props.content as string) ?? ''} onChange={e => onChange({ content: e.target.value })} />
        <p className="text-[10px] text-neutral-400 mt-1">Tip: double-click the text on the canvas for the full formatting toolbar (bold, links, lists, alignment…)</p>
      </FieldGroup>
      <AnimationPanel
        node={node}
        onChange={onChange}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEADING
// ═══════════════════════════════════════════════════════════════════════════════

type HTag = 'h1'|'h2'|'h3'|'h4'|'h5'|'h6'

export const HeadingEditor: React.FC<NodeComponentProps> = ({ node }) => {
  const s   = useNodeStyle(node)
  const Tag = ((node.props.tag as HTag) || 'h2') as HTag
  const selectedId = useBuilderStore(st => st.selectedId)
  const isSelected = selectedId === node.id
  const { isRichEditing, startEditing, editor, handleBlur } = useRichTextEdit(node, 'content', getHeadingExtensions())

  if (isRichEditing) {
    return (
      <div className="relative" id={elementId(node)} style={buildInlineStyle(s, { skipSizing: true })} onBlur={handleBlur}>
        <RichTextToolbar editor={editor} allowBlocks={false} />
        <EditorContent
          editor={editor}
          className={buildClassName(s, withCustomCss(node, 'outline-none ring-1 ring-violet-300 ring-inset rounded cursor-text [&_.ProseMirror]:outline-none'))}
        />
      </div>
    )
  }

  const hasContent = !!(node.props.content as string)
  return (
    <Tag
      id={elementId(node)}
      onDoubleClick={(e: React.MouseEvent) => { e.stopPropagation(); startEditing() }}
      className={buildClassName(s, withCustomCss(node, ['outline-none', isSelected ? 'cursor-text' : '', !hasContent ? 'text-neutral-300 italic' : ''].join(' ')))}
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
      id={elementId(node)}
      className={buildClassName(s, customCssClass(node))}
      style={{ ...buildInlineStyle(s), ...buildHoverTransitionStyle(node), ...animationStyle }}
      dangerouslySetInnerHTML={{ __html: (node.props.content as string) ?? '' }}
    />
  )
}

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
        node={node}
        onChange={onChange}
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
    <div id={elementId(node)} onClick={handleEmptyClick} className={buildClassName(s, withCustomCss(node, 'bg-neutral-100 border-2 border-dashed border-neutral-300 hover:border-violet-300 hover:bg-violet-50/40 flex flex-col items-center justify-center gap-1.5 text-neutral-400 text-sm cursor-pointer transition-colors'))} style={{ ...buildInlineStyle(s, { skipSizing: true }), aspectRatio: s.aspectRatio && s.aspectRatio !== 'auto' ? s.aspectRatio : '16 / 9', minHeight: 128 }}>
      <span className="text-xl">🖼️</span>
      <span className="text-xs font-medium">Click to choose an image</span>
    </div>
  )

  // eslint-disable-next-line @next/next/no-img-element
  return <img id={elementId(node)} src={src} alt={(node.props.alt as string) || ''} className={buildClassName(s, withCustomCss(node, 'block w-full'))} style={{ height: 'auto', ...buildInlineStyle(s, { skipSizing: true }) }} />
}

export const ImagePreview: React.FC<NodeComponentProps> = ({ node, animationRef, animationStyle }) => {
  const s             = useNodeStyle(node)
  const hasFixedWidth = typeof s.width === 'number'
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      ref={animationRef}
      id={elementId(node)}
      src={node.props.src as string}
      alt={(node.props.alt as string) || ''}
      className={buildClassName(s, withCustomCss(node, hasFixedWidth ? 'block' : 'max-w-full block'))}
      style={{ width: hasFixedWidth ? s.width : '100%', height: 'auto', ...buildInlineStyle(s), ...buildHoverTransitionStyle(node), ...animationStyle }}
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
        {src && (
          <button
            onClick={() => useBuilderStore.getState().openImageEditor(src, editedDataUrl => onChange({ src: editedDataUrl }))}
            className="w-full mt-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 py-1.5 rounded-md hover:bg-violet-50 transition-colors"
          >
            Edit image
          </button>
        )}
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
        node={node}
        onChange={onChange}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUTTON
// ═══════════════════════════════════════════════════════════════════════════════
// FIX: this used to render a plain <button> element that NEVER read
// node.props.href at all — the Link field in ButtonPanel saved a value, but
// nothing anywhere ever consumed it, so "the link doesn't work" wasn't a
// bug in the URL handling, it was that there was no href on the rendered
// element in the first place. Now a real <a>, with the href resolved via
// resolveHref (links.ts) based on the chosen Link type (Relative — used
// exactly as typed, for in-page anchors like "#pricing" or same-site paths
// like "/about" — or Absolute, which auto-prepends https:// if the user
// left off a protocol).
//
// isEditor prevents ACTUAL navigation while editing: SelectableShell's
// wrapper already handles selecting this block on click via its own
// onClick further up the tree — but since this is now a real <a href>, the
// browser's default click behavior would navigate away from the page
// builder entirely before that selection logic even matters. Preview and
// the exported HTML get the real, unprevented click — that's the one place
// this should actually work as a normal link.
//
// hasFixedSize/box-border: fixes the second Button bug (border not
// matching the resize handles) — inline-flex sizes to CONTENT alone, so
// dragging the resize handle changed only the SelectableShell wrapper's
// box, never this <a>'s own visible border. Once a width/height has
// actually been set (i.e. the block has been resized), this <a> fills that
// box (w-full h-full) instead of shrink-wrapping to its label text, and
// box-border keeps the padding inside that box instead of adding to it. A
// never-resized Button (no explicit width/height) is unaffected — it keeps
// sizing to content exactly as before.

const VARIANTS: Record<string, string> = {
  solid:   'bg-violet-600 text-white hover:bg-violet-700',
  outline: 'border-2 border-violet-600 text-violet-600 hover:bg-violet-50',
  ghost:   'text-violet-600 hover:bg-violet-50',
}

function ButtonRender({
  node,
  skipSizing,
  isEditor,
  animationRef,
  animationStyle,
}: {
  node: PageNode
  skipSizing: boolean
  isEditor?: boolean
  animationRef?: React.Ref<HTMLAnchorElement>
  animationStyle?: React.CSSProperties
}) {
  const s = useNodeStyle(node)
  const variant = (node.props.variant as string) || 'solid'
  const varClass = VARIANTS[variant] ?? VARIANTS.solid
  const linkType = ((node.props.linkType as LinkType) || 'relative')
  const href = resolveHref(node.props.href as string, linkType)
  const openInNewTab = !!node.props.openInNewTab
  const hasFixedSize = typeof s.width === 'number' || typeof s.height === 'number'

  return (
    <a
      ref={animationRef}
      id={elementId(node)}
      href={href}
      target={openInNewTab ? '_blank' : undefined}
      rel={openInNewTab ? 'noopener noreferrer' : undefined}
      onClick={isEditor ? (e) => e.preventDefault() : undefined}
      className={buildClassName(
        s,
        withCustomCss(
          node,
          `inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-medium transition-colors text-sm box-border ${varClass} ${hasFixedSize ? 'w-full h-full' : ''}`
        )
      )}
      style={{
        ...buildInlineStyle(s, { skipSizing }),
        ...buildHoverTransitionStyle(node),
        ...animationStyle,
      }}
    >
      {(node.props.label as string) || 'Button'}
    </a>
  )
}

export const ButtonEditor:  React.FC<NodeComponentProps> = ({ node }) => <ButtonRender node={node} skipSizing={true} isEditor />
export const ButtonPreview: React.FC<NodeComponentProps> = ({ node, animationRef, animationStyle }) =>
  <ButtonRender node={node} skipSizing={false} animationRef={animationRef} animationStyle={animationStyle} />

export const ButtonPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = useNodeStyle(node)
  const linkType = ((node.props.linkType as LinkType) || 'relative')

  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Content">
        <label className="block text-xs text-neutral-500 mb-1">Label</label>
        <input className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400" value={(node.props.label as string) ?? ''} onChange={e => onChange({ label: e.target.value })} />
      </FieldGroup>

      <FieldGroup label="Link">
        <SelectField
          label="Type"
          value={linkType}
          options={[
            { label: 'Relative (#anchor, /path)', value: 'relative' },
            { label: 'Absolute (https://…)',      value: 'absolute' },
          ]}
          onChange={v => onChange({ linkType: v as LinkType })}
        />
        <input
          className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
          placeholder={linkType === 'absolute' ? 'example.com or https://example.com' : '/pricing or #contact'}
          value={(node.props.href as string) ?? ''}
          onChange={e => onChange({ href: e.target.value })}
        />
        <p className="text-[10px] text-neutral-400 -mt-1">
          {linkType === 'absolute'
            ? 'https:// is added automatically if you leave it off.'
            : 'Used exactly as typed — good for in-page anchors (an Element ID elsewhere on this page, e.g. "#pricing") or paths on this same site (e.g. "/pricing").'}
        </p>
        <CheckField
          label="Open in new tab"
          value={!!node.props.openInNewTab}
          onChange={v => onChange({ openInNewTab: v })}
        />
      </FieldGroup>

      <FieldGroup label="Style">
        <SelectField label="Variant" value={(node.props.variant as string) ?? 'solid'} options={['solid','outline','ghost']} onChange={v => onChange({ variant: v })} />
      </FieldGroup>
      <FieldGroup label="Position">
        <AlignField style={s} onChange={partial => patchStyle(node, onChange, partial)} />
        <p className="text-[10px] text-neutral-400 -mt-1">Only visible once this block's container is wider/taller than the button itself</p>
      </FieldGroup>

      <AnimationPanel
        node={node}
        onChange={onChange}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPACER
// ═══════════════════════════════════════════════════════════════════════════════

export const SpacerEditor: React.FC<NodeComponentProps> = ({ node }) => (
  <div id={elementId(node)} style={{ height: (node.props.height as number) ?? 40 }} className={withCustomCss(node, 'w-full bg-violet-50 border border-dashed border-violet-200 flex items-center justify-center text-violet-300 text-xs select-none')}>
    spacer {(node.props.height as number) ?? 40}px
  </div>
)

export const SpacerPreview: React.FC<NodeComponentProps> = ({ node, animationRef, animationStyle }) => (
  <div
    ref={animationRef}
    id={elementId(node)}
    style={{ height: (node.props.height as number) ?? 40, ...animationStyle }}
    className={withCustomCss(node, 'w-full')}
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
      node={node}
      onChange={onChange}
    />
  </div>
)

// ═══════════════════════════════════════════════════════════════════════════════
// DIVIDER
// ═══════════════════════════════════════════════════════════════════════════════

export const DividerEditor:  React.FC<NodeComponentProps> = ({ node }) => {
  const s = useNodeStyle(node)
  return <hr id={elementId(node)} className={buildClassName(s, withCustomCss(node, 'w-full border-neutral-200'))} style={buildInlineStyle(s, { skipSizing: true })} />
}
export const DividerPreview: React.FC<NodeComponentProps> = ({ node, animationRef, animationStyle }) => {
  const s = useNodeStyle(node)
  return (
    <hr
      ref={animationRef}
      id={elementId(node)}
      className={buildClassName(s, withCustomCss(node, 'w-full'))}
      style={{ ...buildInlineStyle(s), ...buildHoverTransitionStyle(node), ...animationStyle }}
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
        node={node}
        onChange={onChange}
      />
    </div>
  )
}