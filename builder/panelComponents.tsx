'use client'

import React from 'react'
import { StyleProps, COLOR_PRESETS } from './styleMapper'

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

export function ColorField({
  label, value, onChange,
}: {
  label: string; value?: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <span className="text-xs text-neutral-500 block mb-1">{label}</span>
      <select
        className="w-full border border-neutral-200 rounded text-xs p-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">—</option>
        {COLOR_PRESETS.map(c => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
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
        <ColorField label="Color" value={style.bgColor} onChange={v => onChange({ bgColor: v })} />
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
        <ColorField label="Text color" value={style.textColor} onChange={v => onChange({ textColor: v })} />
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