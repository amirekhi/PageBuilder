'use client'
import React, { useState , useEffect } from 'react'

import { StyleProps, COLOR_PRESETS, GRADIENT_PRESETS, resolveColor, BoxAlign, BoxAlignY, getBoxAlign, setBoxAlign, getBoxAlignY, setBoxAlignY } from './styleMapper'
import { AnimationProps, ANIMATION_EFFECTS, DEFAULT_ANIMATION, AnimationStyleSheet, EFFECT_KEYFRAME } from './animations'

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
//
// NOTE: this writes plain numbers into mt/mb/ml/mr. Those same keys can also
// hold 'auto' when written by AlignField's Position control below — whichever
// control was used most recently wins, same duality ml/mr always had.

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

// ─── Box position (horizontal AND vertical self-positioning) ──────────────
// Backed by ml/mr (horizontal) and mt/mb (vertical) margins — see
// getBoxAlign/setBoxAlign and getBoxAlignY/setBoxAlignY in styleMapper.ts.
//
// 'none' is a real, distinct 4th state (for each axis) meaning NO override is
// written — the parent's own Justify/Align fully controls this item. Picking
// Left/Center/Right (or Top/Middle/Bottom) writes an explicit auto-margin,
// which — per the CSS flex spec — absorbs free space on that axis BEFORE
// justify-content/align-items gets a say. That's a legitimate per-item
// override (like align-self), but it only works predictably now that there's
// a real way to opt back OUT of it via 'none' — previously even clicking
// "Left" (visually a no-op most of the time) silently wrote an auto-margin
// that fought the parent's layout forever after, with no way back.
//
// NOTE ON NAMING: there are three unrelated things in this app that all
// involve the word "align" —
//   1. This control (AlignField): where THIS block sits within its parent
//      when it's narrower/shorter than the parent — self-positioning via
//      margin, overriding the parent's Justify/Align for this one item.
//   2. Flex "align items" (SectionPanel/ColumnsPanel "Align children" or
//      "Align items"): how a container lines up ALL its children by default
//      on the cross-axis. Different mechanism (CSS align-items on the
//      PARENT, not margin on the child) — and this control's 'none' state is
//      exactly what lets #2 actually take effect for a given child.
//   3. Text align (StylePanel "Text align"): how text sits INSIDE this
//      block. Different mechanism again (CSS text-align).
// Always labeled distinctly in the panels below.

export function AlignField({
  style, onChange, axis = 'both',
}: {
  style: StyleProps
  onChange: (partial: Partial<StyleProps>) => void
  // 'both' (default) shows Horizontal + Vertical. Pass 'x' or 'y' to show
  // only one axis for a panel where the other doesn't make sense.
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
  style, onChange, hideBoxModel = false, hideBackground = false,
}: {
  style: StyleProps
  onChange: (partial: Partial<StyleProps>) => void
  // Skips Position/Padding/Margin — used only for node types whose own
  // Content-tab panel already has a full, equally-capable version of these
  // same controls (currently just Section, which has its own Padding/
  // Margin/Position/Width group). Without this, Section showed every one
  // of these fields twice: once in Content, once again here in Style.
  hideBoxModel?: boolean
  // Skips the Background section here — used only for Section, whose own
  // Content-tab panel already has the fuller version (flat color + gradient
  // + image + overlay) vs. this component's plain-color-only version. Every
  // other node type still gets Background from here, since nothing else
  // has its own copy.
  hideBackground?: boolean
}) {
  return (
    <div className="space-y-5 p-4">
      {!hideBoxModel && (
        <FieldGroup label="Position">
          <AlignField style={style} onChange={onChange} />
          <p className="text-[10px] text-neutral-400 -mt-1">Only visible once this block's width/height is smaller than its container</p>
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
          <ColorField label="Color" value={style.bgColor} onChange={v => onChange({ bgColor: v || undefined })} />
        </FieldGroup>
      )}

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

// ─── Animation demo swatch ──────────────────────────────────────────────────
// Gives instant feedback for animation settings WITHOUT touching the real
// canvas — the actual editing canvas deliberately never animates (see the
// ANIMATION NOTE at the top of nodeComponents.tsx: a block mid-transform/
// opacity would fight the drag handles, resize handles, and contentEditable
// text editing that all read the block's live box). This is a self-contained
// placeholder square that plays the exact effect/duration/delay/easing you
// just picked, replaying automatically on every change — so you get instant
// feedback right in the sidebar without ever leaving Edit mode or touching
// anything that could break editing interactions.
//
// It renders its own <AnimationStyleSheet/> (the @keyframes) because the
// panel can be open while in Edit mode, where PreviewRenderer — the only
// other place that mounts the stylesheet — isn't on screen at all.

function AnimationDemoBox({ animation }: { animation: AnimationProps }) {
  const [playKey, setPlayKey] = useState(0)
  const effect   = animation.effect ?? 'none'
  const duration = animation.duration ?? 600
  const delay    = animation.delay ?? 0
  const easing   = animation.easing ?? 'ease-out'

  // Replaying on every settings change is what makes this "instant
  // feedback" — move the duration slider, see it replay right here.
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
// Dropped into every per-type panel (see nodeComponents.tsx — every *Panel
// ends with one <AnimationPanel .../> call). Reads/writes node.props.animation
// directly — NOT through patchStyle/patchNodeStyle, since animation isn't a
// per-breakpoint style value (see AnimationProps in animations.ts).

export function AnimationPanel({
  value, onChange,
}: {
  value?: AnimationProps
  onChange: (next: AnimationProps) => void
}) {
  const a = { ...DEFAULT_ANIMATION, ...value }
  const isNone = (a.effect ?? 'none') === 'none'

  function patch(partial: Partial<AnimationProps>) {
    onChange({ ...a, ...partial })
  }

  return (
    <FieldGroup label="Animation">
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
        </>
      )}
    </FieldGroup>
  )
}