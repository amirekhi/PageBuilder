// ─── Tailwind 4 approach ──────────────────────────────────────────────────────
// Tailwind 4 scans source files and generates classes on demand — no safelist needed.
// BUT: dynamically assembled strings like `px-${n}` are NOT scanned.
//
// Strategy: store structured style props, then map them to:
//   1. Tailwind utility classes for enum-like values (display, flex direction…)
//   2. CSS custom properties via `style` prop for numeric/dynamic values (spacing, sizes)
//   3. Inline CSS for anything color/background related (bgColor, textColor,
//      borderColor, bgImage, bgGradient) — these were previously built as
//      dynamic Tailwind classes (e.g. `bg-${bgColor}`), which Tailwind 4's
//      static scanner can never see, so most of them silently rendered
//      nothing. Resolving to real hex values / CSS strings and applying via
//      the `style` attribute sidesteps the scanner entirely and guarantees
//      every color/gradient/image actually renders, both in the live editor
//      and in the exported static HTML.

export interface StyleProps {
  // Spacing — stored as px numbers, applied as CSS vars
  px?: number; py?: number
  pt?: number; pb?: number
  pl?: number; pr?: number
  mx?: number; my?: number
  mt?: number; mb?: number
  gap?: number

  // Colors — resolved to real CSS colors and applied inline (see resolveColor)
  bgColor?:    string   // e.g. 'violet-500', 'white', 'transparent'
  textColor?:  string   // e.g. 'neutral-700', 'white'
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

  // Image-specific (Elementor-style fit controls) — keeps every image the
  // same box size regardless of its native dimensions, with control over
  // how the image fills that box.
  objectFit?:      'cover'|'contain'|'fill'|'none'
  aspectRatio?:    'auto'|'1/1'|'4/3'|'16/9'|'3/2'|'21/9'
  objectPosition?: 'center'|'top'|'bottom'|'left'|'right'|'top left'|'top right'|'bottom left'|'bottom right'

  // Background image / gradient / overlay — primarily used on sections
  // bgImage:   full URL string, applied as CSS background-image
  // bgSize:    controls how the image fills the element
  // bgPos:     focal point of the background image
  // bgOverlay: 0-90 opacity of a dark overlay on top of the image (for text legibility)
  // bgGradient: a preset value from GRADIENT_PRESETS — stored as a ready-to-use
  //             CSS `linear-gradient(...)` string, applied directly as background-image
  bgImage?:    string
  bgSize?:     'cover' | 'contain' | 'auto'
  bgPos?:      'center' | 'top' | 'bottom' | 'left' | 'right'
  bgOverlay?:  number   // 0–90, percentage darkness
  bgGradient?: string   // e.g. 'linear-gradient(to right, #7c3aed, #4f46e5)'

  // Helpers
  centerContent?: boolean  // mx-auto
}

// ─── Color resolution (hex values, used inline — bypasses Tailwind's scanner) ─
// Keep the *keys* here in sync with COLOR_PRESETS below so every preset in
// the picker actually renders. If someone ever passes a raw hex/CSS color
// string that isn't a known key, we just pass it through unchanged so custom
// colors keep working too.

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
// These classes exist statically in your source — Tailwind 4 will scan them.
// NOTE: color-related utilities (bg-*, text-*, border-* colors) are
// deliberately NOT generated here anymore — see resolveColor / buildInlineStyle.

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

  // Image fit (static enum classes — scanned fine by Tailwind)
  if (style.objectFit === 'cover')     c.push('object-cover')
  else if (style.objectFit === 'contain') c.push('object-contain')
  else if (style.objectFit === 'fill')    c.push('object-fill')
  else if (style.objectFit === 'none')    c.push('object-none')

  if (style.objectPosition) c.push(`object-${style.objectPosition.replace(' ', '-')}`)

  // Helpers
  if (style.centerContent) c.push('mx-auto')

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

  // Numeric sizes
  if (typeof style.width     === 'number') s.width     = style.width
  if (typeof style.maxWidth  === 'number') s.maxWidth  = style.maxWidth
  if (typeof style.minHeight === 'number') s.minHeight = style.minHeight
  if (typeof style.height    === 'number') s.height    = style.height
  if (style.opacity !== undefined)         s.opacity   = style.opacity / 100

  // Aspect ratio — this is what makes every image box the SAME shape
  // regardless of the source photo's native dimensions
  if (style.aspectRatio && style.aspectRatio !== 'auto') {
    s.aspectRatio = style.aspectRatio
  }

  // Colors — resolved to real CSS values, applied inline (see resolveColor).
  // This is the fix for "some colors show, some don't": these used to be
  // built as dynamic Tailwind classes which the Tailwind 4 compiler can't
  // discover at build time.
  if (style.bgColor)     s.backgroundColor = resolveColor(style.bgColor)
  if (style.textColor)   s.color           = resolveColor(style.textColor)
  if (style.borderColor) s.borderColor     = resolveColor(style.borderColor)

  // Background image / gradient — this is the actual fix for images not
  // showing at all: previously nothing ever wrote background-image here.
  // Image takes priority; if there's no image but a gradient is set, the
  // gradient becomes the background-image instead. bgColor (above) still
  // applies underneath, so it shows through transparent areas / while the
  // image loads.
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

// ─── Color presets (used in panel UI) ────────────────────────────────────────
// Keep in sync with COLOR_HEX above.

export const COLOR_PRESETS = [
  // Neutrals
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
  // Violet
  { label: 'Violet 50',    value: 'violet-50' },
  { label: 'Violet 100',   value: 'violet-100' },
  { label: 'Violet 500',   value: 'violet-500' },
  { label: 'Violet 600',   value: 'violet-600' },
  { label: 'Violet 700',   value: 'violet-700' },
  // Blue
  { label: 'Blue 50',      value: 'blue-50' },
  { label: 'Blue 500',     value: 'blue-500' },
  { label: 'Blue 600',     value: 'blue-600' },
  // Green
  { label: 'Green 50',     value: 'green-50' },
  { label: 'Green 500',    value: 'green-500' },
  { label: 'Green 600',    value: 'green-600' },
  // Red
  { label: 'Red 50',       value: 'red-50' },
  { label: 'Red 500',      value: 'red-500' },
  { label: 'Red 600',      value: 'red-600' },
  // Amber
  { label: 'Amber 50',     value: 'amber-50' },
  { label: 'Amber 400',    value: 'amber-400' },
  { label: 'Amber 500',    value: 'amber-500' },
]

// ─── Gradient presets ─────────────────────────────────────────────────────────
// Stored as ready-to-use CSS `linear-gradient(...)` strings (not Tailwind
// utility fragments) so they can be applied directly via backgroundImage in
// buildInlineStyle, with zero dependency on Tailwind's class scanner.

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
// Returns inline styles for a dark scrim div that sits between the background
// and the section content. Used by SectionEditor and SectionPreview.

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