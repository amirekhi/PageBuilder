'use client'
import React, { useState , useEffect } from 'react'

import { StyleProps, COLOR_PRESETS, GRADIENT_PRESETS, resolveColor, BoxAlign, BoxAlignY, getBoxAlign, setBoxAlign, getBoxAlignY, setBoxAlignY, isGlobalColorRef, globalColorRefId, makeGlobalColorRef } from './styleMapper'
import { AnimationProps, ANIMATION_EFFECTS, DEFAULT_ANIMATION, AnimationStyleSheet, EFFECT_KEYFRAME } from './animations'
import type { HoverStyleProps } from './customCss'
import type { PageNode } from './types'
import { useNodeAnimation, patchNodeAnimation, hasAnimationOverrideAt, clearNodeAnimationOverride } from './responsive'
import { useBuilderStore, PREVIEW_WIDTHS } from './store'

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
  label, value, options, onChange, after,
}: {
  label: string
  value: string
  options: SelectOption[]
  onChange: (v: string) => void
  // Optional trailing slot, rendered after the <select> itself — used by
  // StylePanel to attach a per-field "H" hover toggle to fields like
  // Shadow, without every other caller of SelectField needing to care.
  after?: React.ReactNode
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
      {after}
    </div>
  )
}

// ─── Box spacing (Elementor-style linked 4-side padding/margin) ───────────

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
              type="number" min={0} max={400} step={4}
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

// ─── Box position (horizontal AND vertical self-positioning) ──────────────

export function AlignField({
  style, onChange, axis = 'both',
}: {
  style: StyleProps
  onChange: (partial: Partial<StyleProps>) => void
  axis?: 'x' | 'y' | 'both'
}) {
  const currentX = getBoxAlign(style)
  const currentY = getBoxAlignY(style)

  const X_OPTIONS: { v: BoxAlign; icon: string; title: string }[] = [
    { v: 'none',   icon: '·', title: "No override — follow the parent's Justify/Align" },
    { v: 'left',   icon: '⇤', title: 'Pin left' },
    { v: 'center', icon: '↔', title: 'Center horizontally' },
    { v: 'right',  icon: '⇥', title: 'Pin right' },
  ]
  const Y_OPTIONS: { v: BoxAlignY; icon: string; title: string }[] = [
    { v: 'none',   icon: '·', title: "No override — follow the parent's Justify/Align" },
    { v: 'top',    icon: '⇡', title: 'Pin top' },
    { v: 'middle', icon: '↕', title: 'Center vertically' },
    { v: 'bottom', icon: '⇣', title: 'Pin bottom' },
  ]

  return (
    <div className="space-y-2">
      {(axis === 'both' || axis === 'x') && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 w-20 shrink-0">Horizontal</span>
          <div className="flex-1 flex rounded-md border border-neutral-200 overflow-hidden">
            {X_OPTIONS.map(o => (
              <button
                key={o.v}
                title={o.title}
                onClick={() => onChange(setBoxAlign(o.v))}
                className={[
                  'flex-1 py-1 text-xs transition-colors',
                  currentX === o.v ? 'bg-violet-600 text-white' : 'bg-white text-neutral-500 hover:bg-neutral-50',
                ].join(' ')}
              >
                {o.icon}
              </button>
            ))}
          </div>
        </div>
      )}
      {(axis === 'both' || axis === 'y') && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 w-20 shrink-0">Vertical</span>
          <div className="flex-1 flex rounded-md border border-neutral-200 overflow-hidden">
            {Y_OPTIONS.map(o => (
              <button
                key={o.v}
                title={o.title}
                onClick={() => onChange(setBoxAlignY(o.v))}
                className={[
                  'flex-1 py-1 text-xs transition-colors',
                  currentY === o.v ? 'bg-violet-600 text-white' : 'bg-white text-neutral-500 hover:bg-neutral-50',
                ].join(' ')}
              >
                {o.icon}
              </button>
            ))}
          </div>
        </div>
      )}
      {axis === 'both' && (
        <p className="text-[10px] text-neutral-400">
          Pinning an item here overrides its parent's Justify/Align for THIS item specifically (like CSS align-self). Pick "·" to let the parent's own layout control it instead — useful when you want the container's Justify/Align to actually apply.
        </p>
      )}
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
  label, value, onChange, hoverAdornment,
}: {
  label: string
  value?: string
  onChange: (v: string) => void
  // Optional slot next to the "Clear" button — used by StylePanel to attach
  // a per-field "H" hover toggle. Kept optional so every other existing
  // caller of ColorField (Section background, Column background, Divider
  // color, Quote/Avatar, Gradient swatches, etc.) needs zero changes.
  hoverAdornment?: React.ReactNode
}) {
  // Live subscription (not the module-cache resolveColor uses internally
  // for rendering — see styleMapper.ts) so this panel's OWN swatch preview
  // and "which global is this bound to" lookup are always exactly in sync
  // with the Theme tab, with no dependency on which render root happened to
  // refresh the cache last.
  const globalColors = useBuilderStore(s => s.globalColors)
  const isGlobal     = isGlobalColorRef(value)
  const boundGlobal  = isGlobal ? globalColors.find(c => c.id === globalColorRefId(value!)) : undefined

  const resolved   = isGlobal ? boundGlobal?.value : resolveColor(value)
  const swatchHex  = resolved && HEX_RE.test(resolved) ? resolved : '#ffffff'
  const isTransparent = value === 'transparent'

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-neutral-500">{label}</span>
        <div className="flex items-center gap-2">
          {value && (
            <button
              onClick={() => onChange('')}
              className="text-[10px] font-medium text-neutral-400 hover:text-red-500 transition-colors"
            >
              Clear
            </button>
          )}
          {hoverAdornment}
        </div>
      </div>

      {isGlobal ? (
        // Bound to a global color — show a readable chip instead of a raw
        // "global:xyz" id in a text box, plus a way back out. Unlink
        // freezes the CURRENT resolved hex as a literal value, so the
        // block's appearance doesn't change the instant you unlink it —
        // only future palette edits stop reaching it.
        <div className="flex items-center gap-2 border border-violet-200 bg-violet-50 rounded-md px-2 py-1.5">
          <span
            className="w-5 h-5 rounded-full border border-white shadow shrink-0"
            style={{ backgroundColor: swatchHex }}
          />
          <span className="flex-1 text-xs font-medium text-violet-700 truncate">
            🔗 {boundGlobal?.name ?? 'Deleted global color'}
          </span>
          <button
            onClick={() => onChange(swatchHex)}
            className="text-[10px] font-medium text-violet-500 hover:text-violet-700 transition-colors shrink-0"
            title="Detach from the global color — keeps this exact color as a fixed, one-off value"
          >
            Unlink
          </button>
        </div>
      ) : (
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
      )}

      {globalColors.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="text-[9px] text-neutral-400 mr-0.5">Global:</span>
          {globalColors.map(c => (
            <button
              key={c.id}
              onClick={() => onChange(makeGlobalColorRef(c.id))}
              title={`${c.name} (global — stays linked)`}
              className={[
                'w-5 h-5 rounded-full transition-transform hover:scale-110',
                isGlobal && boundGlobal?.id === c.id
                  ? 'ring-2 ring-offset-1 ring-violet-600'
                  : 'ring-1 ring-offset-1 ring-violet-200',
              ].join(' ')}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mt-2">
        {COLOR_PRESETS.filter(c => c.value !== 'transparent').map(c => (
          <button
            key={c.value}
            onClick={() => onChange(c.value)}
            title={c.label}
            className={[
              'w-5 h-5 rounded-full border transition-transform hover:scale-110',
              !isGlobal && value === c.value ? 'ring-2 ring-offset-1 ring-violet-500 border-transparent' : 'border-neutral-200',
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
  value, onChange, label = 'Gradient', hoverAdornment,
}: {
  value?: string
  onChange: (v: string) => void
  label?: string
  // Optional slot next to the "Clear" button — used by StylePanel/
  // SectionPanel/ColumnPanel to attach a per-field "H" hover toggle, same
  // pattern as ColorField.
  hoverAdornment?: React.ReactNode
}) {
  const parsed = parseGradient(value) ?? DEFAULT_GRADIENT

  function build(partial: Partial<ParsedGradient>) {
    const next = { ...parsed, ...partial }
    onChange(`linear-gradient(${next.direction}, ${next.from}, ${next.to})`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-neutral-500">{label}</span>
        <div className="flex items-center gap-2">
          {value && (
            <button
              onClick={() => onChange('')}
              className="text-[10px] font-medium text-neutral-400 hover:text-red-500 transition-colors"
            >
              Clear
            </button>
          )}
          {hoverAdornment}
        </div>
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

// ─── Per-field hover toggle ─────────────────────────────────────────────────
// The small "H" pill that sits next to a single field (Background color,
// Text color, Border color, Opacity, Shadow). Clicking it toggles ONLY that
// field between reading/writing the base (Normal) style and the hover
// style — every other field in the panel keeps whatever mode it was
// already showing. This replaces the old panel-wide Normal/Hover switch:
// that older version flipped every dual-mode field at once, which meant you
// couldn't set a hover background while leaving text color on Normal.
export function HoverToggle({
  active, hasValue, onToggle,
}: {
  active: boolean
  hasValue: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={
        active
          ? 'Editing the hover value — click to go back to the normal value'
          : hasValue
            ? 'A hover value is set here — click to edit it'
            : 'Click to set a different value for when the mouse hovers over this block'
      }
      className={[
        'shrink-0 w-5 h-5 flex items-center justify-center rounded text-[9px] font-bold transition-colors',
        active
          ? 'bg-violet-600 text-white'
          : hasValue
            ? 'bg-violet-100 text-violet-600'
            : 'text-neutral-300 border border-neutral-200 hover:bg-neutral-100 hover:text-neutral-500',
      ].join(' ')}
    >
      H
    </button>
  )
}

// ─── Shared StylePanel (spacing + color + typography) ─────────────────────────
// When enableHover is true, each of the 5 hover-capable fields (Background
// color, Text color, Border color, Opacity, Shadow) gets its own "H"
// toggle button. Clicking a field's toggle switches JUST that field to
// read/write node.props.styleHover (via hoverValue/onHoverChange) instead
// of the base style — independently of every other field. Layout/sizing/
// typography-size/weight/align/border-radius are NEVER hover-aware (hover
// effects that change layout cause visible jank) — those always read/write
// the base style regardless of any toggle state.

// ─── Typography preset picker (one-shot apply, not a live link) ───────────
// Sits inside StylePanel's Typography group. Deliberately a plain SelectField
// whose displayed value always snaps back to '' after applying — this is a
// trigger disguised as a dropdown, not a persistent selection, since there's
// nothing on the node itself that remembers "this came from preset X" (see
// GlobalTypographyStyle's doc comment in store.ts for why that's a
// deliberate scope choice, not an oversight). If no typography presets have
// been created yet (Theme tab), this renders nothing rather than an empty,
// useless dropdown.
function TypographyPresetPicker({
  onApply,
}: {
  onApply: (partial: Partial<StyleProps>) => void
}) {
  const presets = useBuilderStore(s => s.globalTypography)
  if (!presets.length) return null

  return (
    <div>
      <SelectField
        label="Preset"
        value=""
        options={[
          { label: 'Apply a saved style…', value: '' },
          ...presets.map(p => ({ label: p.name, value: p.id })),
        ]}
        onChange={id => {
          const preset = presets.find(p => p.id === id)
          if (!preset) return
          onApply({
            fontSize:   preset.fontSize,
            fontWeight: preset.fontWeight,
            leading:    preset.leading,
            textAlign:  preset.textAlign,
          })
        }}
      />
      <p className="text-[9px] text-neutral-400 mt-0.5">
        Copies that style's values onto this block once — editing the preset later in the Theme tab won't retroactively change blocks that already used it.
      </p>
    </div>
  )
}

export function StylePanel({
  style, onChange, hideBoxModel = false, hideBackground = false, hideSize = false, hideWidth = false, isContainer = false,
  enableHover = false, hoverValue, onHoverChange, breakpointLabel = 'this breakpoint',
}: {
  style: StyleProps
  onChange: (partial: Partial<StyleProps>) => void
  hideBoxModel?: boolean
  hideBackground?: boolean
  hideSize?: boolean
  hideWidth?: boolean
  isContainer?: boolean
  // Whether this node type gets the per-field hover toggles at all. Pass
  // true for every node type that should support hover — currently every
  // caller in ControlPanel.tsx passes true unconditionally, but the flag is
  // kept so a node type can be opted out later without touching this file.
  enableHover?: boolean
  hoverValue?: HoverStyleProps
  onHoverChange?: (next: HoverStyleProps) => void
  // Label for whichever breakpoint is currently being edited (e.g.
  // "Mobile"), shown in the Visibility checkbox's caption so it's clear
  // hiding only applies there — not globally. Purely cosmetic; the actual
  // per-breakpoint write happens automatically because `onChange` here is
  // already wired by the caller (ControlPanel) to write into whichever
  // breakpoint bucket is active (see patchNodeStyle in responsive.ts) —
  // this component doesn't need to know which one that is to behave
  // correctly, only to word the caption accurately.
  breakpointLabel?: string
}) {
  // Which of the 5 hover-capable fields is currently in "hover-edit" mode.
  // Independent per field — e.g. Background can be on hover while Text
  // color stays on Normal. Callers should pass a `key={node.id}` down to
  // this component so this resets when a different block is selected,
  // rather than bleeding over from whatever was open on the last one.
  const [hoverEdit, setHoverEdit] = useState<Partial<Record<keyof HoverStyleProps, boolean>>>({})
  const toggleHover = (field: keyof HoverStyleProps) =>
    setHoverEdit(prev => ({ ...prev, [field]: !prev[field] }))

  const hover = hoverValue ?? {}
  function patchHover(partial: Partial<HoverStyleProps>) {
    onHoverChange?.({ ...hover, ...partial })
  }

  const bgIsHover = enableHover && !!hoverEdit.bgColor
  const bgColorValue = bgIsHover ? hover.bgColor : style.bgColor
  const setBgColor = (v: string) =>
    bgIsHover ? patchHover({ bgColor: v || undefined }) : onChange({ bgColor: v || undefined })

  const gradientIsHover = enableHover && !!hoverEdit.bgGradient
  const gradientValue = gradientIsHover ? hover.bgGradient : style.bgGradient
  const setGradient = (v: string) =>
    gradientIsHover ? patchHover({ bgGradient: v || undefined }) : onChange({ bgGradient: v || undefined })

  const textIsHover = enableHover && !!hoverEdit.textColor
  const textColorValue = textIsHover ? hover.textColor : style.textColor
  const setTextColor = (v: string) =>
    textIsHover ? patchHover({ textColor: v || undefined }) : onChange({ textColor: v || undefined })

  const borderIsHover = enableHover && !!hoverEdit.borderColor
  const borderColorValue = borderIsHover ? hover.borderColor : style.borderColor
  const setBorderColor = (v: string) =>
    borderIsHover ? patchHover({ borderColor: v || undefined }) : onChange({ borderColor: v || undefined })

  const opacityIsHover = enableHover && !!hoverEdit.opacity
  const opacityValue = opacityIsHover ? (hover.opacity ?? 100) : (style.opacity ?? 100)
  const setOpacity = (v: number) =>
    opacityIsHover ? patchHover({ opacity: v }) : onChange({ opacity: v })

  const shadowIsHover = enableHover && !!hoverEdit.shadow
  const shadowValue = shadowIsHover ? (hover.shadow ?? 'none') : (style.shadow ?? 'none')
  const setShadow = (v: string) =>
    shadowIsHover
      ? patchHover({ shadow: v as HoverStyleProps['shadow'] })
      : onChange({ shadow: v as StyleProps['shadow'] })

  return (
    <div className="space-y-5 p-4">
      <FieldGroup label="Visibility">
        <CheckField
          label={`Hide on ${breakpointLabel}`}
          value={!!style.hidden}
          onChange={checked => onChange({ hidden: checked ? true : undefined })}
        />
        <p className="text-[10px] text-neutral-400 -mt-1">
          Only hides this block while viewing/editing at {breakpointLabel} — it stays visible at every other breakpoint unless hidden there too.
        </p>
      </FieldGroup>

      {!hideBoxModel && (
        <FieldGroup label="Position">
          <AlignField style={style} onChange={onChange} />
          <p className="text-[10px] text-neutral-400 -mt-1">Only visible once this block's width/height is smaller than its container</p>
        </FieldGroup>
      )}

      {!hideSize && (
        <FieldGroup label="Size">
          {!hideWidth && (
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500 w-20 shrink-0">Width</span>
                <input
                  type="range" min={5} max={100} step={1}
                  className="flex-1 accent-violet-600"
                  value={typeof style.width === 'number' && style.widthUnit === '%' ? style.width : 100}
                  onChange={e => onChange({ width: +e.target.value, widthUnit: '%' })}
                />
                <span className="text-xs text-neutral-400 w-10 text-right tabular-nums">
                  {typeof style.width === 'number' && style.widthUnit === '%' ? `${style.width}%` : '100%'}
                </span>
              </div>
              {typeof style.width === 'number' && style.widthUnit === '%' && (
                <button
                  onClick={() => onChange({ width: undefined, widthUnit: undefined })}
                  className="text-[10px] font-medium text-neutral-400 hover:text-red-500 transition-colors mt-1"
                >
                  Reset to fill container
                </button>
              )}
              <p className="text-[10px] text-neutral-400 mt-1">
                Percentage of this block's immediate parent — the same thing dragging the resize handle on the canvas does, so it stays proportionally correct across every breakpoint and Preview width. (Deliberately percentage-only here, not pixels — a fixed pixel width from this panel would look right in the editor canvas but could break at a very different Preview/live width, since everything else in this layout is relative.)
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 w-20 shrink-0">Height</span>
            <input
              type="number" min={0} step={4}
              placeholder="Auto"
              className="flex-1 border border-neutral-200 rounded text-xs p-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
              value={
                isContainer
                  ? (typeof style.minHeight === 'number' ? style.minHeight : '')
                  : (typeof style.height === 'number' ? style.height : '')
              }
              onChange={e => {
                const raw = e.target.value
                if (raw === '') {
                  onChange(isContainer ? { minHeight: undefined } : { height: undefined })
                  return
                }
                const px = Math.max(0, Math.round(+raw) || 0)
                onChange(isContainer ? { minHeight: px, height: undefined } : { height: px })
              }}
            />
            <span className="text-xs text-neutral-400 shrink-0">px</span>
          </div>
          <p className="text-[10px] text-neutral-400 -mt-1">
            {isContainer
              ? 'Minimum height — this container can still grow taller to fit its content. Matches dragging the bottom resize handle on the canvas.'
              : 'Fixed pixel height. Matches dragging the bottom resize handle on the canvas.'}
          </p>
        </FieldGroup>
      )}

      {!hideBoxModel && (
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
      )}

      {!hideBoxModel && (
        <FieldGroup label="Margin">
          <BoxSpacingField
            label="Margin"
            values={{
              top: style.mt ?? style.my, right: style.mr ?? style.mx,
              bottom: style.mb ?? style.my, left: style.ml ?? style.mx,
            }}
            onChange={next => onChange({
              mt: next.top as number | 'auto' | undefined, mr: next.right as number | 'auto' | undefined,
              mb: next.bottom as number | 'auto' | undefined, ml: next.left as number | 'auto' | undefined,
            })}
          />
          <p className="text-[10px] text-neutral-400 -mt-1">
            Margin here is overridden by the Position control above whenever Position is set to anything other than "·" (None) on the matching axis
          </p>
        </FieldGroup>
      )}

      {!hideBackground && (
        <FieldGroup label="Background">
          <ColorField
            label={bgIsHover ? 'Color (hover)' : 'Color'}
            value={bgColorValue}
            onChange={setBgColor}
            hoverAdornment={enableHover && (
              <HoverToggle active={bgIsHover} hasValue={!!hover.bgColor} onToggle={() => toggleHover('bgColor')} />
            )}
          />
          <GradientField
            label={gradientIsHover ? 'Gradient (hover)' : 'Gradient'}
            value={gradientValue}
            onChange={setGradient}
            hoverAdornment={enableHover && (
              <HoverToggle active={gradientIsHover} hasValue={!!hover.bgGradient} onToggle={() => toggleHover('bgGradient')} />
            )}
          />
        </FieldGroup>
      )}

      <FieldGroup label="Typography">
        <TypographyPresetPicker onApply={onChange} />
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
        <ColorField
          label={textIsHover ? 'Text color (hover)' : 'Text color'}
          value={textColorValue}
          onChange={setTextColor}
          hoverAdornment={enableHover && (
            <HoverToggle active={textIsHover} hasValue={!!hover.textColor} onToggle={() => toggleHover('textColor')} />
          )}
        />
      </FieldGroup>

      <FieldGroup label="Border">
        <SelectField
          label="Radius" value={style.rounded ?? 'none'}
          options={['none','sm','md','lg','xl','2xl','full']}
          onChange={v => onChange({ rounded: v as StyleProps['rounded'] })}
        />
        <SelectField
          label="Width"
          value={String(style.borderWidth ?? 0)}
          options={[
            { label: 'None', value: '0' },
            { label: '1px',  value: '1' },
            { label: '2px',  value: '2' },
            { label: '4px',  value: '4' },
            { label: '8px',  value: '8' },
          ]}
          onChange={v => onChange({ borderWidth: (+v) as StyleProps['borderWidth'] })}
        />
        <ColorField
          label={borderIsHover ? 'Border color (hover)' : 'Border color'}
          value={borderColorValue}
          onChange={setBorderColor}
          hoverAdornment={enableHover && (
            <HoverToggle active={borderIsHover} hasValue={!!hover.borderColor} onToggle={() => toggleHover('borderColor')} />
          )}
        />
        <p className="text-[10px] text-neutral-400 -mt-1">
          Sets the color of this block's border. Width defaults to None (invisible) — pick 1–8px above to actually show it.
        </p>
      </FieldGroup>

      <FieldGroup label="Effects">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 w-20 shrink-0">
            Opacity{opacityIsHover ? ' (hover)' : ''}
          </span>
          <input
            type="range" min={0} max={100} step={5}
            className="flex-1 accent-violet-600"
            value={opacityValue}
            onChange={e => setOpacity(+e.target.value)}
          />
          <span className="text-xs text-neutral-400 w-8 text-right">{opacityValue}%</span>
          {enableHover && (
            <HoverToggle active={opacityIsHover} hasValue={hover.opacity !== undefined} onToggle={() => toggleHover('opacity')} />
          )}
        </div>
        <SelectField
          label={shadowIsHover ? 'Shadow (hover)' : 'Shadow'}
          value={shadowValue}
          options={['none','sm','md','lg','xl','2xl']}
          onChange={setShadow}
          after={enableHover && (
            <HoverToggle
              active={shadowIsHover}
              hasValue={!!hover.shadow && hover.shadow !== 'none'}
              onToggle={() => toggleHover('shadow')}
            />
          )}
        />
      </FieldGroup>
    </div>
  )
}

// ─── Animation demo swatch ──────────────────────────────────────────────────

function AnimationDemoBox({ animation }: { animation: AnimationProps }) {
  const [playKey, setPlayKey] = useState(0)
  const effect   = animation.effect ?? 'none'
  const duration = animation.duration ?? 600
  const delay    = animation.delay ?? 0
  const easing   = animation.easing ?? 'ease-out'

  useEffect(() => { setPlayKey(k => k + 1) }, [effect, duration, delay, easing])

  if (effect === 'none') {
    return (
      <div className="h-16 rounded-md border border-dashed border-neutral-200 flex items-center justify-center text-xs text-neutral-300">
        Pick an effect to preview it here
      </div>
    )
  }

  return (
    <div className="h-16 rounded-md border border-neutral-200 bg-neutral-50 flex items-center justify-center gap-3 relative overflow-hidden">
      <AnimationStyleSheet />
      <div
        key={playKey}
        className="w-10 h-10 rounded-md bg-violet-600 shrink-0"
        style={{
          animationName:           EFFECT_KEYFRAME[effect] ?? undefined,
          animationDuration:       `${duration}ms`,
          animationDelay:          `${delay}ms`,
          animationTimingFunction: easing,
          animationFillMode:       'both',
        }}
      />
      <button
        onClick={() => setPlayKey(k => k + 1)}
        className="text-xs font-medium text-violet-600 hover:text-violet-700 px-2 py-1 rounded hover:bg-violet-100 transition-colors shrink-0"
      >
        ↻ Replay
      </button>
    </div>
  )
}

// ─── Animation panel ────────────────────────────────────────────────────────
// Breakpoint-aware the same way the Style tab is: reads/writes whichever
// breakpoint is currently being edited (via useNodeAnimation/
// patchNodeAnimation — see responsive.ts), and shows the same "differs from
// Desktop" pill + reset button StyleTab already has, so a Tablet/Mobile-only
// animation override is just as visible and just as easy to undo as a
// Tablet/Mobile-only style override.

export function AnimationPanel({
  node, onChange,
}: {
  node: PageNode
  onChange: (props: Record<string, unknown>) => void
}) {
  const value             = useNodeAnimation(node)
  const editingBreakpoint = useBuilderStore(s => s.editingBreakpoint)
  const isOverrideBreakpoint = editingBreakpoint !== 'desktop'
  const hasOverride          = isOverrideBreakpoint && hasAnimationOverrideAt(node, editingBreakpoint)

  const a = { ...DEFAULT_ANIMATION, ...value }
  const isNone = (a.effect ?? 'none') === 'none'

  function patch(partial: Partial<AnimationProps>) {
    patchNodeAnimation(node, onChange, partial)
  }

  return (
    <FieldGroup label="Animation">
      {isOverrideBreakpoint && (
        <div className="flex items-center justify-between -mt-1 mb-1">
          <span className="text-[10px] font-medium text-violet-600 bg-violet-50 px-2 py-1 rounded-full">
            {PREVIEW_WIDTHS[editingBreakpoint].icon} Editing {PREVIEW_WIDTHS[editingBreakpoint].label} animation
          </span>
          {hasOverride && (
            <button
              onClick={() => clearNodeAnimationOverride(node, onChange, editingBreakpoint)}
              className="text-[10px] font-medium text-neutral-400 hover:text-red-500 transition-colors"
              title="Remove this breakpoint's animation override"
            >
              Reset to Desktop
            </button>
          )}
        </div>
      )}

      <SelectField
        label="Effect"
        value={a.effect ?? 'none'}
        options={ANIMATION_EFFECTS}
        onChange={v => patch({ effect: v as AnimationProps['effect'] })}
      />

      <AnimationDemoBox animation={a} />

      {!isNone && (
        <>
          <SelectField
            label="Trigger"
            value={a.trigger ?? 'onScroll'}
            options={[
              { label: 'On scroll into view', value: 'onScroll' },
              { label: 'On page load',        value: 'onLoad' },
            ]}
            onChange={v => patch({ trigger: v as AnimationProps['trigger'] })}
          />

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 w-20 shrink-0">Duration</span>
            <input
              type="range" min={100} max={2000} step={50}
              className="flex-1 accent-violet-600"
              value={a.duration ?? 600}
              onChange={e => patch({ duration: +e.target.value })}
            />
            <span className="text-xs text-neutral-400 w-12 text-right">{a.duration ?? 600}ms</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 w-20 shrink-0">Delay</span>
            <input
              type="range" min={0} max={2000} step={50}
              className="flex-1 accent-violet-600"
              value={a.delay ?? 0}
              onChange={e => patch({ delay: +e.target.value })}
            />
            <span className="text-xs text-neutral-400 w-12 text-right">{a.delay ?? 0}ms</span>
          </div>

          <SelectField
            label="Easing"
            value={a.easing ?? 'ease-out'}
            options={['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out']}
            onChange={v => patch({ easing: v as AnimationProps['easing'] })}
          />

          {a.trigger !== 'onLoad' && (
            <CheckField
              label="Play only once"
              value={a.once ?? true}
              onChange={v => patch({ once: v })}
            />
          )}

          <p className="text-[10px] text-neutral-400 -mt-1">
            The swatch above previews this exact effect instantly. The editor canvas itself never animates (it always shows blocks in their final static state, so drag/resize/text-editing stay predictable) — see the real thing in Preview, and use the Replay button in the top bar to re-trigger it there.
          </p>
          {isOverrideBreakpoint && (
            <p className="text-[10px] text-neutral-400 -mt-1">
              This animation applies only while viewing/editing at {PREVIEW_WIDTHS[editingBreakpoint].label} — Desktop keeps its own settings above unless you also override them here.
            </p>
          )}
        </>
      )}
    </FieldGroup>
  )
}

// ─── Custom CSS field ───────────────────────────────────────────────────────

export function CustomCssField({
  value, onChange,
}: {
  value?: string
  onChange: (css: string) => void
}) {
  return (
    <FieldGroup label="Custom CSS">
      <textarea
        className="w-full border border-neutral-200 rounded-md text-xs font-mono p-2 resize-y min-h-24 focus:outline-none focus:ring-1 focus:ring-violet-400"
        placeholder={'{{WRAPPER}} {\n  /* your CSS here */\n}'}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        spellCheck={false}
      />
      <p className="text-[10px] text-neutral-400 -mt-1">
        Use <code className="font-mono">{'{{WRAPPER}}'}</code> in place of a selector to target just this block — e.g. <code className="font-mono">{'{{WRAPPER}}:hover { opacity: 0.8; }'}</code>. Supports anything real CSS supports (hover states, animations, media queries) that the panel controls above can't reach.
      </p>
    </FieldGroup>
  )
}

// ─── Global color palette manager (Theme tab) ──────────────────────────────
// Page-wide, not node-scoped — lives in the Theme tab (see ControlPanel.tsx)
// rather than anywhere in the per-node Style/Content tabs. Every color here
// is exactly the same GlobalColor list ColorField reads to render its
// "Global:" swatch row — editing name/value here is instantly visible both
// in every ColorField across the app AND on any canvas block already bound
// to it, since both read straight from the store with no separate copy.

export function GlobalColorManager() {
  const colors             = useBuilderStore(s => s.globalColors)
  const addGlobalColor     = useBuilderStore(s => s.addGlobalColor)
  const updateGlobalColor  = useBuilderStore(s => s.updateGlobalColor)
  const deleteGlobalColor  = useBuilderStore(s => s.deleteGlobalColor)

  return (
    <FieldGroup label="Color palette">
      <p className="text-[10px] text-neutral-400 -mt-1">
        Shared, LIVE colors. Bind any color field on any block to one (via the small "Global:" swatches above every color picker) and changing it here updates every bound block instantly, page-wide.
      </p>
      <div className="space-y-2">
        {colors.map(c => (
          <div key={c.id} className="flex items-center gap-2 border border-neutral-200 rounded-md p-2">
            <input
              type="color"
              value={HEX_RE.test(c.value) ? c.value : '#ffffff'}
              onChange={e => updateGlobalColor(c.id, { value: e.target.value })}
              className="w-7 h-7 rounded border border-neutral-200 cursor-pointer p-0 bg-transparent shrink-0"
              title="Pick a color"
            />
            <input
              type="text"
              value={c.name}
              onChange={e => updateGlobalColor(c.id, { name: e.target.value })}
              className="flex-1 min-w-0 border border-neutral-200 rounded text-xs p-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
              placeholder="Name"
            />
            <input
              type="text"
              value={c.value}
              onChange={e => updateGlobalColor(c.id, { value: e.target.value })}
              spellCheck={false}
              className="w-20 shrink-0 border border-neutral-200 rounded text-xs p-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
            <button
              onClick={() => deleteGlobalColor(c.id)}
              className="shrink-0 w-6 h-6 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors text-xs"
              title="Delete — blocks bound to this fall back to no color, they don't break"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => addGlobalColor('New color', '#7c3aed')}
        className="w-full text-xs font-medium text-violet-600 hover:text-violet-700 py-1.5 rounded-md hover:bg-violet-50 transition-colors"
      >
        + Add global color
      </button>
    </FieldGroup>
  )
}

// ─── Global typography style manager (Theme tab) ───────────────────────────
// Same list TypographyPresetPicker (inside StylePanel's Typography group)
// reads from. Unlike colors, these are copy-once presets, not live links —
// see the doc comment on GlobalTypographyStyle in store.ts for why.

export function GlobalTypographyManager() {
  const styles                  = useBuilderStore(s => s.globalTypography)
  const addGlobalTypography     = useBuilderStore(s => s.addGlobalTypography)
  const updateGlobalTypography  = useBuilderStore(s => s.updateGlobalTypography)
  const deleteGlobalTypography  = useBuilderStore(s => s.deleteGlobalTypography)

  return (
    <FieldGroup label="Typography styles">
      <p className="text-[10px] text-neutral-400 -mt-1">
        Reusable text presets (size, weight, line height, alignment). Applying one from a block's Style tab COPIES these values onto it once — it's not a live link, so editing a preset here won't retroactively change blocks that already used it.
      </p>
      <div className="space-y-3">
        {styles.map(t => (
          <div key={t.id} className="border border-neutral-200 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={t.name}
                onChange={e => updateGlobalTypography(t.id, { name: e.target.value })}
                className="flex-1 border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
              />
              <button
                onClick={() => deleteGlobalTypography(t.id)}
                className="shrink-0 w-7 h-7 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors text-sm"
                aria-label="Delete style"
              >
                ✕
              </button>
            </div>
            <SelectField
              label="Size" value={t.fontSize ?? 'base'}
              options={['xs','sm','base','lg','xl','2xl','3xl','4xl','5xl','6xl']}
              onChange={v => updateGlobalTypography(t.id, { fontSize: v as StyleProps['fontSize'] })}
            />
            <SelectField
              label="Weight" value={t.fontWeight ?? 'normal'}
              options={['light','normal','medium','semibold','bold','extrabold']}
              onChange={v => updateGlobalTypography(t.id, { fontWeight: v as StyleProps['fontWeight'] })}
            />
            <SelectField
              label="Line height" value={t.leading ?? 'normal'}
              options={['none','tight','snug','normal','relaxed','loose']}
              onChange={v => updateGlobalTypography(t.id, { leading: v as StyleProps['leading'] })}
            />
            <SelectField
              label="Align" value={t.textAlign ?? ''}
              options={[{label:'—',value:''}, 'left','center','right','justify']}
              onChange={v => updateGlobalTypography(t.id, { textAlign: (v || undefined) as StyleProps['textAlign'] })}
            />
          </div>
        ))}
      </div>
      <button
        onClick={() => addGlobalTypography('New style')}
        className="w-full text-xs font-medium text-violet-600 hover:text-violet-700 py-1.5 rounded-md hover:bg-violet-50 transition-colors"
      >
        + Add typography style
      </button>
    </FieldGroup>
  )
}

// ─── SEO panel (SEO tab) ────────────────────────────────────────────────────
// Page-wide, like the Theme tab's managers — one set of metadata for the
// whole page, not per-node. Per-node concerns that overlap with SEO (image
// alt text, heading tag h1-h6) already live in their own node panels
// (ImagePanel, HeadingPanel) and aren't duplicated here.

function CharCount({ value, ideal }: { value: string; ideal: [number, number] }) {
  const len = value.length
  const inRange = len >= ideal[0] && len <= ideal[1]
  return (
    <span className={[
      'text-[10px] tabular-nums',
      len === 0 ? 'text-neutral-300' : inRange ? 'text-green-600' : 'text-amber-500',
    ].join(' ')}>
      {len}/{ideal[1]}{inRange && len > 0 ? ' ✓' : ''}
    </span>
  )
}

export function SeoPanel() {
  const seo             = useBuilderStore(s => s.seo)
  const updateSeo       = useBuilderStore(s => s.updateSeo)
  const openMediaPicker = useBuilderStore(s => s.openMediaPicker)

  const title       = seo.title ?? ''
  const description = seo.description ?? ''

  return (
    <div className="space-y-6">
      <FieldGroup label="Search appearance">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-neutral-500">Page title</span>
            <CharCount value={title} ideal={[40, 60]} />
          </div>
          <input
            type="text"
            value={title}
            onChange={e => updateSeo({ title: e.target.value })}
            placeholder="A short, descriptive page title"
            className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-neutral-500">Meta description</span>
            <CharCount value={description} ideal={[120, 160]} />
          </div>
          <textarea
            value={description}
            onChange={e => updateSeo({ description: e.target.value })}
            placeholder="One or two sentences describing this page for search results"
            className="w-full border border-neutral-200 rounded-md text-sm p-2 resize-y min-h-20 focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
        </div>

        <div>
          <span className="text-xs text-neutral-500 mb-1 block">Keywords (optional, comma-separated)</span>
          <input
            type="text"
            value={seo.keywords ?? ''}
            onChange={e => updateSeo({ keywords: e.target.value })}
            placeholder="landing page, page builder, no-code"
            className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
          <p className="text-[10px] text-neutral-400 mt-1">
            Most search engines ignore this now, but some site-search tools and older crawlers still read it.
          </p>
        </div>

        <div className="border border-neutral-200 rounded-md p-3 bg-white">
          <p className="text-[10px] text-neutral-400 mb-1.5 uppercase tracking-wide">Search result preview</p>
          <p className="text-[13px] text-neutral-500 truncate">yoursite.com</p>
          <p className="text-lg text-blue-700 truncate leading-snug">{title || 'Untitled Page'}</p>
          <p className="text-sm text-neutral-600 line-clamp-2">
            {description || 'No meta description set yet — search engines may generate one automatically from the page content instead.'}
          </p>
        </div>
      </FieldGroup>

      <FieldGroup label="Social sharing (Open Graph)">
        <p className="text-[10px] text-neutral-400 -mt-1">
          Controls how this page looks when shared on X, Facebook, LinkedIn, Slack, etc. Leave a field blank to fall back to the matching field above.
        </p>

        <div>
          <span className="text-xs text-neutral-500 mb-1 block">OG title</span>
          <input
            type="text"
            value={seo.ogTitle ?? ''}
            onChange={e => updateSeo({ ogTitle: e.target.value })}
            placeholder={title || 'Falls back to page title'}
            className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
        </div>

        <div>
          <span className="text-xs text-neutral-500 mb-1 block">OG description</span>
          <textarea
            value={seo.ogDescription ?? ''}
            onChange={e => updateSeo({ ogDescription: e.target.value })}
            placeholder={description || 'Falls back to meta description'}
            className="w-full border border-neutral-200 rounded-md text-sm p-2 resize-y min-h-16 focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
        </div>

        <div>
          <span className="text-xs text-neutral-500 mb-1 block">OG image</span>
          <button
            onClick={() => openMediaPicker(item => updateSeo({ ogImage: item.url }))}
            className="w-full rounded-lg border-2 border-dashed border-neutral-200 hover:border-violet-300 hover:bg-violet-50/40 transition-colors overflow-hidden"
            style={{ aspectRatio: '1200/630' }}
          >
            {seo.ogImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={seo.ogImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-neutral-400">
                <span className="text-lg">🖼️</span>
                <span className="text-xs font-medium">Choose share image (1200×630 recommended)</span>
              </div>
            )}
          </button>
          {seo.ogImage && (
            <div className="flex gap-2 mt-1.5">
              <button
                onClick={() => openMediaPicker(item => updateSeo({ ogImage: item.url }))}
                className="flex-1 text-xs font-medium text-violet-600 hover:text-violet-700 py-1 rounded-md hover:bg-violet-50 transition-colors"
              >
                Replace
              </button>
              <button
                onClick={() => updateSeo({ ogImage: undefined })}
                className="flex-1 text-xs font-medium text-neutral-400 hover:text-red-500 py-1 rounded-md hover:bg-red-50 transition-colors"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </FieldGroup>

      <FieldGroup label="Advanced">
        <div>
          <span className="text-xs text-neutral-500 mb-1 block">Canonical URL (optional)</span>
          <input
            type="text"
            value={seo.canonicalUrl ?? ''}
            onChange={e => updateSeo({ canonicalUrl: e.target.value })}
            placeholder="https://example.com/this-page"
            spellCheck={false}
            className="w-full border border-neutral-200 rounded-md text-xs font-mono p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
          <p className="text-[10px] text-neutral-400 mt-1">
            Set this if the same content is also published at another URL, so search engines credit the right one.
          </p>
        </div>

        <CheckField
          label="Hide this page from search engines (noindex)"
          value={!!seo.noIndex}
          onChange={v => updateSeo({ noIndex: v })}
        />

        <div>
          <span className="text-xs text-neutral-500 mb-1 block">Favicon</span>
          <button
            onClick={() => openMediaPicker(item => updateSeo({ favicon: item.url }))}
            className="flex items-center gap-2 border border-dashed border-neutral-200 hover:border-violet-300 hover:bg-violet-50/40 transition-colors rounded-md p-2"
          >
            {seo.favicon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={seo.favicon} alt="" className="w-6 h-6 rounded" />
            ) : (
              <span className="w-6 h-6 rounded bg-neutral-100 flex items-center justify-center text-xs text-neutral-400">?</span>
            )}
            <span className="text-xs font-medium text-violet-600">{seo.favicon ? 'Replace favicon' : 'Choose favicon'}</span>
          </button>
        </div>
      </FieldGroup>
    </div>
  )
}