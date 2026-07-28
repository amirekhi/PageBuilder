'use client'
import React, { useState , useEffect } from 'react'

import { StyleProps, COLOR_PRESETS, GRADIENT_PRESETS, resolveColor, BoxAlign, BoxAlignY, getBoxAlign, setBoxAlign, getBoxAlignY, setBoxAlignY, isGlobalColorRef, globalColorRefId, makeGlobalColorRef } from './styleMapper'
import { AnimationProps, ANIMATION_EFFECTS, DEFAULT_ANIMATION, AnimationStyleSheet, EFFECT_KEYFRAME } from './animations'
import type { HoverStyleProps } from './customCss'
import type { PageNode } from './types'
import { useNodeAnimation, patchNodeAnimation, hasAnimationOverrideAt, clearNodeAnimationOverride } from './responsive'
import { useBuilderStore, PREVIEW_WIDTHS } from './store'
import { sanitizeElementId } from './elementId'
import { useT, useDirection } from './i18n'
// ─── Section wrapper ──────────────────────────────────────────────────────────
// Sets `dir={direction}` from useDirection() — this is the ONE place that
// cascades RTL to nearly every panel in this file, since almost every
// exported component here renders through FieldGroup as its outermost or a
// direct child element. `dir` is inherited by descendants in the DOM, so
// nested elements (labels, inputs, buttons, notes) automatically pick up
// the right reading direction and text-align without needing their own dir
// attribute.
//
// IMPORTANT EXCEPTION: a handful of controls INSIDE some FieldGroups
// represent literal physical/spatial directions or numeric magnitude —
// the Position pin buttons (AlignField), the Padding/Margin Top-Right-
// Bottom-Left grid (BoxSpacingField), and the range sliders (Width,
// Opacity, Duration, Delay, Gap). Those must NOT mirror just because the
// panel language changed — "right" still means right, and a slider's
// track still goes low-to-high left-to-right, regardless of locale. Each
// of those components pins its own interactive row back to dir="ltr"
// locally (see the comments at each one below) while its labels still
// translate normally through the inherited direction.
export function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const direction = useDirection()
  return (
    <div dir={direction} className='px-2 pb-4'>
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
  const t = useT()
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
  const placeholderFor = (v: SideValue) => (v === 'auto' ? t('autoPlaceholder') : '0')

  const SIDES: [keyof BoxSides, string][] = [
    ['top', t('sideTop')], ['right', t('sideRight')], ['bottom', t('sideBottom')], ['left', t('sideLeft')],
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-neutral-500">{label} ({t('pxUnit')})</span>
        <button
          type="button"
          title={linked ? t('linkedTooltip') : t('unlinkedTooltip')}
          onClick={() => setLinked(v => !v)}
          className={[
            'w-6 h-6 flex items-center justify-center rounded text-sm transition-colors',
            linked ? 'bg-violet-100 text-violet-600' : 'text-neutral-400 hover:bg-neutral-100 border border-neutral-200',
          ].join(' ')}
        >
          {linked ? '🔗' : '⛓'}
        </button>
      </div>
      {/* dir="ltr" pinned here: this grid's 4 cells are laid out in a fixed
          physical Top/Right/Bottom/Left order (matching the CSS box model
          itself) — it must not visually reverse to Left/Bottom/Right/Top
          just because the panel is in Farsi. Only the sideLabel TEXT
          inside each cell is translated; the grid's cell order stays put. */}
      <div className="grid grid-cols-4 gap-1.5" dir="ltr">
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
    // dir="ltr" pinned: this is a numeric range slider (low value on the
    // left, high value on the right) — that low-to-high direction is a
    // magnitude convention, not text, so it stays fixed regardless of
    // locale. Only the label text before it is translated by the caller.
    <div className="flex items-center gap-2" dir="ltr">
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
  const t = useT()
  const currentX = getBoxAlign(style)
  const currentY = getBoxAlignY(style)

  const X_OPTIONS: { v: BoxAlign; icon: string; title: string }[] = [
    { v: 'none',   icon: '·', title: t('alignNoneTitle') },
    { v: 'left',   icon: '⇤', title: t('alignPinLeftTitle') },
    { v: 'center', icon: '↔', title: t('alignCenterXTitle') },
    { v: 'right',  icon: '⇥', title: t('alignPinRightTitle') },
  ]
  const Y_OPTIONS: { v: BoxAlignY; icon: string; title: string }[] = [
    { v: 'none',   icon: '·', title: t('alignNoneTitle') },
    { v: 'top',    icon: '⇡', title: t('alignPinTopTitle') },
    { v: 'middle', icon: '↕', title: t('alignCenterYTitle') },
    { v: 'bottom', icon: '⇣', title: t('alignPinBottomTitle') },
  ]

  return (
    <div className="space-y-2">
      {(axis === 'both' || axis === 'x') && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 w-20 shrink-0">{t('alignHorizontal')}</span>
          {/* dir="ltr" pinned: these 4 buttons are ⇤ left / ↔ center /
              ⇥ right, in that literal physical order. In RTL that row
              would otherwise visually reverse to right/center/left, which
              would make the "Pin left" button sit physically on the right
              — exactly backwards from what it does. Left stays left. */}
          <div className="flex-1 flex rounded-md border border-neutral-200 overflow-hidden" dir="ltr">
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
          <span className="text-xs text-neutral-500 w-20 shrink-0">{t('alignVertical')}</span>
          {/* Vertical pins (top/middle/bottom) aren't affected by text
              direction anyway, but pinned to ltr too for consistency with
              the horizontal row and so its order never depends on locale. */}
          <div className="flex-1 flex rounded-md border border-neutral-200 overflow-hidden" dir="ltr">
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
          {t('alignNote')}
        </p>
      )}
    </div>
  )
}

// ─── Grid cell span (shown on a CHILD whose direct parent is a Grid) ──────
// Companion to the Grid element's own panel (GridPanel, in
// nodeComponents.tsx), which controls the parent's column/row COUNT. This
// controls how many of those cells a single selected CHILD block should
// span — writing gridColSpan/gridRowSpan onto the CHILD's own style (see
// StyleProps in styleMapper.ts). Wired into ControlPanel's ContentTab,
// which looks up whether the selected node's parent is type 'grid' and
// only then renders this field — a child of any other container type never
// sees it, since the two properties would simply be inert there anyway.
export function GridCellSpanField({
  style, onChange,
}: {
  style: StyleProps
  onChange: (partial: Partial<StyleProps>) => void
}) {
  const t = useT()
  const colSpan = style.gridColSpan ?? 1
  const rowSpan = style.gridRowSpan ?? 1
  const SPANS = [1, 2, 3, 4] as const

  return (
    <FieldGroup label={t('sectionCellSpan')}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-500 w-20 shrink-0">{t('cellSpanColumns')}</span>
        <div className="flex-1 flex rounded-md border border-neutral-200 overflow-hidden" dir="ltr">
          {SPANS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ gridColSpan: n as StyleProps['gridColSpan'] })}
              className={[
                'flex-1 py-1 text-xs transition-colors',
                colSpan === n ? 'bg-violet-600 text-white' : 'bg-white text-neutral-500 hover:bg-neutral-50',
              ].join(' ')}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-500 w-20 shrink-0">{t('cellSpanRows')}</span>
        <div className="flex-1 flex rounded-md border border-neutral-200 overflow-hidden" dir="ltr">
          {SPANS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ gridRowSpan: n as StyleProps['gridRowSpan'] })}
              className={[
                'flex-1 py-1 text-xs transition-colors',
                rowSpan === n ? 'bg-violet-600 text-white' : 'bg-white text-neutral-500 hover:bg-neutral-50',
              ].join(' ')}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[10px] text-neutral-400 -mt-1">
        {t('cellSpanNote')}
      </p>
    </FieldGroup>
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
  const t = useT()
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
              {t('clearLabel')}
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
            🔗 {boundGlobal?.name ?? t('deletedGlobalColor')}
          </span>
          <button
            onClick={() => onChange(swatchHex)}
            className="text-[10px] font-medium text-violet-500 hover:text-violet-700 transition-colors shrink-0"
            title={t('unlinkTitle')}
          >
            {t('unlinkLabel')}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={swatchHex}
            onChange={e => onChange(e.target.value)}
            className="w-8 h-8 rounded-md border border-neutral-200 cursor-pointer p-0 bg-transparent shrink-0"
            title={t('pickColorTitle')}
          />
          <input
            type="text"
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            placeholder={t('colorPlaceholder')}
            spellCheck={false}
            className="flex-1 border border-neutral-200 rounded-md text-xs p-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
        </div>
      )}

      {globalColors.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="text-[9px] text-neutral-400 mr-0.5">{t('globalColorsLabel')}</span>
          {globalColors.map(c => (
            <button
              key={c.id}
              onClick={() => onChange(makeGlobalColorRef(c.id))}
              title={t('globalColorStaysLinkedTitle', c.name)}
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
          title={t('transparentLabel')}
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

function useGradientDirections(): { label: string; value: string }[] {
  const t = useT()
  return [
    { label: t('dirLeftRight'), value: 'to right' },
    { label: t('dirRightLeft'), value: 'to left' },
    { label: t('dirTopBottom'), value: 'to bottom' },
    { label: t('dirBottomTop'), value: 'to top' },
    { label: t('dirDiagBR'),    value: 'to bottom right' },
    { label: t('dirDiagBL'),    value: 'to bottom left' },
    { label: t('dirDiagTR'),    value: 'to top right' },
    { label: t('dirDiagTL'),    value: 'to top left' },
  ]
}

interface ParsedGradient { direction: string; from: string; to: string }

function parseGradient(css?: string): ParsedGradient | null {
  if (!css) return null
  const m = css.match(/^linear-gradient\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^,]+?)\s*\)$/i)
  if (!m) return null
  return { direction: m[1].trim(), from: m[2].trim(), to: m[3].trim() }
}

const DEFAULT_GRADIENT: ParsedGradient = { direction: 'to right', from: '#7c3aed', to: '#4f46e5' }

export function GradientField({
  value, onChange, label, hoverAdornment,
}: {
  value?: string
  onChange: (v: string) => void
  label?: string
  // Optional slot next to the "Clear" button — used by StylePanel/
  // SectionPanel/ColumnPanel to attach a per-field "H" hover toggle, same
  // pattern as ColorField.
  hoverAdornment?: React.ReactNode
}) {
  const t = useT()
  const GRADIENT_DIRECTIONS = useGradientDirections()
  const parsed = parseGradient(value) ?? DEFAULT_GRADIENT
  const displayLabel = label ?? t('gradientLabel')

  function build(partial: Partial<ParsedGradient>) {
    const next = { ...parsed, ...partial }
    onChange(`linear-gradient(${next.direction}, ${next.from}, ${next.to})`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-neutral-500">{displayLabel}</span>
        <div className="flex items-center gap-2">
          {value && (
            <button
              onClick={() => onChange('')}
              className="text-[10px] font-medium text-neutral-400 hover:text-red-500 transition-colors"
            >
              {t('clearLabel')}
            </button>
          )}
          {hoverAdornment}
        </div>
      </div>

      <div
        className="w-full h-10 rounded-md border border-neutral-200 mb-2"
        style={value ? { backgroundImage: value } : { backgroundColor: '#f5f5f5' }}
      />

      {/* dir="ltr" pinned: the from→to swatch order and the direction
          <select>'s arrows (→ ← ↓ ↑ etc.) describe an actual visual
          gradient direction on the canvas — that meaning is fixed and
          must not mirror with the panel's language. */}
      <div className="flex items-center gap-2 mb-1.5" dir="ltr">
        <input
          type="color"
          value={HEX_RE.test(parsed.from) ? parsed.from : '#7c3aed'}
          onChange={e => build({ from: e.target.value })}
          className="w-8 h-8 rounded-md border border-neutral-200 cursor-pointer p-0 bg-transparent shrink-0"
          title={t('startColorTitle')}
        />
        <span className="text-xs text-neutral-400 shrink-0">→</span>
        <input
          type="color"
          value={HEX_RE.test(parsed.to) ? parsed.to : '#4f46e5'}
          onChange={e => build({ to: e.target.value })}
          className="w-8 h-8 rounded-md border border-neutral-200 cursor-pointer p-0 bg-transparent shrink-0"
          title={t('endColorTitle')}
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
  const t = useT()
  return (
    <button
      type="button"
      onClick={onToggle}
      title={
        active
          ? t('hoverActiveTooltip')
          : hasValue
            ? t('hoverSetTooltip')
            : t('hoverUnsetTooltip')
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
  const t = useT()
  const presets = useBuilderStore(s => s.globalTypography)
  if (!presets.length) return null

  return (
    <div>
      <SelectField
        label={t('presetLabel')}
        value=""
        options={[
          { label: t('applySavedStyle'), value: '' },
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
        {t('presetNote')}
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

  const t = useT()

  return (
    <div className="space-y-5 p-4">
      <FieldGroup label={t('sectionVisibility')}>
        <CheckField
          label={t('hideOnBreakpoint', breakpointLabel)}
          value={!!style.hidden}
          onChange={checked => onChange({ hidden: checked ? true : undefined })}
        />
        <p className="text-[10px] text-neutral-400 -mt-1">
          {t('hideOnlyThisBreakpointNote', breakpointLabel)}
        </p>
      </FieldGroup>

      {!hideBoxModel && (
        <FieldGroup label={t('sectionPosition')}>
          <AlignField style={style} onChange={onChange} />
          <p className="text-[10px] text-neutral-400 -mt-1">{t('positionVisibleNote')}</p>
        </FieldGroup>
      )}

      {!hideSize && (
        <FieldGroup label={t('sectionSize')}>
          {!hideWidth && (
            <div>
              {/* dir="ltr" pinned: a percentage-width range slider — track
                  runs low(5%)-to-high(100%) left-to-right as a magnitude,
                  not as text, so it doesn't reverse in Farsi mode. */}
              <div className="flex items-center gap-2" dir="ltr">
                <span className="text-xs text-neutral-500 w-20 shrink-0">{t('sizeWidth')}</span>
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
                  {t('resetToFillContainer')}
                </button>
              )}
              <p className="text-[10px] text-neutral-400 mt-1">
                {t('widthNote')}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 w-20 shrink-0">{t('sizeHeight')}</span>
            <input
              type="number" min={0} step={4}
              placeholder={t('autoPlaceholder')}
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
            <span className="text-xs text-neutral-400 shrink-0">{t('pxUnit')}</span>
          </div>
          <p className="text-[10px] text-neutral-400 -mt-1">
            {isContainer ? t('heightNoteContainer') : t('heightNoteFixed')}
          </p>
        </FieldGroup>
      )}

      {!hideBoxModel && (
        <FieldGroup label={t('sectionPadding')}>
          <BoxSpacingField
            label={t('fieldPadding')}
            values={{
              top: style.pt ?? style.py, right: style.pr ?? style.px,
              bottom: style.pb ?? style.py, left: style.pl ?? style.px,
            }}
            onChange={next => onChange({
              pt: next.top as number | undefined, pr: next.right as number | undefined,
              pb: next.bottom as number | undefined, pl: next.left as number | undefined,
            })}
          />
          <SpacingField label={t('fieldGap')} value={style.gap} onChange={v => onChange({ gap: v })} />
        </FieldGroup>
      )}

      {!hideBoxModel && (
        <FieldGroup label={t('sectionMargin')}>
          <BoxSpacingField
            label={t('fieldMargin')}
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
            {t('marginNote')}
          </p>
        </FieldGroup>
      )}

      {!hideBackground && (
        <FieldGroup label={t('sectionBackground')}>
          <ColorField
            label={bgIsHover ? t('colorLabelHover') : t('colorLabel')}
            value={bgColorValue}
            onChange={setBgColor}
            hoverAdornment={enableHover && (
              <HoverToggle active={bgIsHover} hasValue={!!hover.bgColor} onToggle={() => toggleHover('bgColor')} />
            )}
          />
          <GradientField
            label={gradientIsHover ? t('gradientLabelHover') : t('gradientLabel')}
            value={gradientValue}
            onChange={setGradient}
            hoverAdornment={enableHover && (
              <HoverToggle active={gradientIsHover} hasValue={!!hover.bgGradient} onToggle={() => toggleHover('bgGradient')} />
            )}
          />
        </FieldGroup>
      )}

      <FieldGroup label={t('sectionTypography')}>
        <TypographyPresetPicker onApply={onChange} />
        <SelectField
          label={t('typoSize')} value={style.fontSize ?? ''}
          options={[{label:'—',value:''}, 'xs','sm','base','lg','xl','2xl','3xl','4xl','5xl','6xl']}
          onChange={v => onChange({ fontSize: v as StyleProps['fontSize'] || undefined })}
        />
        <SelectField
          label={t('typoWeight')} value={style.fontWeight ?? ''}
          options={[{label:'—',value:''}, 'light','normal','medium','semibold','bold','extrabold']}
          onChange={v => onChange({ fontWeight: v as StyleProps['fontWeight'] || undefined })}
        />
        <SelectField
          label={t('typoTextAlign')} value={style.textAlign ?? ''}
          options={[{label:'—',value:''}, 'left','center','right','justify']}
          onChange={v => onChange({ textAlign: v as StyleProps['textAlign'] || undefined })}
        />
        <ColorField
          label={textIsHover ? t('textColorLabelHover') : t('textColorLabel')}
          value={textColorValue}
          onChange={setTextColor}
          hoverAdornment={enableHover && (
            <HoverToggle active={textIsHover} hasValue={!!hover.textColor} onToggle={() => toggleHover('textColor')} />
          )}
        />
      </FieldGroup>

      <FieldGroup label={t('sectionBorder')}>
        <SelectField
          label={t('borderRadiusLabel')} value={style.rounded ?? 'none'}
          options={['none','sm','md','lg','xl','2xl','full']}
          onChange={v => onChange({ rounded: v as StyleProps['rounded'] })}
        />
        <SelectField
          label={t('borderWidthLabel')}
          value={String(style.borderWidth ?? 0)}
          options={[
            { label: t('borderWidthNone'), value: '0' },
            { label: '1px',  value: '1' },
            { label: '2px',  value: '2' },
            { label: '4px',  value: '4' },
            { label: '8px',  value: '8' },
          ]}
          onChange={v => onChange({ borderWidth: (+v) as StyleProps['borderWidth'] })}
        />
        <ColorField
          label={borderIsHover ? t('borderColorLabelHover') : t('borderColorLabel')}
          value={borderColorValue}
          onChange={setBorderColor}
          hoverAdornment={enableHover && (
            <HoverToggle active={borderIsHover} hasValue={!!hover.borderColor} onToggle={() => toggleHover('borderColor')} />
          )}
        />
        <p className="text-[10px] text-neutral-400 -mt-1">
          {t('borderNote')}
        </p>
      </FieldGroup>

      <FieldGroup label={t('sectionEffects')}>
        {/* dir="ltr" pinned: 0%-to-100% opacity slider is a magnitude,
            same reasoning as Width above. */}
        <div className="flex items-center gap-2" dir="ltr">
          <span className="text-xs text-neutral-500 w-20 shrink-0">
            {opacityIsHover ? t('opacityLabelHover') : t('opacityLabel')}
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
          label={shadowIsHover ? t('shadowLabelHover') : t('shadowLabel')}
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
  const t = useT()
  const [playKey, setPlayKey] = useState(0)
  const effect   = animation.effect ?? 'none'
  const duration = animation.duration ?? 600
  const delay    = animation.delay ?? 0
  const easing   = animation.easing ?? 'ease-out'

  useEffect(() => { setPlayKey(k => k + 1) }, [effect, duration, delay, easing])

  if (effect === 'none') {
    return (
      <div className="h-16 rounded-md border border-dashed border-neutral-200 flex items-center justify-center text-xs text-neutral-300">
        {t('effectPlaceholder')}
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
        ↻ {t('replayLabel')}
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
  const t = useT()

  function patch(partial: Partial<AnimationProps>) {
    patchNodeAnimation(node, onChange, partial)
  }

  return (
    <FieldGroup label={t('sectionAnimation')}>
      {isOverrideBreakpoint && (
        <div className="flex items-center justify-between -mt-1 mb-1">
          <span className="text-[10px] font-medium text-violet-600 bg-violet-50 px-2 py-1 rounded-full">
            {PREVIEW_WIDTHS[editingBreakpoint].icon} {t('editingAnimationAt', PREVIEW_WIDTHS[editingBreakpoint].label)}
          </span>
          {hasOverride && (
            <button
              onClick={() => clearNodeAnimationOverride(node, onChange, editingBreakpoint)}
              className="text-[10px] font-medium text-neutral-400 hover:text-red-500 transition-colors"
              title={t('removeAnimationOverrideTitle')}
            >
              {t('resetToDesktop')}
            </button>
          )}
        </div>
      )}

      <SelectField
        label={t('effectLabel')}
        value={a.effect ?? 'none'}
        options={ANIMATION_EFFECTS}
        onChange={v => patch({ effect: v as AnimationProps['effect'] })}
      />

      <AnimationDemoBox animation={a} />

      {!isNone && (
        <>
          <SelectField
            label={t('triggerLabel')}
            value={a.trigger ?? 'onScroll'}
            options={[
              { label: t('triggerOnScroll'), value: 'onScroll' },
              { label: t('triggerOnLoad'),   value: 'onLoad' },
            ]}
            onChange={v => patch({ trigger: v as AnimationProps['trigger'] })}
          />

          {/* dir="ltr" pinned: Duration/Delay sliders are magnitude ranges
              (0ms on the left, max ms on the right), same reasoning as
              Width/Opacity above — not affected by reading direction. */}
          <div className="flex items-center gap-2" dir="ltr">
            <span className="text-xs text-neutral-500 w-20 shrink-0">{t('durationLabel')}</span>
            <input
              type="range" min={100} max={2000} step={50}
              className="flex-1 accent-violet-600"
              value={a.duration ?? 600}
              onChange={e => patch({ duration: +e.target.value })}
            />
            <span className="text-xs text-neutral-400 w-12 text-right">{a.duration ?? 600}ms</span>
          </div>

          <div className="flex items-center gap-2" dir="ltr">
            <span className="text-xs text-neutral-500 w-20 shrink-0">{t('delayLabel')}</span>
            <input
              type="range" min={0} max={2000} step={50}
              className="flex-1 accent-violet-600"
              value={a.delay ?? 0}
              onChange={e => patch({ delay: +e.target.value })}
            />
            <span className="text-xs text-neutral-400 w-12 text-right">{a.delay ?? 0}ms</span>
          </div>

          <SelectField
            label={t('easingLabel')}
            value={a.easing ?? 'ease-out'}
            options={['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out']}
            onChange={v => patch({ easing: v as AnimationProps['easing'] })}
          />

          {a.trigger !== 'onLoad' && (
            <CheckField
              label={t('playOnce')}
              value={a.once ?? true}
              onChange={v => patch({ once: v })}
            />
          )}

          <p className="text-[10px] text-neutral-400 -mt-1">
            {t('animationNote1')}
          </p>
          {isOverrideBreakpoint && (
            <p className="text-[10px] text-neutral-400 -mt-1">
              {t('animationNote2', PREVIEW_WIDTHS[editingBreakpoint].label)}
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
  const t = useT()
  return (
    <FieldGroup label={t('sectionCustomCss')}>
      <textarea
        className="w-full border border-neutral-200 rounded-md text-xs font-mono p-2 resize-y min-h-24 focus:outline-none focus:ring-1 focus:ring-violet-400"
        placeholder={'{{WRAPPER}} {\n  /* your CSS here */\n}'}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        spellCheck={false}
      />
      <p className="text-[10px] text-neutral-400 -mt-1">
        {t('customCssNoteBefore')} <code className="font-mono">{'{{WRAPPER}}'}</code> {t('customCssNoteMid')} <code className="font-mono">{'{{WRAPPER}}:hover { opacity: 0.8; }'}</code>. {t('customCssNoteAfter')}
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
  const t                  = useT()

  return (
    <FieldGroup label={t('sectionColorPalette')}>
      <p className="text-[10px] text-neutral-400 -mt-1">
        {t('globalColorNote')}
      </p>
      <div className="space-y-2">
        {colors.map(c => (
          <div key={c.id} className="flex items-center gap-2 border border-neutral-200 rounded-md p-2">
            <input
              type="color"
              value={HEX_RE.test(c.value) ? c.value : '#ffffff'}
              onChange={e => updateGlobalColor(c.id, { value: e.target.value })}
              className="w-7 h-7 rounded border border-neutral-200 cursor-pointer p-0 bg-transparent shrink-0"
              title={t('pickColorTitle')}
            />
            <input
              type="text"
              value={c.name}
              onChange={e => updateGlobalColor(c.id, { name: e.target.value })}
              className="flex-1 min-w-0 border border-neutral-200 rounded text-xs p-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
              placeholder={t('namePlaceholder')}
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
              title={t('deleteColorTooltip')}
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
        {t('addGlobalColor')}
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
  // Named `tr`, not `t` — this function's own .map(t => ...) below already
  // uses `t` as the loop variable for each GlobalTypographyStyle item, and
  // shadowing it with the translation function would break every `t.id`/
  // `t.name`/etc reference inside that callback.
  const tr                      = useT()

  return (
    <FieldGroup label={tr('sectionTypographyStyles')}>
      <p className="text-[10px] text-neutral-400 -mt-1">
        {tr('globalTypoNote')}
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
                aria-label={tr('deleteStyleAriaLabel')}
              >
                ✕
              </button>
            </div>
            <SelectField
              label={tr('typoSize')} value={t.fontSize ?? 'base'}
              options={['xs','sm','base','lg','xl','2xl','3xl','4xl','5xl','6xl']}
              onChange={v => updateGlobalTypography(t.id, { fontSize: v as StyleProps['fontSize'] })}
            />
            <SelectField
              label={tr('typoWeight')} value={t.fontWeight ?? 'normal'}
              options={['light','normal','medium','semibold','bold','extrabold']}
              onChange={v => updateGlobalTypography(t.id, { fontWeight: v as StyleProps['fontWeight'] })}
            />
            <SelectField
              label={tr('lineHeightLabel')} value={t.leading ?? 'normal'}
              options={['none','tight','snug','normal','relaxed','loose']}
              onChange={v => updateGlobalTypography(t.id, { leading: v as StyleProps['leading'] })}
            />
            <SelectField
              label={tr('alignLabelGeneric')} value={t.textAlign ?? ''}
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
        {tr('addTypographyStyle')}
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
  const t               = useT()

  const title       = seo.title ?? ''
  const description = seo.description ?? ''

  return (
    <div className="space-y-6">
      <FieldGroup label={t('seoSearchAppearance')}>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-neutral-500">{t('seoPageTitle')}</span>
            <CharCount value={title} ideal={[40, 60]} />
          </div>
          <input
            type="text"
            value={title}
            onChange={e => updateSeo({ title: e.target.value })}
            placeholder={t('seoPageTitlePlaceholder')}
            className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-neutral-500">{t('seoMetaDescription')}</span>
            <CharCount value={description} ideal={[120, 160]} />
          </div>
          <textarea
            value={description}
            onChange={e => updateSeo({ description: e.target.value })}
            placeholder={t('seoMetaDescPlaceholder')}
            className="w-full border border-neutral-200 rounded-md text-sm p-2 resize-y min-h-20 focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
        </div>

        <div>
          <span className="text-xs text-neutral-500 mb-1 block">{t('seoKeywordsLabel')}</span>
          <input
            type="text"
            value={seo.keywords ?? ''}
            onChange={e => updateSeo({ keywords: e.target.value })}
            placeholder={t('seoKeywordsPlaceholder')}
            className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
          <p className="text-[10px] text-neutral-400 mt-1">
            {t('seoKeywordsNote')}
          </p>
        </div>

        <div className="border border-neutral-200 rounded-md p-3 bg-white">
          <p className="text-[10px] text-neutral-400 mb-1.5 uppercase tracking-wide">{t('seoPreviewLabel')}</p>
          <p className="text-[13px] text-neutral-500 truncate">yoursite.com</p>
          <p className="text-lg text-blue-700 truncate leading-snug">{title || t('seoUntitledPage')}</p>
          <p className="text-sm text-neutral-600 line-clamp-2">
            {description || t('seoNoDescYet')}
          </p>
        </div>
      </FieldGroup>

      <FieldGroup label={t('seoSocialSharing')}>
        <p className="text-[10px] text-neutral-400 -mt-1">
          {t('seoOgNote')}
        </p>

        <div>
          <span className="text-xs text-neutral-500 mb-1 block">{t('seoOgTitle')}</span>
          <input
            type="text"
            value={seo.ogTitle ?? ''}
            onChange={e => updateSeo({ ogTitle: e.target.value })}
            placeholder={title || t('seoFallbackTitle')}
            className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
        </div>

        <div>
          <span className="text-xs text-neutral-500 mb-1 block">{t('seoOgDescription')}</span>
          <textarea
            value={seo.ogDescription ?? ''}
            onChange={e => updateSeo({ ogDescription: e.target.value })}
            placeholder={description || t('seoFallbackDesc')}
            className="w-full border border-neutral-200 rounded-md text-sm p-2 resize-y min-h-16 focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
        </div>

        <div>
          <span className="text-xs text-neutral-500 mb-1 block">{t('seoOgImage')}</span>
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
                <span className="text-xs font-medium">{t('seoChooseImage')}</span>
              </div>
            )}
          </button>
          {seo.ogImage && (
            <div className="flex gap-2 mt-1.5">
              <button
                onClick={() => openMediaPicker(item => updateSeo({ ogImage: item.url }))}
                className="flex-1 text-xs font-medium text-violet-600 hover:text-violet-700 py-1 rounded-md hover:bg-violet-50 transition-colors"
              >
                {t('seoReplace')}
              </button>
              <button
                onClick={() => updateSeo({ ogImage: undefined })}
                className="flex-1 text-xs font-medium text-neutral-400 hover:text-red-500 py-1 rounded-md hover:bg-red-50 transition-colors"
              >
                {t('seoRemove')}
              </button>
            </div>
          )}
        </div>
      </FieldGroup>

      <FieldGroup label={t('seoAdvanced')}>
        <div>
          <span className="text-xs text-neutral-500 mb-1 block">{t('seoCanonicalUrl')}</span>
          <input
            type="text"
            value={seo.canonicalUrl ?? ''}
            onChange={e => updateSeo({ canonicalUrl: e.target.value })}
            placeholder="https://example.com/this-page"
            spellCheck={false}
            className="w-full border border-neutral-200 rounded-md text-xs font-mono p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
          <p className="text-[10px] text-neutral-400 mt-1">
            {t('seoCanonicalNote')}
          </p>
        </div>

        <CheckField
          label={t('seoNoIndex')}
          value={!!seo.noIndex}
          onChange={v => updateSeo({ noIndex: v })}
        />

        <div>
          <span className="text-xs text-neutral-500 mb-1 block">{t('seoFavicon')}</span>
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
            <span className="text-xs font-medium text-violet-600">{seo.favicon ? t('seoReplaceFavicon') : t('seoChooseFavicon')}</span>
          </button>
        </div>
      </FieldGroup>
    </div>
  )
}


// ─── Element ID field ───────────────────────────────────────────────────────
// Shared by every per-node panel (via ControlPanel's ContentTab, appended
// right alongside CustomCssField) — one field covers all 15 node types, no
// individual *Panel component needed to change. Writes node.props.htmlId,
// read by elementId.ts's elementId() helper and rendered as a real HTML id
// attribute on the block's root element in nodeComponents.tsx.

export function ElementIdField({
  value, onChange,
}: {
  value?: string
  onChange: (id: string) => void
}) {
  const t = useT()
  return (
    <FieldGroup label={t('sectionElementId')}>
      <input
        type="text"
        value={value ?? ''}
        onChange={e => onChange(sanitizeElementId(e.target.value))}
        placeholder={t('elementIdPlaceholder')}
        spellCheck={false}
        className="w-full border border-neutral-200 rounded-md text-xs font-mono p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
      />
      <p className="text-[10px] text-neutral-400 -mt-1">
        {t('elementIdNote', value || 'this-id')}
      </p>
    </FieldGroup>
  )
}