'use client'
import React, { useState } from 'react'

import { StyleProps, COLOR_PRESETS, GRADIENT_PRESETS, resolveColor, BoxAlign, getBoxAlign, setBoxAlign } from './styleMapper'

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

// ─── Box spacing (Elementor-style linked 4-side padding/margin) ───────────
// Four independent px inputs (top/right/bottom/left) with a link toggle:
// locked (default when all sides already match) means editing any one side
// sets all four together; unlocked lets each side vary independently.
// Values are stored in the same "unit × 4 = px" scale as px/py/mx/my (see
// buildInlineStyle) — this component just shows/accepts real pixels and
// converts, so the UI feels direct while staying compatible with the
// existing shorthand properties. This is the ONE spacing control used by
// every panel now — SpacingField (below) is only for non-4-sided values
// like Gap, which has no "sides" to speak of.

type SideValue = number | 'auto' | undefined
export interface BoxSides { top?: SideValue; right?: SideValue; bottom?: SideValue; left?: SideValue }

export function BoxSpacingField({
  label, values, onChange,
}: {
  label: string
  values: BoxSides
  onChange: (next: BoxSides) => void
}) {
  const nums = [values.top, values.right, values.bottom, values.left]
  const [linked, setLinked] = useState(nums.every(v => v === nums[0]) && nums[0] !== undefined)

  function setSide(side: keyof BoxSides, raw: string) {
    if (raw === '') {
      onChange(linked ? { top: undefined, right: undefined, bottom: undefined, left: undefined } : { ...values, [side]: undefined })
      return
    }
    const px   = Math.max(0, Math.min(400, Math.round(+raw) || 0))
    const unit = Math.round(px / 4)
    onChange(linked ? { top: unit, right: unit, bottom: unit, left: unit } : { ...values, [side]: unit })
  }

  const display = (v: SideValue) => (v === undefined || v === 'auto') ? '' : String(v * 4)
  const placeholderFor = (v: SideValue) => (v === 'auto' ? 'auto' : '0')

  const SIDES: [keyof BoxSides, string][] = [
    ['top', 'Top'], ['right', 'Right'], ['bottom', 'Bottom'], ['left', 'Left'],
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-neutral-500">{label} (px)</span>
        <button
          type="button"
          title={linked ? 'Sides linked — click to edit independently' : 'Sides independent — click to link'}
          onClick={() => setLinked(v => !v)}
          className={[
            'w-6 h-6 flex items-center justify-center rounded text-sm transition-colors',
            linked ? 'bg-violet-100 text-violet-600' : 'text-neutral-400 hover:bg-neutral-100 border border-neutral-200',
          ].join(' ')}
        >
          {linked ? '🔗' : '⛓'}
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {SIDES.map(([side, sideLabel]) => (
          <div key={side} className="flex flex-col items-center gap-0.5">
            <input
              type="number" min={0} max={400} step={2}
              placeholder={placeholderFor(values[side])}
              value={display(values[side])}
              onChange={e => setSide(side, e.target.value)}
              className="w-full border border-neutral-200 rounded text-xs p-1.5 text-center focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
            <span className="text-[9px] text-neutral-400">{sideLabel}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Spacing slider ───────────────────────────────────────────────────────────
// Values map to multiples of 4px. Only used for Gap now (no "sides" exist for
// a gap value) — every padding/margin control uses BoxSpacingField instead.

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

// ─── Box position (left / center / right) ──────────────────────────────────
// Backed by ml/mr margins (see styleMapper's getBoxAlign/setBoxAlign), so
// this is the one place that ever writes alignment — the wrapper in
// SelectableShell and the node's own rendered element both read it from the
// same ml/mr values, so they can't fall out of sync the way the old
// class-only `centerContent` did.
//
// NOTE ON NAMING: there are three unrelated things in this app that all
// involve the word "align" —
//   1. This control (AlignField): where THIS block sits within its parent
//      when it's narrower than the parent (Left/Center/Right via margin).
//   2. Flex "align items" (SectionPanel/ColumnsPanel "Align children" or
//      "Align items"): how a container lines up its CHILDREN on the
//      cross-axis. Different mechanism (CSS align-items, not margin).
//   3. Text align (StylePanel "Text align"): how text sits INSIDE this
//      block. Different mechanism again (CSS text-align).
// Always labeled distinctly in the panels below — if you're renaming
// labels, keep these three visually distinguishable from each other.

export function AlignField({
  style, onChange,
}: {
  style: StyleProps
  onChange: (partial: Partial<StyleProps>) => void
}) {
  const current = getBoxAlign(style)
  const OPTIONS: { v: BoxAlign; icon: string; title: string }[] = [
    { v: 'left',   icon: '⇤', title: 'Align left' },
    { v: 'center', icon: '↔', title: 'Center' },
    { v: 'right',  icon: '⇥', title: 'Align right' },
  ]
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-neutral-500 w-20 shrink-0">Position</span>
      <div className="flex-1 flex rounded-md border border-neutral-200 overflow-hidden">
        {OPTIONS.map(o => (
          <button
            key={o.v}
            title={o.title}
            onClick={() => onChange(setBoxAlign(o.v))}
            className={[
              'flex-1 py-1 text-xs transition-colors',
              current === o.v ? 'bg-violet-600 text-white' : 'bg-white text-neutral-500 hover:bg-neutral-50',
            ].join(' ')}
          >
            {o.icon}
          </button>
        ))}
      </div>
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
// Used as the "Style" tab in ControlPanel for all node types that don't need
// a fully custom panel. Includes image fit/aspect-ratio controls so the
// Style tab works for Image blocks too.

export function StylePanel({
  style, onChange,
}: {
  style: StyleProps
  onChange: (partial: Partial<StyleProps>) => void
}) {
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Position">
        <AlignField style={style} onChange={onChange} />
        <p className="text-[10px] text-neutral-400 -mt-1">Only visible once this block's width is narrower than its container</p>
      </FieldGroup>

      <FieldGroup label="Padding">
        <BoxSpacingField
          label="Padding"
          values={{
            top: style.pt ?? style.py, right: style.pr ?? style.px,
            bottom: style.pb ?? style.py, left: style.pl ?? style.px,
          }}
          onChange={next => onChange({
            pt: next.top as number | undefined, pr: next.right as number | undefined,
            pb: next.bottom as number | undefined, pl: next.left as number | undefined,
          })}
        />
        <SpacingField label="Gap" value={style.gap} onChange={v => onChange({ gap: v })} />
      </FieldGroup>

      <FieldGroup label="Margin">
        <BoxSpacingField
          label="Margin"
          values={{
            top: style.mt ?? style.my, right: style.mr ?? style.mx,
            bottom: style.mb ?? style.my, left: style.ml ?? style.mx,
          }}
          onChange={next => onChange({
            mt: next.top as number | undefined, mr: next.right as number | 'auto' | undefined,
            mb: next.bottom as number | undefined, ml: next.left as number | 'auto' | undefined,
          })}
        />
        <p className="text-[10px] text-neutral-400 -mt-1">
          Left/Right margin is overridden by the Position control above whenever it's set to Center or Right
        </p>
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
          label="Text align" value={style.textAlign ?? ''}
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