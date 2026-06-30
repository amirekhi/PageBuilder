'use client'

import React, { useRef, useEffect, useCallback } from 'react'
import { NodeComponentProps, PanelProps, PageNode } from './types'
import { StyleProps, buildClassName, buildInlineStyle } from './styleMapper'
import { FieldGroup, SelectField, SpacingField, CheckField, ColorField, StylePanel } from './panelComponents'
import { useBuilderStore } from './store'

// ─── Helper ───────────────────────────────────────────────────────────────────

function getStyle(node: PageNode): StyleProps {
  return (node.props.style as StyleProps) ?? {}
}

function patchStyle(node: PageNode, onChange: PanelProps['onChange'], partial: Partial<StyleProps>) {
  onChange({ style: { ...getStyle(node), ...partial } })
}

// ─── Inline editable hook ─────────────────────────────────────────────────────
// Returns a ref to attach to a contentEditable element and a blur/input handler.

function useInlineEdit(node: PageNode, prop: string = 'content') {
  const updateProps = useBuilderStore(s => s.updateProps)
  const selectedId  = useBuilderStore(s => s.selectedId)
  const isSelected  = selectedId === node.id
  const ref         = useRef<HTMLElement>(null)
  const isFocused   = useRef(false)

  // Sync external value into DOM only when not focused and value changes
  useEffect(() => {
    if (!ref.current || isFocused.current) return
    const val = (node.props[prop] as string) ?? ''
    if (ref.current.textContent !== val) ref.current.textContent = val
  }, [node.props, prop])

  const onFocus = useCallback(() => {
    isFocused.current = true
  }, [])

  const onBlur = useCallback(() => {
    isFocused.current = false
    if (!ref.current) return
    updateProps(node.id, { [prop]: ref.current.textContent ?? '' })
  }, [node.id, prop, updateProps])

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Prevent delete/backspace from bubbling and triggering node deletion
    e.stopPropagation()
    if (e.key === 'Escape') {
      ref.current?.blur()
    }
    // Enter in single-line mode (heading) → blur
    if (e.key === 'Enter' && !e.shiftKey && node.type === 'heading') {
      e.preventDefault()
      ref.current?.blur()
    }
  }, [node.type])

  const onInput = useCallback(() => {
    // Live update so sidebar textarea stays in sync
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
  return (
    <section
      className={buildClassName(s, 'w-full')}
      style={{ ...buildInlineStyle(s), minHeight: s.minHeight ? undefined : 64 }}
    >
      {children}
    </section>
  )
}

export const SectionPreview: React.FC<NodeComponentProps> = ({ node, children }) => {
  const s = getStyle(node)
  return (
    <section className={buildClassName(s, 'w-full')} style={buildInlineStyle(s)}>
      {children}
    </section>
  )
}

export const SectionPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = getStyle(node)
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Layout">
        <SelectField label="Display"    value={s.display ?? 'flex'} options={['flex','block','grid']} onChange={v => patchStyle(node, onChange, { display: v as StyleProps['display'] })} />
        <SelectField label="Direction"  value={s.flexDir ?? 'col'}  options={['col','row','row-reverse','col-reverse']} onChange={v => patchStyle(node, onChange, { flexDir: v as StyleProps['flexDir'] })} />
        <SelectField label="Justify"    value={s.justify ?? 'start'} options={['start','center','end','between','around','evenly']} onChange={v => patchStyle(node, onChange, { justify: v as StyleProps['justify'] })} />
        <SelectField label="Align"      value={s.align ?? 'start'} options={['start','center','end','stretch']} onChange={v => patchStyle(node, onChange, { align: v as StyleProps['align'] })} />
        <SpacingField label="Gap"       value={s.gap}   onChange={v => patchStyle(node, onChange, { gap: v })} />
      </FieldGroup>
      <FieldGroup label="Spacing">
        <SpacingField label="Padding X" value={s.px}    onChange={v => patchStyle(node, onChange, { px: v })} />
        <SpacingField label="Padding Y" value={s.py}    onChange={v => patchStyle(node, onChange, { py: v })} />
      </FieldGroup>
      <FieldGroup label="Width">
        <SelectField label="Max Width"  value={s.maxWidth as string ?? ''} options={[{label:'—',value:''},'sm','md','lg','xl','2xl','3xl','4xl','5xl','6xl','7xl','full']} onChange={v => patchStyle(node, onChange, { maxWidth: (v || undefined) as StyleProps['maxWidth'] })} />
        <CheckField  label="Center"     value={s.centerContent ?? false} onChange={v => patchStyle(node, onChange, { centerContent: v })} />
      </FieldGroup>
      <FieldGroup label="Background">
        <ColorField label="Color"       value={s.bgColor} onChange={v => patchStyle(node, onChange, { bgColor: v || undefined })} />
      </FieldGroup>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLUMNS
// ═══════════════════════════════════════════════════════════════════════════════

export const ColumnsEditor: React.FC<NodeComponentProps> = ({ node, children }) => {
  const s = getStyle(node)
  return (
    <div
      className={buildClassName(s, 'w-full flex flex-row')}
      style={{ ...buildInlineStyle(s), minHeight: 48 }}
    >
      {children}
    </div>
  )
}

export const ColumnsPreview: React.FC<NodeComponentProps> = ({ node, children }) => {
  const s = getStyle(node)
  return (
    <div className={buildClassName(s, 'w-full flex flex-row')} style={buildInlineStyle(s)}>
      {children}
    </div>
  )
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
  return (
    <div className={buildClassName(s, 'flex-1 min-w-0 min-h-12')} style={buildInlineStyle(s)}>
      {children}
    </div>
  )
}

export const ColumnPreview: React.FC<NodeComponentProps> = ({ node, children }) => {
  const s = getStyle(node)
  return (
    <div className={buildClassName(s, 'flex-1 min-w-0')} style={buildInlineStyle(s)}>
      {children}
    </div>
  )
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
// TEXT  (with inline editing)
// ═══════════════════════════════════════════════════════════════════════════════

export const TextEditor: React.FC<NodeComponentProps> = ({ node }) => {
  const s = getStyle(node)
  const { ref, isSelected, onFocus, onBlur, onKeyDown, onInput } = useInlineEdit(node, 'content')

  return (
    <p
      ref={ref as React.RefObject<HTMLParagraphElement>}
      contentEditable={isSelected}
      suppressContentEditableWarning
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onInput={onInput}
      className={buildClassName(s, [
        'outline-none',
        isSelected ? 'cursor-text ring-1 ring-violet-300 ring-inset rounded' : '',
        !node.props.content && !isSelected ? 'text-neutral-300 italic' : '',
      ].join(' '))}
      style={buildInlineStyle(s)}
      data-placeholder="Click to edit text…"
    >
      {/* Initial text set via useEffect in hook — we render nothing here to avoid hydration mismatch */}
    </p>
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
        <textarea
          className="w-full border border-neutral-200 rounded-md text-sm p-2 resize-y min-h-20 focus:outline-none focus:ring-1 focus:ring-violet-400"
          value={(node.props.content as string) ?? ''}
          onChange={e => onChange({ content: e.target.value })}
        />
        <p className="text-[10px] text-neutral-400 mt-1">Tip: click text on the canvas to edit inline</p>
      </FieldGroup>
      <StylePanel style={s} onChange={partial => patchStyle(node, onChange, partial)} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEADING  (with inline editing)
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
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onInput={onInput}
      className={buildClassName(s, [
        'outline-none',
        isSelected ? 'cursor-text ring-1 ring-violet-300 ring-inset rounded' : '',
      ].join(' '))}
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
        <input
          className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
          value={(node.props.content as string) ?? ''}
          onChange={e => onChange({ content: e.target.value })}
        />
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
  const s = getStyle(node)
  const src = node.props.src as string
  const openMediaPicker = useBuilderStore(st => st.openMediaPicker)
  const updateProps     = useBuilderStore(st => st.updateProps)

  function handleEmptyClick(e: React.MouseEvent) {
    e.stopPropagation()
    openMediaPicker(item => {
      updateProps(node.id, {
        src: item.url,
        alt: item.alt || node.props.alt,
        // Only set a default if this node doesn't already have one (e.g. a
        // template-authored image keeps its intended ratio when replaced)
        style: {
          ...s,
          aspectRatio: s.aspectRatio ?? '4/3',
          objectFit:   s.objectFit ?? 'cover',
        },
      })
    })
  }

  if (!src) return (
    <div
      onClick={handleEmptyClick}
      className={buildClassName(s, 'bg-neutral-100 border-2 border-dashed border-neutral-300 hover:border-violet-300 hover:bg-violet-50/40 flex flex-col items-center justify-center gap-1.5 text-neutral-400 text-sm cursor-pointer transition-colors')}
      style={{ ...buildInlineStyle(s), aspectRatio: s.aspectRatio && s.aspectRatio !== 'auto' ? s.aspectRatio : '16 / 9', minHeight: 128 }}
    >
      <span className="text-xl">🖼️</span>
      <span className="text-xs font-medium">Click to choose an image</span>
    </div>
  )
  const hasFixedWidth = typeof s.width === 'number'

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={(node.props.alt as string) || ''}
      className={buildClassName(s, hasFixedWidth ? 'block' : 'max-w-full block')}
      style={{
        width:  hasFixedWidth ? s.width : '100%',
        height: 'auto',
        ...buildInlineStyle(s),
      }}
    />
  )
}

export const ImagePreview: React.FC<NodeComponentProps> = ({ node }) => {
  const s = getStyle(node)
  const hasFixedWidth = typeof s.width === 'number'
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={node.props.src as string}
      alt={(node.props.alt as string) || ''}
      className={buildClassName(s, hasFixedWidth ? 'block' : 'max-w-full block')}
      style={{
        width:  hasFixedWidth ? s.width : '100%',
        height: 'auto',
        ...buildInlineStyle(s),
      }}
    />
  )
}

export const ImagePanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = getStyle(node)
  const openMediaPicker = useBuilderStore(st => st.openMediaPicker)
  const src = (node.props.src as string) ?? ''

  function handleBrowse() {
    openMediaPicker(item => {
      onChange({
        src: item.url,
        alt: item.alt || node.props.alt,
        style: {
          ...s,
          aspectRatio: s.aspectRatio ?? '4/3',
          objectFit:   s.objectFit ?? 'cover',
        },
      })
    })
  }

  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Source">
        {/* Thumbnail preview + browse button */}
        <button
          onClick={handleBrowse}
          className="w-full rounded-lg border-2 border-dashed border-neutral-200 hover:border-violet-300 hover:bg-violet-50/40 transition-colors overflow-hidden"
          style={{ aspectRatio: '16 / 9' }}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-neutral-400">
              <span className="text-xl">🖼️</span>
              <span className="text-xs font-medium">Browse media library</span>
            </div>
          )}
        </button>
        {src && (
          <button
            onClick={handleBrowse}
            className="w-full mt-2 text-xs font-medium text-violet-600 hover:text-violet-700 py-1.5 rounded-md hover:bg-violet-50 transition-colors"
          >
            Replace image
          </button>
        )}

        <label className="block text-xs text-neutral-500 mt-3 mb-1">URL (or paste a link)</label>
        <input className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400" placeholder="https://…" value={src} onChange={e => onChange({ src: e.target.value })} />
        <label className="block text-xs text-neutral-500 mt-2 mb-1">Alt text</label>
        <input className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400" value={(node.props.alt as string) ?? ''} onChange={e => onChange({ alt: e.target.value })} />
      </FieldGroup>
      <FieldGroup label="Size">
        <SelectField
          label="Width mode"
          value={typeof s.width === 'number' ? 'fixed' : (s.width as string) || 'full'}
          options={[
            { label: 'Fill container', value: 'full' },
            { label: 'Fixed pixels',   value: 'fixed' },
            { label: 'Half',           value: '1/2' },
            { label: 'Third',          value: '1/3' },
            { label: 'Two thirds',     value: '2/3' },
            { label: 'Quarter',        value: '1/4' },
            { label: 'Three quarters', value: '3/4' },
            { label: 'Auto',           value: 'auto' },
          ]}
          onChange={v => {
            if (v === 'fixed') {
              // Switch to a sensible default px value the first time
              patchStyle(node, onChange, { width: typeof s.width === 'number' ? s.width : 320 })
            } else {
              patchStyle(node, onChange, { width: v as StyleProps['width'] })
            }
          }}
        />
        {typeof s.width === 'number' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 w-20 shrink-0">Width (px)</span>
            <input
              type="number"
              min={20}
              max={2000}
              step={10}
              className="flex-1 border border-neutral-200 rounded text-xs p-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
              value={s.width}
              onChange={e => patchStyle(node, onChange, { width: +e.target.value || 0 })}
            />
          </div>
        )}
        <p className="text-[10px] text-neutral-400">
          Fixed pixels keeps this image the same size no matter what container it&apos;s placed in
        </p>
        <SelectField
          label="Aspect ratio"
          value={s.aspectRatio ?? '4/3'}
          options={[
            { label: 'Original',     value: 'auto' },
            { label: 'Square 1:1',   value: '1/1' },
            { label: 'Standard 4:3', value: '4/3' },
            { label: 'Wide 16:9',    value: '16/9' },
            { label: 'Classic 3:2',  value: '3/2' },
            { label: 'Ultra 21:9',   value: '21/9' },
          ]}
          onChange={v => patchStyle(node, onChange, { aspectRatio: v as StyleProps['aspectRatio'] })}
        />
        <SelectField
          label="Fit"
          value={s.objectFit ?? 'cover'}
          options={[
            { label: 'Cover (fill & crop)',   value: 'cover' },
            { label: 'Contain (fit inside)',  value: 'contain' },
            { label: 'Fill (stretch)',        value: 'fill' },
            { label: 'None (original size)',  value: 'none' },
          ]}
          onChange={v => patchStyle(node, onChange, { objectFit: v as StyleProps['objectFit'] })}
        />
        {s.objectFit !== 'fill' && (
          <SelectField
            label="Focal point"
            value={s.objectPosition ?? 'center'}
            options={['center','top','bottom','left','right','top left','top right','bottom left','bottom right']}
            onChange={v => patchStyle(node, onChange, { objectPosition: v as StyleProps['objectPosition'] })}
          />
        )}
        <SelectField label="Rounded" value={s.rounded ?? 'none'} options={['none','sm','md','lg','xl','2xl','full']} onChange={v => patchStyle(node, onChange, { rounded: v as StyleProps['rounded'] })} />
      </FieldGroup>
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

function ButtonRender({ node }: { node: PageNode }) {
  const variant  = (node.props.variant as string) || 'solid'
  const varClass = VARIANTS[variant] ?? VARIANTS.solid
  return (
    <button className={`inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-medium transition-colors text-sm ${varClass}`}>
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
  <div
    style={{ height: (node.props.height as number) ?? 40 }}
    className="w-full bg-violet-50 border border-dashed border-violet-200 flex items-center justify-center text-violet-300 text-xs select-none"
  >
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