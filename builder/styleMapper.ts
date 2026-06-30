// ─── Tailwind 4 approach ──────────────────────────────────────────────────────
// Tailwind 4 scans source files and generates classes on demand — no safelist needed.
// BUT: dynamically assembled strings like `px-${n}` are NOT scanned.
//
// Strategy: store structured style props, then map them to:
//   1. Tailwind utility classes for enum-like values (colors, display, flex direction…)
//   2. CSS custom properties via `style` prop for numeric/dynamic values (spacing, sizes)
//
// This gives us the best of both worlds: Tailwind theming + dynamic values.

export interface StyleProps {
  // Spacing — stored as px numbers, applied as CSS vars
  px?: number; py?: number
  pt?: number; pb?: number
  pl?: number; pr?: number
  mx?: number; my?: number
  mt?: number; mb?: number
  gap?: number

  // Colors — enum values → static Tailwind classes (these are scanned at build time)
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

  // Helpers
  centerContent?: boolean  // mx-auto
}

// ─── Build className (enum/keyword values only) ───────────────────────────────
// These classes exist statically in your source — Tailwind 4 will scan them.

export function buildClassName(style: StyleProps = {}, extra?: string): string {
  const c: string[] = []

  // Background
  if (style.bgColor === 'white')       c.push('bg-white')
  else if (style.bgColor === 'black')  c.push('bg-black')
  else if (style.bgColor === 'transparent') c.push('bg-transparent')
  else if (style.bgColor)              c.push(`bg-${style.bgColor}`)

  // Text color
  if (style.textColor === 'white')     c.push('text-white')
  else if (style.textColor === 'black') c.push('text-black')
  else if (style.textColor)            c.push(`text-${style.textColor}`)

  // Border color
  if (style.borderColor)               c.push(`border-${style.borderColor}`)

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

// ─── Build inline style (numeric/dynamic values) ──────────────────────────────

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

  return s
}

// ─── Color presets (used in panel UI) ────────────────────────────────────────

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