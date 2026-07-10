
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

  ml?: number | 'auto'
  mr?: number | 'auto'

  // Colors — resolved to real CSS colors and applied inline (see resolveColor)
  bgColor?:    string
  textColor?:  string
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

  // Sizing — stored as numbers, unit depends on widthUnit
  width?:     number | 'full' | 'auto' | 'screen' | '1/2' | '1/3' | '2/3' | '1/4' | '3/4'
  // When width is a plain number, widthUnit says how to interpret it:
  //   'px' (default if unset) — an absolute pixel width. Used by explicit
  //     "Fixed pixels" choices (e.g. ImagePanel's Width mode dropdown) —
  //     deliberately container-agnostic, stays the same size everywhere.
  //   '%' — a percentage of this element's immediate parent container.
  //     Used by interactive canvas resize-handle drags (see ResizeHandles),
  //     so a block resized to "look right" in a narrower editor panel keeps
  //     the SAME visual proportion in a wider Preview/live page, instead of
  //     an absolute px number silently becoming a smaller or larger
  //     fraction of a differently-sized container.
  widthUnit?: 'px' | '%'
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
  bgOverlay?:  number
  bgGradient?: string

  // Helpers
  centerContent?: boolean  // legacy — see buildAlignMargin
}

// ─── Color resolution ──────────────────────────────────────────────────────

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
  return COLOR_HEX[value] ?? value
}

// ─── Build className (enum/keyword values only) ───────────────────────────────

export function buildClassName(style: StyleProps = {}, extra?: string): string {
  const c: string[] = []

  if (style.fontSize)    c.push(`text-${style.fontSize}`)
  if (style.fontWeight)  c.push(`font-${style.fontWeight}`)
  if (style.textAlign)   c.push(`text-${style.textAlign}`)
  if (style.leading)     c.push(`leading-${style.leading}`)
  if (style.italic)      c.push('italic')
  if (style.uppercase)   c.push('uppercase')

  if (style.display)    c.push(style.display)
  if (style.flexDir)    c.push(`flex-${style.flexDir}`)
  if (style.flexWrap)   c.push(`flex-${style.flexWrap}`)
  if (style.justify)    c.push(`justify-${style.justify}`)
  if (style.align)      c.push(`items-${style.align}`)
  if (style.flex)       c.push(`flex-${style.flex}`)

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

  if (style.rounded && style.rounded !== 'none') c.push(`rounded-${style.rounded}`)
  if (style.borderWidth !== undefined && style.borderWidth > 0)
    c.push(style.borderWidth === 1 ? 'border' : `border-${style.borderWidth}`)
  if (style.borderStyle)  c.push(`border-${style.borderStyle}`)

  if (style.shadow && style.shadow !== 'none') c.push(`shadow-${style.shadow}`)

  if (style.objectFit === 'cover')     c.push('object-cover')
  else if (style.objectFit === 'contain') c.push('object-contain')
  else if (style.objectFit === 'fill')    c.push('object-fill')
  else if (style.objectFit === 'none')    c.push('object-none')

  if (style.objectPosition) c.push(`object-${style.objectPosition.replace(' ', '-')}`)

  if (extra) c.push(extra)
  return c.filter(Boolean).join(' ')
}

// ─── Build inline style (numeric/dynamic values + colors + backgrounds) ───────

export function buildInlineStyle(
  style: StyleProps = {},
  opts: { skipSizing?: boolean } = {},
): React.CSSProperties {
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

  // skipSizing is used by every *Editor* component (rendered inside
  // SelectableShell) — the wrapper already applies width/maxWidth via
  // buildBoxSizingStyle. Applying the SAME numeric/percentage width a
  // second time, nested one level deeper, is harmless for an absolute px
  // value (623px means 623px regardless of nesting) but actively WRONG
  // for a percentage: 45% of an element whose own parent is already 45%
  // of the real container resolves to ~20%, not 45%. That compounding —
  // invisible until something has a background color to reveal it — was
  // the actual cause of "background only fills part of the box."
  // *Preview* components have no such wrapper (RenderPreviewNode renders
  // them directly), so they must keep calling this without skipSizing.
  if (!opts.skipSizing) {
    if (typeof style.width === 'number') {
      s.width      = style.widthUnit === '%' ? `${style.width}%` : style.width
      s.flexGrow   = 0
      s.flexShrink = 0
    }

    if (typeof style.maxWidth === 'number') {
      s.maxWidth = style.maxWidth
    } else if (style.maxWidth === 'full') {
      s.maxWidth = '100%'
    } else if (typeof style.width === 'number' && style.widthUnit !== '%') {
      s.maxWidth = '100%'
    }
  }

  if (typeof style.minHeight === 'number') s.minHeight = style.minHeight
  if (typeof style.height    === 'number') s.height    = style.height
  if (style.opacity !== undefined)         s.opacity   = style.opacity / 100

  if (style.aspectRatio && style.aspectRatio !== 'auto') {
    s.aspectRatio = style.aspectRatio
  }

  if (style.bgColor)     s.backgroundColor = resolveColor(style.bgColor)
  if (style.textColor)   s.color           = resolveColor(style.textColor)
  if (style.borderColor) s.borderColor     = resolveColor(style.borderColor)

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

export function getBoxAlign(style: StyleProps = {}): BoxAlign {
  if (style.ml === 'auto' && style.mr === 'auto') return 'center'
  if (style.ml === 'auto') return 'right'
  if (style.mr === 'auto') return 'left'
  if (style.centerContent) return 'center'
  return 'left'
}

export function setBoxAlign(align: BoxAlign): Partial<StyleProps> {
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
  if (style.centerContent && !hasML && !hasMR) {
    s.marginLeft  = 'auto'
    s.marginRight = 'auto'
  }
  return s
}

// ─── Box sizing for the SelectableShell wrapper ────────────────────────────
// Mirrors the sizing subset of buildInlineStyle onto the SelectableShell
// wrapper — the wrapper is the real flex/layout item in a flex parent, so it
// needs to carry the same width/height or the outline/handles visually
// detach from what's actually rendering.

export function buildBoxSizingStyle(style: StyleProps = {}): React.CSSProperties {
  const s: React.CSSProperties = {
    minWidth:  0,
    minHeight: 0,
  }

  if (typeof style.width === 'number') {
    s.width      = style.widthUnit === '%' ? `${style.width}%` : style.width
    s.flexGrow   = 0
    s.flexShrink = 0
  } else if (style.width === 'full')  s.width = '100%'
  else if (style.width === '1/2')     s.width = '50%'
  else if (style.width === '1/3')     s.width = '33.3333%'
  else if (style.width === '2/3')     s.width = '66.6667%'
  else if (style.width === '1/4')     s.width = '25%'
  else if (style.width === '3/4')     s.width = '75%'

  if (typeof style.maxWidth === 'number') s.maxWidth = style.maxWidth
  else if (style.maxWidth === 'full')     s.maxWidth = '100%'
  else if (typeof style.width === 'number' && style.widthUnit !== '%') {
    s.maxWidth = '100%'
  }

  if (typeof style.height === 'number')    s.height    = style.height
  if (typeof style.minHeight === 'number') s.minHeight = style.minHeight

  if (style.aspectRatio && style.aspectRatio !== 'auto') s.aspectRatio = style.aspectRatio

  if (typeof style.mx === 'number') { s.marginLeft = style.mx * 4; s.marginRight  = style.mx * 4 }
  if (typeof style.my === 'number') { s.marginTop  = style.my * 4; s.marginBottom = style.my * 4 }
  if (typeof style.mt === 'number')   s.marginTop    = style.mt * 4
  if (typeof style.mb === 'number')   s.marginBottom = style.mb * 4

  Object.assign(s, buildAlignMargin(style))

  return s
}

// ─── Flex layout mirror (fixes Section's inner wrapper div) ───────────────

export function buildFlexLayoutClassName(style: StyleProps = {}): string {
  const c: string[] = []
  if (style.display)  c.push(style.display)
  if (style.flexDir)  c.push(`flex-${style.flexDir}`)
  if (style.flexWrap) c.push(`flex-${style.flexWrap}`)
  if (style.justify)  c.push(`justify-${style.justify}`)
  if (style.align)    c.push(`items-${style.align}`)
  return c.join(' ')
}

export function buildFlexLayoutStyle(style: StyleProps = {}): React.CSSProperties {
  const s: React.CSSProperties = {}
  if (style.gap !== undefined) s.gap = style.gap * 4
  return s
}

// ─── Section-specific split (full-bleed background fix) ───────────────────
// Section is the only node type that needs BOTH a background spanning the
// full page width AND a centered max-width content column. One element
// can't do both — max-width + mx:auto necessarily clips the background to
// that same narrow box (this was the bug: max-width, centering, padding,
// AND background were all being applied to a single <section> element, so
// the background could never reach past the centered column's own edges).
//
// These two helpers split a Section's StyleProps into:
//   - an OUTER "band": background + vertical padding only, full width,
//     no max-width — this is what SectionEditor/SectionPreview's root
//     <section> should use.
//   - an INNER "column": max-width + horizontal padding + centering +
//     flex layout — this is what the nested content <div> should use.
//
// Only Section uses these; every other node type keeps using
// buildClassName/buildInlineStyle as before, since only Section combines
// maxWidth with a background in its panel.

export function buildSectionOuterStyle(
  style: StyleProps = {},
  opts: { skipSizing?: boolean } = {},
): React.CSSProperties {
  const s: React.CSSProperties = {}

  if (style.pt !== undefined) s.paddingTop = style.pt * 4
  else if (style.py !== undefined) s.paddingTop = style.py * 4
  if (style.pb !== undefined) s.paddingBottom = style.pb * 4
  else if (style.py !== undefined) s.paddingBottom = style.py * 4

  if (style.bgColor) s.backgroundColor = resolveColor(style.bgColor)
  if (style.bgImage) {
    s.backgroundImage    = `url(${style.bgImage})`
    s.backgroundSize     = style.bgSize ?? 'cover'
    s.backgroundPosition = style.bgPos ?? 'center'
    s.backgroundRepeat   = 'no-repeat'
  } else if (style.bgGradient) {
    s.backgroundImage = style.bgGradient
  }

  // Text color — CSS `color` is inheritable, so a Section-level textColor is
  // meant to cascade down to any child that doesn't set its own explicit
  // color. buildInlineStyle (what SectionPreview's outer <section> uses)
  // always applied `color` here; this function — used by SectionEditor's
  // outer <section> — never did, so a Section text-color change was saved
  // correctly but had nowhere to land in the DOM in the Editor.
  if (style.textColor) s.color = resolveColor(style.textColor)

  // Border color — same gap as textColor above. Without this, a Section
  // with borderWidth/borderStyle set (via buildSectionOuterClassName below)
  // would render a border in the browser's default color instead of the
  // one actually configured.
  if (style.borderColor) s.borderColor = resolveColor(style.borderColor)

  if (style.opacity !== undefined) s.opacity = style.opacity / 100

  // Vertical margin (mt/mb/my) — this is the piece that got dropped when
  // the outer/inner split was first introduced. buildAlignMargin (ml/mr
  // horizontal centering) correctly moved to buildSectionInnerStyle, but
  // mt/mb/my were never carried over to EITHER function, so a Section's
  // own Margin Top/Bottom panel controls silently did nothing — the value
  // changed in state but no render path ever read it. Same my-then-mt/mb
  // override order buildInlineStyle always used.
  if (style.my !== undefined) { s.marginTop = style.my * 4; s.marginBottom = style.my * 4 }
  if (style.mt !== undefined)   s.marginTop    = style.mt * 4
  if (style.mb !== undefined)   s.marginBottom = style.mb * 4

  // Same skipSizing gate buildInlineStyle has always had: in the EDITOR,
  // the SelectableShell wrapper already applies width/maxWidth via
  // buildBoxSizingStyle, so the section itself skips it. In PREVIEW there
  // is no such wrapper, so this outer band must apply the real dragged
  // width itself — this is what makes a resize-handle drag actually show
  // up in Preview. (This got dropped when the outer/inner split was first
  // introduced, which is why drag-resized widths stopped appearing in
  // Preview — this restores that exact original behavior.)
  if (!opts.skipSizing) {
    if (typeof style.width === 'number') {
      s.width      = style.widthUnit === '%' ? `${style.width}%` : style.width
      s.flexGrow   = 0
      s.flexShrink = 0
    }

    if (typeof style.maxWidth === 'number') {
      s.maxWidth = style.maxWidth
    } else if (typeof style.width === 'number' && style.widthUnit !== '%') {
      s.maxWidth = '100%'
    }
  }

  return s
}

// CONFIRMED bug fix: SectionEditor's outer <section> was hardcoded to
// className="w-full relative" and never merged in ANY dynamic class at
// all — so anything expressed purely as a Tailwind class (rounded, border,
// border-style, shadow, and incidentally any typography class, since CSS
// properties like `color`/`text-align` are inheritable and correctly
// cascade to children regardless of which ancestor element carries them)
// rendered fine in Preview (whose outer <section> DOES call
// buildClassName) but never appeared in the Editor. Concrete example: the
// Newsletter Signup template sets `rounded: 'xl'` directly on its Section —
// rounded corners in Preview, square corners in the Editor.
//
// This takes the FULL className buildClassName would produce and strips out
// only the layout classes (display/flexDir/flexWrap/justify/align) and
// sizing classes (width/maxWidth/minHeight/height enums) that
// buildSectionInnerClassName/buildFlexLayoutClassName already own by design
// in the split model — those belong on the INNER column, not the outer
// band. Everything else (rounded, border, shadow, typography) passes
// through untouched, so the outer element ends up with exactly the classes
// it's actually supposed to have — no more, no less.
export function buildSectionOuterClassName(style: StyleProps = {}, extra?: string): string {
  const DISPLAY_VALUES = new Set(['block', 'flex', 'grid', 'inline', 'inline-block', 'inline-flex', 'hidden'])
  const full = buildClassName(style)
  const filtered = full
    .split(' ')
    .filter(Boolean)
    .filter(cls =>
      !DISPLAY_VALUES.has(cls) &&
      !cls.startsWith('flex-') &&
      !cls.startsWith('justify-') &&
      !cls.startsWith('items-') &&
      !cls.startsWith('w-') &&
      !cls.startsWith('max-w-') &&
      !cls.startsWith('min-h-') &&
      !cls.startsWith('h-')
    )
    .join(' ')
  return [filtered, extra].filter(Boolean).join(' ')
}

export function buildSectionInnerClassName(style: StyleProps = {}): string {
  const c: string[] = ['w-full']
  if (style.maxWidth === 'full') c.push('max-w-full')
  else if (typeof style.maxWidth === 'string') c.push(`max-w-${style.maxWidth}`)
  const flex = buildFlexLayoutClassName(style)
  if (flex) c.push(flex)
  return c.filter(Boolean).join(' ')
}

export function buildSectionInnerStyle(style: StyleProps = {}): React.CSSProperties {
  const s: React.CSSProperties = {}

  if (typeof style.maxWidth === 'number') s.maxWidth = style.maxWidth

  if (style.pl !== undefined) s.paddingLeft = style.pl * 4
  else if (style.px !== undefined) s.paddingLeft = style.px * 4
  if (style.pr !== undefined) s.paddingRight = style.pr * 4
  else if (style.px !== undefined) s.paddingRight = style.px * 4

  Object.assign(s, buildAlignMargin(style))   // centering (ml/mr auto) lives HERE now
  Object.assign(s, buildFlexLayoutStyle(style)) // gap

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