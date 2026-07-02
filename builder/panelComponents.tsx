'use client'

import React from 'react'
import { StyleProps, COLOR_PRESETS, GRADIENT_PRESETS, resolveColor } from './styleMapper'

// ─── Section wrapper ──────────────────────────────────────────────────────────

export function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-2 px-1">{label}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

// ─── Generic select ───────────────────────────────────────────────────────────

type SelectOption = string | { label: string; value: string }

export function SelectField({
  label, value, options, onChange,
}: {
  label: string
  value: string
  options: SelectOption[]
  onChange: (v: string) => void
}) {
  const opts = options.map(o => typeof o === 'string' ? { label: o, value: o } : o)
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-neutral-500 w-20 shrink-0">{label}</span>
      <select
        className="flex-1 border border-neutral-200 rounded text-xs p-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {opts.map(o => <option key={o.value} value={o.value}>{o.label || '—'}</option>)}
      </select>
    </div>
  )
}

// ─── Spacing slider ───────────────────────────────────────────────────────────
// Values map to multiples of 4px. Scale: 0,1,2,3,4,5,6,8,10,12,16,20,24,32,40,48,64

const SCALE = [0,1,2,3,4,5,6,8,10,12,16,20,24,32,40,48,64]

export function SpacingField({
  label, value, onChange,
}: {
  label: string
  value?: number
  onChange: (v: number) => void
}) {
  const idx = SCALE.indexOf(value ?? 0)
  const safeIdx = idx < 0 ? 0 : idx
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-neutral-500 w-20 shrink-0">{label}</span>
      <input
        type="range" min={0} max={SCALE.length - 1} step={1} value={safeIdx}
        className="flex-1 accent-violet-600"
        onChange={e => onChange(SCALE[+e.target.value])}
      />
      <span className="text-xs text-neutral-400 w-6 text-right">{value ?? 0}</span>
    </div>
  )
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────

export function CheckField({
  label, value, onChange,
}: {
  label: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox" checked={value}
        onChange={e => onChange(e.target.checked)}
        className="accent-violet-600"
      />
      <span className="text-xs text-neutral-500">{label}</span>
    </label>
  )
}

// ─── Color picker ─────────────────────────────────────────────────────────────
// Real hex color picker: a native <input type="color"> swatch synced with a
// free-typed hex text field, plus quick-pick preset swatches below. Accepts
// (and displays correctly) either a raw hex string or one of the legacy
// COLOR_PRESETS keys (e.g. 'violet-500') via resolveColor, so existing saved
// pages keep working. Any value typed or picked going forward is a plain hex
// string, so users are no longer limited to the fixed preset list.

const HEX_RE = /^#[0-9a-fA-F]{6}$/

export function ColorField({
  label, value, onChange,
}: {
  label: string; value?: string; onChange: (v: string) => void
}) {
  const resolved   = resolveColor(value)
  const swatchHex  = resolved && HEX_RE.test(resolved) ? resolved : '#ffffff'
  const isTransparent = value === 'transparent'

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-neutral-500">{label}</span>
        {value && (
          <button
            onClick={() => onChange('')}
            className="text-[10px] font-medium text-neutral-400 hover:text-red-500 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="color"
          value={swatchHex}
          onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded-md border border-neutral-200 cursor-pointer p-0 bg-transparent shrink-0"
          title="Pick a color"
        />
        <input
          type="text"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder="#ffffff or transparent"
          spellCheck={false}
          className="flex-1 border border-neutral-200 rounded-md text-xs p-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-violet-400"
        />
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2">
        {COLOR_PRESETS.filter(c => c.value !== 'transparent').map(c => (
          <button
            key={c.value}
            onClick={() => onChange(c.value)}
            title={c.label}
            className={[
              'w-5 h-5 rounded-full border transition-transform hover:scale-110',
              value === c.value ? 'ring-2 ring-offset-1 ring-violet-500 border-transparent' : 'border-neutral-200',
            ].join(' ')}
            style={{ backgroundColor: resolveColor(c.value) }}
          />
        ))}
        <button
          onClick={() => onChange('transparent')}
          title="Transparent"
          className={[
            'w-5 h-5 rounded-full border bg-[conic-gradient(#e5e5e5_90deg,white_90deg_180deg,#e5e5e5_180deg_270deg,white_270deg)] bg-[length:6px_6px] transition-transform hover:scale-110',
            isTransparent ? 'ring-2 ring-offset-1 ring-violet-500 border-transparent' : 'border-neutral-200',
          ].join(' ')}
        />
      </div>
    </div>
  )
}

// ─── Gradient picker ──────────────────────────────────────────────────────────
// Builds a real `linear-gradient(direction, from, to)` CSS string from two
// color pickers + a direction dropdown, with a live preview and quick-pick
// presets. Parses an incoming value back into its parts so editing an
// existing (or preset) gradient continues to work.

const GRADIENT_DIRECTIONS: { label: string; value: string }[] = [
  { label: '→ Left to right', value: 'to right' },
  { label: '← Right to left', value: 'to left' },
  { label: '↓ Top to bottom', value: 'to bottom' },
  { label: '↑ Bottom to top', value: 'to top' },
  { label: '↘ Diagonal',      value: 'to bottom right' },
  { label: '↙ Diagonal',      value: 'to bottom left' },
  { label: '↗ Diagonal',      value: 'to top right' },
  { label: '↖ Diagonal',      value: 'to top left' },
]

interface ParsedGradient { direction: string; from: string; to: string }

function parseGradient(css?: string): ParsedGradient | null {
  if (!css) return null
  const m = css.match(/^linear-gradient\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^,]+?)\s*\)$/i)
  if (!m) return null
  return { direction: m[1].trim(), from: m[2].trim(), to: m[3].trim() }
}

const DEFAULT_GRADIENT: ParsedGradient = { direction: 'to right', from: '#7c3aed', to: '#4f46e5' }

export function GradientField({
  value, onChange,
}: {
  value?: string
  onChange: (v: string) => void
}) {
  const parsed = parseGradient(value) ?? DEFAULT_GRADIENT

  function build(partial: Partial<ParsedGradient>) {
    const next = { ...parsed, ...partial }
    onChange(`linear-gradient(${next.direction}, ${next.from}, ${next.to})`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-neutral-500">Gradient</span>
        {value && (
          <button
            onClick={() => onChange('')}
            className="text-[10px] font-medium text-neutral-400 hover:text-red-500 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Live preview */}
      <div
        className="w-full h-10 rounded-md border border-neutral-200 mb-2"
        style={value ? { backgroundImage: value } : { backgroundColor: '#f5f5f5' }}
      />

      <div className="flex items-center gap-2 mb-1.5">
        <input
          type="color"
          value={HEX_RE.test(parsed.from) ? parsed.from : '#7c3aed'}
          onChange={e => build({ from: e.target.value })}
          className="w-8 h-8 rounded-md border border-neutral-200 cursor-pointer p-0 bg-transparent shrink-0"
          title="Start color"
        />
        <span className="text-xs text-neutral-400 shrink-0">→</span>
        <input
          type="color"
          value={HEX_RE.test(parsed.to) ? parsed.to : '#4f46e5'}
          onChange={e => build({ to: e.target.value })}
          className="w-8 h-8 rounded-md border border-neutral-200 cursor-pointer p-0 bg-transparent shrink-0"
          title="End color"
        />
        <select
          value={parsed.direction}
          onChange={e => build({ direction: e.target.value })}
          className="flex-1 border border-neutral-200 rounded text-xs p-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
        >
          {GRADIENT_DIRECTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {GRADIENT_PRESETS.filter(g => g.value).map(g => (
          <button
            key={g.value}
            onClick={() => onChange(g.value)}
            title={g.label}
            className={[
              'w-7 h-7 rounded-md border transition-transform hover:scale-110',
              value === g.value ? 'ring-2 ring-offset-1 ring-violet-500 border-transparent' : 'border-neutral-200',
            ].join(' ')}
            style={{ backgroundImage: g.value }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Shared StylePanel (spacing + color + typography) ─────────────────────────
// Used as the "Style" tab in ControlPanel for all node types.
// Includes image fit/aspect-ratio controls so the Style tab works for Image
// blocks too — previously only the Content tab's ImagePanel had these, which
// made the Style tab look "broken" (missing fields) whenever an image was selected.

export function StylePanel({
  style, onChange,
}: {
  style: StyleProps
  onChange: (partial: Partial<StyleProps>) => void
}) {
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Spacing">
        <SpacingField label="Padding X" value={style.px} onChange={v => onChange({ px: v })} />
        <SpacingField label="Padding Y" value={style.py} onChange={v => onChange({ py: v })} />
        <SpacingField label="Gap"       value={style.gap} onChange={v => onChange({ gap: v })} />
      </FieldGroup>

      <FieldGroup label="Background">
        <ColorField label="Color" value={style.bgColor} onChange={v => onChange({ bgColor: v || undefined })} />
      </FieldGroup>

      <FieldGroup label="Typography">
        <SelectField
          label="Size" value={style.fontSize ?? ''}
          options={[{label:'—',value:''}, 'xs','sm','base','lg','xl','2xl','3xl','4xl','5xl','6xl']}
          onChange={v => onChange({ fontSize: v as StyleProps['fontSize'] || undefined })}
        />
        <SelectField
          label="Weight" value={style.fontWeight ?? ''}
          options={[{label:'—',value:''}, 'light','normal','medium','semibold','bold','extrabold']}
          onChange={v => onChange({ fontWeight: v as StyleProps['fontWeight'] || undefined })}
        />
        <SelectField
          label="Align" value={style.textAlign ?? ''}
          options={[{label:'—',value:''}, 'left','center','right','justify']}
          onChange={v => onChange({ textAlign: v as StyleProps['textAlign'] || undefined })}
        />
        <ColorField label="Text color" value={style.textColor} onChange={v => onChange({ textColor: v || undefined })} />
      </FieldGroup>

      <FieldGroup label="Image fit">
        <SelectField
          label="Aspect ratio" value={style.aspectRatio ?? 'auto'}
          options={[
            { label: 'Original',     value: 'auto' },
            { label: 'Square 1:1',   value: '1/1' },
            { label: 'Standard 4:3', value: '4/3' },
            { label: 'Wide 16:9',    value: '16/9' },
            { label: 'Classic 3:2',  value: '3/2' },
            { label: 'Ultra 21:9',   value: '21/9' },
          ]}
          onChange={v => onChange({ aspectRatio: v as StyleProps['aspectRatio'] })}
        />
        <SelectField
          label="Fit" value={style.objectFit ?? 'cover'}
          options={[
            { label: 'Cover (fill & crop)',  value: 'cover' },
            { label: 'Contain (fit inside)', value: 'contain' },
            { label: 'Fill (stretch)',       value: 'fill' },
            { label: 'None (original)',      value: 'none' },
          ]}
          onChange={v => onChange({ objectFit: v as StyleProps['objectFit'] })}
        />
        <SelectField
          label="Focal point" value={style.objectPosition ?? 'center'}
          options={['center','top','bottom','left','right','top left','top right','bottom left','bottom right']}
          onChange={v => onChange({ objectPosition: v as StyleProps['objectPosition'] })}
        />
        <p className="text-[10px] text-neutral-400 -mt-1">Only applies to Image blocks</p>
      </FieldGroup>

      <FieldGroup label="Border">
        <SelectField
          label="Radius" value={style.rounded ?? 'none'}
          options={['none','sm','md','lg','xl','2xl','full']}
          onChange={v => onChange({ rounded: v as StyleProps['rounded'] })}
        />
      </FieldGroup>

      <FieldGroup label="Shadow">
        <SelectField
          label="Shadow" value={style.shadow ?? 'none'}
          options={['none','sm','md','lg','xl','2xl']}
          onChange={v => onChange({ shadow: v as StyleProps['shadow'] })}
        />
      </FieldGroup>
    </div>
  )
}