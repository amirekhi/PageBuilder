// ─── Tailwind 4 approach ──────────────────────────────────────────────────────
// Tailwind 4 scans source files and generates classes on demand — no safelist needed.
// BUT: dynamically assembled strings like `px-${n}` are NOT scanned.
//
// Strategy: store structured style props, then map them to:
//   1. Tailwind utility classes for enum-like values (display, flex direction…)
//   2. CSS custom properties via `style` prop for numeric/dynamic values (spacing, sizes)
//   3. Inline CSS for anything color/background related (bgColor, textColor,
//      borderColor, bgImage, bgGradient) — resolved to real hex/CSS values and
//      applied via the `style` attribute, sidestepping Tailwind's static scanner.

export interface StyleProps {
  // Spacing — stored as px numbers, applied as CSS vars
  px?: number; py?: number
  pt?: number; pb?: number
  pl?: number; pr?: number
  mx?: number; my?: number
  mt?: number; mb?: number
  gap?: number
  
  
  ml?: number | 'auto'   // NEW — supports 'auto' for left/center/right alignment
  mr?: number | 'auto'   // NEW
  // Colors — resolved to real CSS colors and applied inline (see resolveColor)
  bgColor?:    string   // e.g. 'violet-500', 'white', 'transparent', or any hex
  textColor?:  string   // e.g. 'neutral-700', 'white', or any hex
  borderColor?: string

  // Typography
  fontSize?:   'xs'|'sm'|'base'|'lg'|'xl'|'2xl'|'3xl'|'4xl'|'5xl'|'6xl'
  fontWeight?: 'light'|'normal'|'medium'|'semibold'|'bold'|'extrabold'
  textAlign?:  'left'|'center'|'right'|'justify'
  leading?:    'none'|'tight'|'snug'|'normal'|'relaxed'|'loose'
  italic?:     boolean
  uppercase?:  boolean

  // Layout
  display?:   'block'|'flex'|'grid'|'inline'|'inline-block'|'inline-flex'|'hidden'
  flexDir?:   'row'|'col'|'row-reverse'|'col-reverse'
  flexWrap?:  'wrap'|'nowrap'
  justify?:   'start'|'end'|'center'|'between'|'around'|'evenly'
  align?:     'start'|'end'|'center'|'stretch'|'baseline'
  flex?:      '1'|'auto'|'none'

  // Sizing — stored as numbers (px) applied via CSS
  width?:     number | 'full' | 'auto' | 'screen' | '1/2' | '1/3' | '2/3' | '1/4' | '3/4'
  maxWidth?:  number | 'xs'|'sm'|'md'|'lg'|'xl'|'2xl'|'3xl'|'4xl'|'5xl'|'6xl'|'7xl'|'full'
  minHeight?: number | 'screen' | 'full'
  height?:    number | 'auto' | 'full' | 'screen'

  // Border
  rounded?:     'none'|'sm'|'md'|'lg'|'xl'|'2xl'|'3xl'|'full'
  borderWidth?:  0|1|2|4|8
  borderStyle?:  'solid'|'dashed'|'dotted'

  // Effects
  shadow?:    'none'|'sm'|'md'|'lg'|'xl'|'2xl'
  opacity?:   number   // 0-100

  // Image-specific (Elementor-style fit controls)
  objectFit?:      'cover'|'contain'|'fill'|'none'
  aspectRatio?:    'auto'|'1/1'|'4/3'|'16/9'|'3/2'|'21/9'
  objectPosition?: 'center'|'top'|'bottom'|'left'|'right'|'top left'|'top right'|'bottom left'|'bottom right'

  // Background image / gradient / overlay — primarily used on sections
  bgImage?:    string
  bgSize?:     'cover' | 'contain' | 'auto'
  bgPos?:      'center' | 'top' | 'bottom' | 'left' | 'right'
  bgOverlay?:  number   // 0–90, percentage darkness
  bgGradient?: string   // e.g. 'linear-gradient(to right, #7c3aed, #4f46e5)'

  // Helpers
  centerContent?: boolean  // mx-auto
}

// ─── Color resolution (hex values, used inline — bypasses Tailwind's scanner) ─

const COLOR_HEX: Record<string, string> = {
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',

  'slate-50': '#f8fafc',
  'slate-100': '#f1f5f9',
  'slate-200': '#e2e8f0',
  'slate-700': '#334155',
  'slate-800': '#1e293b',
  'slate-900': '#0f172a',

  'neutral-50': '#fafafa',
  'neutral-100': '#f5f5f5',
  'neutral-200': '#e5e5e5',
  'neutral-700': '#404040',
  'neutral-900': '#171717',

  'violet-50': '#f5f3ff',
  'violet-100': '#ede9fe',
  'violet-500': '#8b5cf6',
  'violet-600': '#7c3aed',
  'violet-700': '#6d28d9',

  'blue-50': '#eff6ff',
  'blue-500': '#3b82f6',
  'blue-600': '#2563eb',

  'green-50': '#f0fdf4',
  'green-500': '#22c55e',
  'green-600': '#16a34a',

  'red-50': '#fef2f2',
  'red-500': '#ef4444',
  'red-600': '#dc2626',

  'amber-50': '#fffbeb',
  'amber-400': '#fbbf24',
  'amber-500': '#f59e0b',
}

export function resolveColor(value?: string): string | undefined {
  if (!value) return undefined
  return COLOR_HEX[value] ?? value // fall back to raw value (hex, rgb(), etc.)
}

// ─── Build className (enum/keyword values only) ───────────────────────────────

export function buildClassName(style: StyleProps = {}, extra?: string): string {
  const c: string[] = []

  // Typography
  if (style.fontSize)    c.push(`text-${style.fontSize}`)
  if (style.fontWeight)  c.push(`font-${style.fontWeight}`)
  if (style.textAlign)   c.push(`text-${style.textAlign}`)
  if (style.leading)     c.push(`leading-${style.leading}`)
  if (style.italic)      c.push('italic')
  if (style.uppercase)   c.push('uppercase')

  // Layout
  if (style.display)    c.push(style.display)
  if (style.flexDir)    c.push(`flex-${style.flexDir}`)
  if (style.flexWrap)   c.push(`flex-${style.flexWrap}`)
  if (style.justify)    c.push(`justify-${style.justify}`)
  if (style.align)      c.push(`items-${style.align}`)
  if (style.flex)       c.push(`flex-${style.flex}`)

  // Sizing (keyword variants)
  if (style.width === 'full')   c.push('w-full')
  else if (style.width === 'auto')   c.push('w-auto')
  else if (style.width === 'screen') c.push('w-screen')
  else if (style.width === '1/2')    c.push('w-1/2')
  else if (style.width === '1/3')    c.push('w-1/3')
  else if (style.width === '2/3')    c.push('w-2/3')
  else if (style.width === '1/4')    c.push('w-1/4')
  else if (style.width === '3/4')    c.push('w-3/4')

  if (style.maxWidth === 'full')  c.push('max-w-full')
  else if (typeof style.maxWidth === 'string') c.push(`max-w-${style.maxWidth}`)

  if (style.minHeight === 'screen') c.push('min-h-screen')
  else if (style.minHeight === 'full') c.push('min-h-full')

  if (style.height === 'auto')   c.push('h-auto')
  else if (style.height === 'full')   c.push('h-full')
  else if (style.height === 'screen') c.push('h-screen')

  // Border
  if (style.rounded && style.rounded !== 'none') c.push(`rounded-${style.rounded}`)
  if (style.borderWidth !== undefined && style.borderWidth > 0)
    c.push(style.borderWidth === 1 ? 'border' : `border-${style.borderWidth}`)
  if (style.borderStyle)  c.push(`border-${style.borderStyle}`)

  // Effects
  if (style.shadow && style.shadow !== 'none') c.push(`shadow-${style.shadow}`)

  // Image fit
  if (style.objectFit === 'cover')     c.push('object-cover')
  else if (style.objectFit === 'contain') c.push('object-contain')
  else if (style.objectFit === 'fill')    c.push('object-fill')
  else if (style.objectFit === 'none')    c.push('object-none')

  if (style.objectPosition) c.push(`object-${style.objectPosition.replace(' ', '-')}`)



  if (extra) c.push(extra)
  return c.filter(Boolean).join(' ')
}

// ─── Build inline style (numeric/dynamic values + colors + backgrounds) ───────

export function buildInlineStyle(style: StyleProps = {}): React.CSSProperties {
  const s: React.CSSProperties = {}

  if (style.px  !== undefined) { s.paddingLeft  = style.px * 4;  s.paddingRight  = style.px * 4 }
  if (style.py  !== undefined) { s.paddingTop   = style.py * 4;  s.paddingBottom = style.py * 4 }
  if (style.pt  !== undefined)   s.paddingTop    = style.pt * 4
  if (style.pb  !== undefined)   s.paddingBottom = style.pb * 4
  if (style.pl  !== undefined)   s.paddingLeft   = style.pl * 4
  if (style.pr  !== undefined)   s.paddingRight  = style.pr * 4
  if (style.mx  !== undefined) { s.marginLeft   = style.mx * 4;  s.marginRight   = style.mx * 4 }
  if (style.my  !== undefined) { s.marginTop    = style.my * 4;  s.marginBottom  = style.my * 4 }
  if (style.mt  !== undefined)   s.marginTop    = style.mt * 4
  if (style.mb  !== undefined)   s.marginBottom = style.mb * 4
  if (style.gap !== undefined)   s.gap          = style.gap * 4
Object.assign(s, buildAlignMargin(style))

// Numeric sizes
if (typeof style.width === 'number') {
  s.width      = style.width
  s.flexGrow   = 0
  s.flexShrink = 0
  // No flexBasis here — flex-basis sizes the *main* axis of the parent
  // flex container (height when the parent is flex-col, width when it's
  // flex-row). Setting it from `width` unconditionally was forcing a
  // column-direction parent's height to whatever pixel width you'd just
  // dragged. Leaving flex-basis at its default (auto) makes it fall back
  // to reading width/height directly for whichever axis is actually the
  // main one — so width only ever affects width, on any parent.
}

if (typeof style.maxWidth === 'number') {
  s.maxWidth = style.maxWidth
} else if (style.maxWidth === 'full') {
  s.maxWidth = '100%'
} else if (typeof style.width === 'number') {
  // A drag-resized pixel width is a preferred width, not a guarantee — it
  // should never exceed whatever room its container actually has.
  s.maxWidth = '100%'
}

if (typeof style.minHeight === 'number') s.minHeight = style.minHeight
if (typeof style.height    === 'number') s.height    = style.height
  if (style.opacity !== undefined)         s.opacity   = style.opacity / 100

  if (style.aspectRatio && style.aspectRatio !== 'auto') {
    s.aspectRatio = style.aspectRatio
  }

  // Colors — resolved to real CSS values, applied inline (see resolveColor).
  if (style.bgColor)     s.backgroundColor = resolveColor(style.bgColor)
  if (style.textColor)   s.color           = resolveColor(style.textColor)
  if (style.borderColor) s.borderColor     = resolveColor(style.borderColor)

  // Background image / gradient
  if (style.bgImage) {
    s.backgroundImage    = `url(${style.bgImage})`
    s.backgroundSize     = style.bgSize ?? 'cover'
    s.backgroundPosition = style.bgPos ?? 'center'
    s.backgroundRepeat   = 'no-repeat'
  } else if (style.bgGradient) {
    s.backgroundImage = style.bgGradient
  }

  return s
}

export type BoxAlign = 'left' | 'center' | 'right'

// Single source of truth for "where does this box sit when it's narrower
// than its container" — used by both the node's own rendered style and by
// SelectableShell's wrapper, so they can never drift apart the way
// centerContent-as-a-class did.
export function getBoxAlign(style: StyleProps = {}): BoxAlign {
  if (style.ml === 'auto' && style.mr === 'auto') return 'center'
  if (style.ml === 'auto') return 'right'
  if (style.mr === 'auto') return 'left'
  if (style.centerContent) return 'center' // legacy pages/templates
  return 'left'
}

export function setBoxAlign(align: BoxAlign): Partial<StyleProps> {
  // Clearing centerContent means ml/mr become the only source of truth
  // going forward — no risk of the old flag and new margins disagreeing.
  if (align === 'center') return { ml: 'auto', mr: 'auto', centerContent: undefined }
  if (align === 'right')  return { ml: 'auto', mr: 0,      centerContent: undefined }
  return                       { ml: 0,      mr: 'auto', centerContent: undefined }
}

export function buildAlignMargin(style: StyleProps = {}): React.CSSProperties {
  const s: React.CSSProperties = {}
  const hasML = style.ml !== undefined
  const hasMR = style.mr !== undefined
  if (hasML) s.marginLeft  = style.ml === 'auto' ? 'auto' : (style.ml as number) * 4
  if (hasMR) s.marginRight = style.mr === 'auto' ? 'auto' : (style.mr as number) * 4
  // Legacy fallback for anything saved before ml/mr existed.
  if (style.centerContent && !hasML && !hasMR) {
    s.marginLeft  = 'auto'
    s.marginRight = 'auto'
  }
  return s
}
// ─── Box sizing for the SelectableShell wrapper ────────────────────────────
// buildInlineStyle() applies width/height to whichever element the node's
// own Editor component happens to render at its root. But in a flex parent
// (Columns, or a Section with flexDir row), the thing actually participating
// in that flex layout is the SelectableShell wrapper *around* the node, not
// the node's own inner element one level down. If the wrapper doesn't carry
// the same width/height, the outline and resize handles drift away from
// what you're actually seeing resize.
//
// This intentionally mirrors only box-affecting properties (never padding,
// margin, or colors) so nothing gets doubled up visually — it just makes
// sure the *box* the wrapper occupies matches the box the content renders.
export function buildBoxSizingStyle(style: StyleProps = {}): React.CSSProperties {
  const s: React.CSSProperties = {
    minWidth:  0,
    minHeight: 0,
  }

  if (typeof style.width === 'number') {
    s.width      = style.width
    s.flexGrow   = 0
    s.flexShrink = 0
    // (see buildInlineStyle above — no flexBasis, same reasoning)
  } else if (style.width === 'full')  s.width = '100%'
  else if (style.width === '1/2')     s.width = '50%'
  else if (style.width === '1/3')     s.width = '33.3333%'
  else if (style.width === '2/3')     s.width = '66.6667%'
  else if (style.width === '1/4')     s.width = '25%'
  else if (style.width === '3/4')     s.width = '75%'

  if (typeof style.maxWidth === 'number') s.maxWidth = style.maxWidth
  else if (style.maxWidth === 'full')     s.maxWidth = '100%'
  else if (typeof style.width === 'number') {
    // Mirror the inner element's clamp exactly (see buildInlineStyle) —
    // this was missing here before, which is why the wrapper (the box
    // that actually shows the outline/handles) could still overflow even
    // though the content inside it was correctly capped.
    s.maxWidth = '100%'
  }

  if (typeof style.height === 'number')    s.height    = style.height
  if (typeof style.minHeight === 'number') s.minHeight = style.minHeight

  if (style.aspectRatio && style.aspectRatio !== 'auto') s.aspectRatio = style.aspectRatio
  if (typeof style.mx === 'number') { s.marginLeft = style.mx * 4; s.marginRight = style.mx * 4 }
  if (typeof style.my === 'number') { s.marginTop  = style.my * 4; s.marginBottom = style.my * 4 }

  if (typeof style.mx === 'number') { s.marginLeft = style.mx * 4; s.marginRight  = style.mx * 4 }
  if (typeof style.my === 'number') { s.marginTop  = style.my * 4; s.marginBottom = style.my * 4 }
  if (typeof style.mt === 'number')   s.marginTop    = style.mt * 4
  if (typeof style.mb === 'number')   s.marginBottom = style.mb * 4

  Object.assign(s, buildAlignMargin(style))

  return s
}
// ─── Color presets (used in panel UI) ────────────────────────────────────────

export const COLOR_PRESETS = [
  { label: 'White',        value: 'white' },
  { label: 'Black',        value: 'black' },
  { label: 'Transparent',  value: 'transparent' },
  { label: 'Slate 50',     value: 'slate-50' },
  { label: 'Slate 100',    value: 'slate-100' },
  { label: 'Slate 200',    value: 'slate-200' },
  { label: 'Slate 700',    value: 'slate-700' },
  { label: 'Slate 800',    value: 'slate-800' },
  { label: 'Slate 900',    value: 'slate-900' },
  { label: 'Neutral 50',   value: 'neutral-50' },
  { label: 'Neutral 100',  value: 'neutral-100' },
  { label: 'Neutral 200',  value: 'neutral-200' },
  { label: 'Neutral 700',  value: 'neutral-700' },
  { label: 'Neutral 900',  value: 'neutral-900' },
  { label: 'Violet 50',    value: 'violet-50' },
  { label: 'Violet 100',   value: 'violet-100' },
  { label: 'Violet 500',   value: 'violet-500' },
  { label: 'Violet 600',   value: 'violet-600' },
  { label: 'Violet 700',   value: 'violet-700' },
  { label: 'Blue 50',      value: 'blue-50' },
  { label: 'Blue 500',     value: 'blue-500' },
  { label: 'Blue 600',     value: 'blue-600' },
  { label: 'Green 50',     value: 'green-50' },
  { label: 'Green 500',    value: 'green-500' },
  { label: 'Green 600',    value: 'green-600' },
  { label: 'Red 50',       value: 'red-50' },
  { label: 'Red 500',      value: 'red-500' },
  { label: 'Red 600',      value: 'red-600' },
  { label: 'Amber 50',     value: 'amber-50' },
  { label: 'Amber 400',    value: 'amber-400' },
  { label: 'Amber 500',    value: 'amber-500' },
]

// ─── Gradient presets ─────────────────────────────────────────────────────────

export const GRADIENT_PRESETS: { label: string; value: string }[] = [
  { label: '— None —',              value: '' },
  { label: 'Violet → Indigo',       value: 'linear-gradient(to right, #7c3aed, #4f46e5)' },
  { label: 'Violet → Pink',         value: 'linear-gradient(to right, #7c3aed, #ec4899)' },
  { label: 'Blue → Cyan',           value: 'linear-gradient(to right, #2563eb, #22d3ee)' },
  { label: 'Indigo → Blue',         value: 'linear-gradient(to right, #4f46e5, #3b82f6)' },
  { label: 'Rose → Orange',         value: 'linear-gradient(to right, #f43f5e, #fb923c)' },
  { label: 'Green → Teal',          value: 'linear-gradient(to right, #22c55e, #2dd4bf)' },
  { label: 'Dark: Slate → Neutral', value: 'linear-gradient(to bottom right, #0f172a, #262626)' },
  { label: 'Subtle: White → Slate', value: 'linear-gradient(to bottom, #ffffff, #f8fafc)' },
]

// ─── Overlay helper ───────────────────────────────────────────────────────────

export function buildOverlayStyle(opacity: number | undefined): React.CSSProperties | null {
  if (!opacity || opacity <= 0) return null
  return {
    position:        'absolute',
    inset:           0,
    backgroundColor: `rgba(0,0,0,${opacity / 100})`,
    pointerEvents:   'none',
    zIndex:          0,
  }
}