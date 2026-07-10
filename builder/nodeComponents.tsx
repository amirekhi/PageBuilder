'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { NodeComponentProps, PanelProps, PageNode } from './types'
import {
  StyleProps, buildClassName, buildInlineStyle, buildOverlayStyle,
  buildFlexLayoutClassName, buildFlexLayoutStyle,
  buildSectionOuterStyle, buildSectionInnerClassName, buildSectionInnerStyle,
} from './styleMapper'
import { FieldGroup, SelectField, SpacingField, AlignField, ColorField, GradientField, StylePanel, BoxSpacingField, AnimationPanel } from './panelComponents'
import { useBuilderStore } from './store'
import { useNodeStyle, patchNodeStyle } from './responsive'
import { AnimationProps } from './animations'

// ─── Helper ───────────────────────────────────────────────────────────────────
// getStyle() is gone — every component below now calls useNodeStyle(node)
// instead, which resolves style for whichever breakpoint (desktop/tablet/
// mobile) is currently being edited (see responsive.ts). patchStyle() now
// routes through patchNodeStyle so writes land in the correct breakpoint's
// style bucket instead of always overwriting desktop.
//
// SIZING NOTE: every *Editor component is rendered inside SelectableShell,
// whose wrapper already applies width/maxWidth via buildBoxSizingStyle (see
// styleMapper.ts). If the Editor's own root element ALSO applies width via
// buildInlineStyle, that's harmless for a plain pixel width (623px means
// 623px regardless of nesting) but actively wrong for a percentage width:
// 45% of an element whose own parent is already 45% of the real container
// resolves to ~20%, not 45% — invisible until something has a background
// color to reveal the compounding. So every *Editor component below calls
// buildInlineStyle(s, { skipSizing: true }). *Preview components have NO
// such wrapper (RenderPreviewNode renders them directly) and must keep
// applying sizing themselves — they call buildInlineStyle(s) with no
// options, unchanged.
//
// ANIMATION NOTE (props): node.props.animation (see animations.ts /
// AnimationPanel) is read/written directly, same as every other non-style
// prop (label, content, items, etc) — it is NOT part of StyleProps and does
// not go through patchStyle/patchNodeStyle, since it isn't per-breakpoint.
// Every panel below ends with one <AnimationPanel .../> call.
//
// ANIMATION NOTE (rendering): every *Preview component below now accepts
// `animationRef` and `animationStyle` (see NodeComponentProps in types.ts)
// and applies them directly to its OWN root element's `ref`/`style`. This
// is required — RenderPreviewNode (Renderer.tsx) computes these via the
// useAnimationProps() hook and passes them down as plain props; there is no
// way to attach a ref/style to "the DOM node a function component renders"
// from outside the component itself, short of adding a wrapper <div> (which
// this codebase deliberately avoids elsewhere to not break flex sizing —
// see the SIZING NOTE above). *Editor components deliberately do NOT
// receive or apply these — RenderEditorNode never passes them — so
// animations never play while editing.

function patchStyle(node: PageNode, onChange: PanelProps['onChange'], partial: Partial<StyleProps>) {
  patchNodeStyle(node, onChange, partial)
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
// Split into an OUTER full-bleed "band" (background + vertical padding, no
// max-width) and an INNER centered "column" (max-width + horizontal padding
// + centering + flex layout) — see styleMapper.ts's buildSectionOuterStyle/
// buildSectionInnerStyle/buildSectionInnerClassName for why this split
// exists: one element can't both paint a full-width background AND be a
// centered max-width box at the same time.
//
// ROOT OVERRIDE (PREVIEW ONLY): the root node is rendered through this same
// Section component, but it's not a real visual "block" the way nested
// sections are — it's just the invisible page-level stack that those real
// sections live inside. In PREVIEW, if the root also applies its own
// py/px/gap on top of every nested section's own py/px/gap, you get
// doubled-up spacing (padding inside padding, gap sitting on top of gap).
// So SectionPreview zeros out root padding/gap before building its styles.
//
// In the EDITOR, though, that same root padding/gap is left alone on
// purpose — it gives you a bit of breathing room around the canvas edges
// and between top-level blocks, which makes the drop-target/drag-handle
// areas easier to grab. It never renders in Preview, so it's free real
// estate for editing ergonomics with zero visual cost in the final page.
//
// ANIMATION TARGET: the OUTER <section> is the animated root (not the inner
// column div) — it's the element that actually owns the node's background/
// padding/margin, so it's the one that should fade/slide/zoom as a unit.

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

export const SectionEditor: React.FC<NodeComponentProps> = ({ node, children }) => {
  const rawStyle       = useNodeStyle(node)
  const s              = useRootAdjustedStyle(node, rawStyle)   // ← was: no adjustment
  const overlayStyle   = buildOverlayStyle(s.bgOverlay)
  const hasBackground  = !!(s.bgImage || s.bgGradient)

  return (
    <section
      className="w-full relative"
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
  const s        = useRootAdjustedStyle(node, rawStyle)   // ← only change
  const overlayStyle  = buildOverlayStyle(s.bgOverlay)
  const hasBackground = !!(s.bgImage || s.bgGradient)

  return (
    <section
      ref={animationRef}
      className={buildClassName(s, 'w-full relative')}
      style={{ ...buildInlineStyle(s), minHeight: typeof s.minHeight === 'number' ? s.minHeight : 64, ...animationStyle }}
    >
      {overlayStyle && <div style={overlayStyle} aria-hidden />}
      <div
        className={[buildFlexLayoutClassName(s), 'w-full', hasBackground ? 'relative z-10' : ''].filter(Boolean).join(' ')}
        style={buildFlexLayoutStyle(s)}
      >
        {children}
      </div>
    </section>
  )
}

export const SectionPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = useNodeStyle(node)
  const openMediaPicker = useBuilderStore(st => st.openMediaPicker)

  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Layout">
        <SelectField label="Display"   value={s.display ?? 'flex'} options={['flex','block','grid']} onChange={v => patchStyle(node, onChange, { display: v as StyleProps['display'] })} />
        <SelectField label="Direction" value={s.flexDir ?? 'col'}  options={['col','row','row-reverse','col-reverse']} onChange={v => patchStyle(node, onChange, { flexDir: v as StyleProps['flexDir'] })} />
        <SelectField label="Justify"        value={s.justify ?? 'start'} options={['start','center','end','between','around','evenly']} onChange={v => patchStyle(node, onChange, { justify: v as StyleProps['justify'] })} />
        <SelectField label="Align children" value={s.align ?? 'start'}  options={['start','center','end','stretch']} onChange={v => patchStyle(node, onChange, { align: v as StyleProps['align'] })} />
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
            mt: next.top as number | undefined, mr: next.right as number | 'auto' | undefined,
            mb: next.bottom as number | undefined, ml: next.left as number | 'auto' | undefined,
          })}
        />
      </FieldGroup>

      <FieldGroup label="Width">
        <SelectField label="Max Width" value={s.maxWidth as string ?? ''} options={[{label:'—',value:''},'sm','md','lg','xl','2xl','3xl','4xl','5xl','6xl','7xl','full']} onChange={v => patchStyle(node, onChange, { maxWidth: (v || undefined) as StyleProps['maxWidth'] })} />
      </FieldGroup>

      <FieldGroup label="Position">
        <AlignField style={s} onChange={partial => patchStyle(node, onChange, partial)} />
        <p className="text-[10px] text-neutral-400 -mt-1">Where this Section sits if its Max Width is narrower than the page</p>
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
// Unaffected by the sizing split — sizes itself off node.props.size (a
// diameter), not via buildInlineStyle at all. AvatarRender is shared between
// Editor+Preview; animationRef/animationStyle are optional params that
// AvatarEditor simply never passes (so they're always undefined there).

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
// Was one shared render function for Editor+Preview — split so Editor can
// skip sizing (wrapper owns it) while Preview still applies it (no wrapper).

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

export const QuotePanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = useNodeStyle(node)
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
// Same split pattern as Quote above.

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
        <p className="text-[10px] text-neutral-400 -mt-1">Only visible once this block's width is narrower than its container</p>
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
// Same split pattern.

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

export const AccordionPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s     = useNodeStyle(node)
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
// Same split pattern.

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

export const ListPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s     = useNodeStyle(node)
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
// Same split pattern.

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
        <SelectField  label="Align items"  value={s.align ?? 'stretch'} options={['start','center','end','stretch']} onChange={v => patchStyle(node, onChange, { align: v as StyleProps['align'] })} />
        <SelectField  label="Justify"      value={s.justify ?? 'between'} options={['start','center','end','between','around','evenly']} onChange={v => patchStyle(node, onChange, { justify: v as StyleProps['justify'] })} />
        <p className="text-[10px] text-neutral-400 -mt-1">Controls how the Columns inside line up — each Column's own position is set on the Column itself via Justify above, not on the Column</p>
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
// Deliberately NO AlignField here. A Column's position within its parent
// Columns row is already controlled by ColumnsPanel's own Justify setting —
// adding a second, competing left/center/right control on the Column itself
// would be a real duplicate (two mechanisms fighting for the same visual
// result), not a missing feature.

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
      <FieldGroup label="Margin">
        <BoxSpacingField
          label="Margin"
          values={{ top: s.mt ?? s.my, right: s.mr ?? s.mx, bottom: s.mb ?? s.my, left: s.ml ?? s.mx }}
          onChange={next => patchStyle(node, onChange, {
            mt: next.top as number | undefined, mr: next.right as number | 'auto' | undefined,
            mb: next.bottom as number | undefined, ml: next.left as number | 'auto' | undefined,
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

export const TextEditor: React.FC<NodeComponentProps> = ({ node }) => {
  const s = useNodeStyle(node)
  const { ref, isSelected, onFocus, onBlur, onKeyDown, onInput } = useInlineEdit(node, 'content')
  return (
    <p
      ref={ref as React.RefObject<HTMLParagraphElement>}
      contentEditable={isSelected}
      suppressContentEditableWarning
      onFocus={onFocus} onBlur={onBlur} onKeyDown={onKeyDown} onInput={onInput}
      className={buildClassName(s, ['outline-none', isSelected ? 'cursor-text ring-1 ring-violet-300 ring-inset rounded' : '', !node.props.content && !isSelected ? 'text-neutral-300 italic' : ''].join(' '))}
      style={buildInlineStyle(s, { skipSizing: true })}
      data-placeholder="Click to edit text…"
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
    >
      {node.props.content as string}
    </p>
  )
}

export const TextPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = useNodeStyle(node)
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Content">
        <label className="block text-xs text-neutral-500 mb-1">Text</label>
        <textarea className="w-full border border-neutral-200 rounded-md text-sm p-2 resize-y min-h-20 focus:outline-none focus:ring-1 focus:ring-violet-400" value={(node.props.content as string) ?? ''} onChange={e => onChange({ content: e.target.value })} />
        <p className="text-[10px] text-neutral-400 mt-1">Tip: click text on the canvas to edit inline</p>
      </FieldGroup>
      <StylePanel style={s} onChange={partial => patchStyle(node, onChange, partial)} />
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

type HTag = 'h1'|'h2'|'h3'|'h4'|'h5'|'h6'

export const HeadingEditor: React.FC<NodeComponentProps> = ({ node }) => {
  const s   = useNodeStyle(node)
  const Tag = ((node.props.tag as HTag) || 'h2') as HTag
  const { ref, isSelected, onFocus, onBlur, onKeyDown, onInput } = useInlineEdit(node, 'content')
  return (
    <Tag
      ref={ref as React.RefObject<HTMLHeadingElement>}
      contentEditable={isSelected}
      suppressContentEditableWarning
      onFocus={onFocus} onBlur={onBlur} onKeyDown={onKeyDown} onInput={onInput}
      className={buildClassName(s, ['outline-none', isSelected ? 'cursor-text ring-1 ring-violet-300 ring-inset rounded' : ''].join(' '))}
      style={buildInlineStyle(s, { skipSizing: true })}
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
    >
      {node.props.content as string}
    </Tag>
  )
}

export const HeadingPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = useNodeStyle(node)
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Content">
        <label className="block text-xs text-neutral-500 mb-1">Text</label>
        <input className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400" value={(node.props.content as string) ?? ''} onChange={e => onChange({ content: e.target.value })} />
        <SelectField label="Tag" value={(node.props.tag as string) ?? 'h2'} options={['h1','h2','h3','h4','h5','h6']} onChange={v => onChange({ tag: v })} />
        <p className="text-[10px] text-neutral-400 mt-1">Tip: click the heading on the canvas to edit inline</p>
      </FieldGroup>
      <StylePanel style={s} onChange={partial => patchStyle(node, onChange, partial)} />
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

  // Editor: no explicit width/height override here either — the wrapper
  // already sizes this element via buildBoxSizingStyle, so this element
  // itself should simply fill the wrapper (100%) rather than recompute its
  // own width from s.width.
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
// Same split pattern.

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
        <p className="text-[10px] text-neutral-400 -mt-1">Only visible once this block's container is wider than the button itself</p>
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
// Unaffected — sizes itself off node.props.height directly, never through
// buildInlineStyle at all. Included for completeness (a spacer CAN still
// "fade in" as a block, even though it has no visible content of its own).

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
            mt: next.top as number | undefined, mr: next.right as number | 'auto' | undefined,
            mb: next.bottom as number | undefined, ml: next.left as number | 'auto' | undefined,
          })}
        />
      </FieldGroup>
      <FieldGroup label="Position">
        <AlignField style={s} onChange={partial => patchStyle(node, onChange, partial)} />
        <p className="text-[10px] text-neutral-400 -mt-1">Only has a visible effect if this Divider's width has been resized narrower than its container</p>
      </FieldGroup>
      <AnimationPanel
        value={node.props.animation as AnimationProps}
        onChange={anim => onChange({ animation: anim })}
      />
    </div>
  )
}