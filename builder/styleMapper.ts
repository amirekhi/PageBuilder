// Tailwind 4 scans source files and generates classes on demand — no safelist needed.
// BUT: dynamically assembled strings like `px-${n}` are NOT scanned. Tailwind's scanner
// reads raw source TEXT looking for a class name that appears complete and unbroken
// somewhere in the file — it never executes this code. A template literal like
// `justify-${style.justify}` never puts the completed text "justify-end" anywhere in
// the file; only the fragments "justify-" and "style.justify" appear, which don't
// match. Some values used to APPEAR to work purely by coincidence, because that exact
// full class name happened to be hardcoded LITERALLY somewhere else in the app (e.g.
// Button's own literal "justify-center", Avatar's own literal "rounded-full") — but
// that's incidental, not a real fix. This is also why DevTools can show a class NAME
// present on an element but nothing in the Computed tab for it: the class text exists
// in the DOM (React renders whatever string you hand className, regardless of whether
// Tailwind generated a rule for it), but if Tailwind never generated the matching CSS
// rule, there's simply nothing for the browser to compute.
//
// Strategy: store structured style props, then map them to:
//   1. Tailwind utility classes ONLY for values that are pushed as complete, literal
//      strings (not template-interpolated) — e.g. width enums like 'w-full', 'w-1/2'.
//      These are genuinely safe because the full class text exists verbatim in this file.
//   2. Real inline CSS (via the `style` prop) for everything else: colors, spacing,
//      layout (display/flex/grid/justify/align), typography, borders, shadows, and
//      self-positioning margins. This sidesteps Tailwind's static scanner entirely, and
//      inline styles always compute (highest specificity, always present in the DOM),
//      so every value works identically in every view.

export interface StyleProps {
  // Spacing — stored as px numbers, applied as CSS vars
  px?: number; py?: number
  pt?: number; pb?: number
  pl?: number; pr?: number
  mx?: number; my?: number
  gap?: number

  // mt/mb/ml/mr all additionally accept 'auto'. This is deliberately dual-purpose:
  //   - BoxSpacingField's "Margin" group writes plain numbers here for ordinary spacing.
  //   - AlignField's "Position" control writes 'auto' here for self-positioning (the
  //     classic CSS auto-margin trick — see getBoxAlign/setBoxAlign and
  //     getBoxAlignY/setBoxAlignY below). Both controls share the same underlying
  //     keys, same as ml/mr always did; whichever control was used most recently wins.
  mt?: number | 'auto'
  mb?: number | 'auto'
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
  // Grid: number of columns/rows when display === 'grid'. Ignored otherwise.
  // gridRows defaults to 'auto' — rows are simply generated as needed based
  // on how many children exist, which is what most grids actually want;
  // picking an explicit number instead forces exactly that many row tracks
  // (repeat(N, 1fr)), same mechanism as gridCols.
  gridCols?:  1|2|3|4|5|6
  gridRows?:  'auto'|1|2|3|4|5|6
  // Grid-native replacement for `justify` (see buildFlexInlineProps below
  // for why `justify-content`/space-between/space-around are dead controls
  // for our grid: columns are always `1fr` each, so there is never leftover
  // space between tracks to distribute). justifyItems positions each ITEM
  // within its own column instead — meaningful regardless of column width.
  justifyItems?: 'start'|'end'|'center'|'stretch'

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

// ─── Enum → real CSS value maps ────────────────────────────────────────────

const JUSTIFY_MAP: Record<string, string> = {
  start: 'flex-start', end: 'flex-end', center: 'center',
  between: 'space-between', around: 'space-around', evenly: 'space-evenly',
}

// Flex wants flex-start/flex-end; grid wants start/end. Using the flex
// keywords on a grid container is technically invalid CSS for align-items/
// justify-items (browsers vary in how tolerantly they handle it) — these
// two maps exist so each container type always gets its own correct
// keyword set instead of silently sharing one that's only really valid for
// one of them.
const ALIGN_MAP: Record<string, string> = {
  start: 'flex-start', end: 'flex-end', center: 'center',
  stretch: 'stretch', baseline: 'baseline',
}

const GRID_ALIGN_MAP: Record<string, string> = {
  start: 'start', end: 'end', center: 'center',
  stretch: 'stretch', baseline: 'baseline',
}

const JUSTIFY_ITEMS_MAP: Record<string, string> = {
  start: 'start', end: 'end', center: 'center', stretch: 'stretch',
}

const GRID_TEMPLATE: Record<number, string> = {
  1: 'repeat(1, minmax(0, 1fr))',
  2: 'repeat(2, minmax(0, 1fr))',
  3: 'repeat(3, minmax(0, 1fr))',
  4: 'repeat(4, minmax(0, 1fr))',
  5: 'repeat(5, minmax(0, 1fr))',
  6: 'repeat(6, minmax(0, 1fr))',
}

const MAX_WIDTH_REM: Record<string, string> = {
  xs: '20rem', sm: '24rem', md: '28rem', lg: '32rem', xl: '36rem',
  '2xl': '42rem', '3xl': '48rem', '4xl': '56rem', '5xl': '64rem',
  '6xl': '72rem', '7xl': '80rem', full: '100%',
}

const WIDTH_PCT: Record<string, string> = {
  full: '100%', auto: 'auto', screen: '100vw',
  '1/2': '50%', '1/3': '33.3333%', '2/3': '66.6667%', '1/4': '25%', '3/4': '75%',
}

const FONT_SIZE_PX: Record<string, number> = {
  xs: 12, sm: 14, base: 16, lg: 18, xl: 20,
  '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48, '6xl': 60,
}

const FONT_WEIGHT_NUM: Record<string, number> = {
  light: 300, normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800,
}

const LEADING_NUM: Record<string, number> = {
  none: 1, tight: 1.25, snug: 1.375, normal: 1.5, relaxed: 1.625, loose: 2,
}

const ROUNDED_PX: Record<string, number> = {
  sm: 2, md: 6, lg: 8, xl: 12, '2xl': 16, '3xl': 24, full: 9999,
}

export const SHADOW_CSS: Record<string, string> = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
}

// Returns whether this node has an explicit VERTICAL self-position set (see
// getBoxAlignY/setBoxAlignY — Top/Middle/Bottom write mt/mb:'auto'). Used
// below to decide whether the Section's inner content div should stretch to
// fill the outer band's full height (default: yes, so the inner's OWN
// Justify/Align has real room to distribute space among children) or stay
// sized to its own content (only when the user explicitly asked for a
// corner-positioned, non-stretched block via the vertical Position control).
function hasVerticalSelfPosition(style: StyleProps): boolean {
  return style.mt === 'auto' || style.mb === 'auto'
}

// Real display/flex/grid/justify/align CSS. Used by buildInlineStyle for
// non-Section components, AND by buildSectionInnerStyle for Section's actual
// content-children layout — gridCols/gridRows/justifyItems only ever apply
// HERE (on the inner div), never on the outer band (see
// buildOuterLayoutInlineProps below — the outer band is always flex,
// regardless of what this function produces for the inner).
export function buildFlexInlineProps(style: StyleProps = {}): React.CSSProperties {
  const s: React.CSSProperties = {}
  if (style.display) s.display = style.display

  if (style.display === 'grid') {
    s.gridTemplateColumns = GRID_TEMPLATE[style.gridCols ?? 2] ?? GRID_TEMPLATE[2]
    if (style.gridRows && style.gridRows !== 'auto') {
      s.gridTemplateRows = GRID_TEMPLATE[style.gridRows] ?? undefined
    }
    // justify-content/space-between/space-around are dead controls here —
    // our columns are always equal `1fr` tracks, so there is never leftover
    // space between them to distribute. justifyItems positions each ITEM
    // within its own column instead, which works regardless of column width.
    if (style.justifyItems) s.justifyItems = JUSTIFY_ITEMS_MAP[style.justifyItems] ?? style.justifyItems
  } else if (style.display === 'flex' || style.display === 'inline-flex') {
    if (style.flexDir) {
      s.flexDirection =
        style.flexDir === 'col' ? 'column' :
        style.flexDir === 'col-reverse' ? 'column-reverse' :
        style.flexDir
    }
    if (style.flexWrap) s.flexWrap = style.flexWrap
  }

  if (style.justify) s.justifyContent = JUSTIFY_MAP[style.justify] ?? style.justify
  if (style.align) {
    s.alignItems = style.display === 'grid'
      ? (GRID_ALIGN_MAP[style.align] ?? style.align)
      : (ALIGN_MAP[style.align] ?? style.align)
  }

  return s
}

// Section's OUTER band always wraps exactly ONE child — the inner content
// div. Its ONLY job is positioning that single child within itself (via
// Justify = main axis = vertical, Align = cross axis = horizontal, since
// flexDirection is always 'column' here). That's a pure single-item
// positioning problem, and flexbox already solves it completely and
// reliably — there is NO reason the outer band itself ever needs to be
// display:grid, even when the INNER div (which lays out the Section's real
// children) is set to Grid. This is deliberately decoupled from
// style.flexDir too — that value is for the INNER div's own children
// arrangement (the "Direction" control), not for how the outer positions
// its one child.
function buildOuterLayoutInlineProps(style: StyleProps = {}): React.CSSProperties {
  const s: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
  }

  if (style.justify) s.justifyContent = JUSTIFY_MAP[style.justify] ?? style.justify
  if (style.align)   s.alignItems     = ALIGN_MAP[style.align] ?? style.align

  return s
}

// ─── Build className (ONLY values that are safe, literal, complete strings) ───

export function buildClassName(style: StyleProps = {}, extra?: string): string {
  const c: string[] = []

  if (style.italic)    c.push('italic')
  if (style.uppercase) c.push('uppercase')

  // Width enum classes are safe: each is pushed as a complete literal string
  // (not template-interpolated), so Tailwind's scanner sees the full class
  // name intact right here in this file.
  if (style.width === 'full')   c.push('w-full')
  else if (style.width === 'auto')   c.push('w-auto')
  else if (style.width === 'screen') c.push('w-screen')
  else if (style.width === '1/2')    c.push('w-1/2')
  else if (style.width === '1/3')    c.push('w-1/3')
  else if (style.width === '2/3')    c.push('w-2/3')
  else if (style.width === '1/4')    c.push('w-1/4')
  else if (style.width === '3/4')    c.push('w-3/4')

  if (style.minHeight === 'screen') c.push('min-h-screen')
  else if (style.minHeight === 'full') c.push('min-h-full')

  if (style.height === 'auto')   c.push('h-auto')
  else if (style.height === 'full')   c.push('h-full')
  else if (style.height === 'screen') c.push('h-screen')

  if (style.objectFit === 'cover')     c.push('object-cover')
  else if (style.objectFit === 'contain') c.push('object-contain')
  else if (style.objectFit === 'fill')    c.push('object-fill')
  else if (style.objectFit === 'none')    c.push('object-none')

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
  if (style.gap !== undefined)   s.gap          = style.gap * 4

  // mt/mb/ml/mr (numeric OR 'auto') are handled exclusively by buildAlignMargin
  // below, which runs AFTER the mx/my shorthand above — so a more specific
  // mt/mb/ml/mr always overrides the mx/my shorthand, same precedence as before,
  // but now also correctly supports 'auto' (needed for vertical/horizontal
  // self-positioning) without trying to multiply the string 'auto' by 4.
  Object.assign(s, buildAlignMargin(style))
  Object.assign(s, buildFlexInlineProps(style))

  // Typography — real inline CSS now (see buildFlexInlineProps comment above
  // for why the old `text-${style.fontSize}`-style classes were unreliable).
  if (style.fontSize)   s.fontSize   = `${FONT_SIZE_PX[style.fontSize]}px`
  if (style.fontWeight) s.fontWeight = FONT_WEIGHT_NUM[style.fontWeight]
  if (style.textAlign)  s.textAlign  = style.textAlign
  if (style.leading)    s.lineHeight = LEADING_NUM[style.leading]

  // skipSizing is used by every *Editor* component (rendered inside
  // SelectableShell) — the wrapper already applies width/maxWidth via
  // buildBoxSizingStyle. Applying the SAME numeric/percentage width a
  // second time, nested one level deeper, is harmless for an absolute px
  // value (623px means 623px regardless of nesting) but actively WRONG
  // for a percentage: 45% of an element whose own parent is already 45%
  // of the real container resolves to ~20%, not 45%. *Preview* components
  // have no such wrapper, so they must keep calling this without skipSizing.
  if (!opts.skipSizing) {
    if (typeof style.width === 'number') {
      s.width      = style.widthUnit === '%' ? `${style.width}%` : style.width
      s.flexGrow   = 0
      s.flexShrink = 0
      // flex-basis must also be pinned to 'auto': Column hardcodes a
      // `flex-1` class (flex: 1 1 0%) in its own render regardless of
      // style.width. Setting width/grow/shrink inline overrides that
      // class's grow/shrink longhands, but NOT its flex-basis:0% — and in
      // flexbox, flex-basis (not width) governs main-axis size when it
      // isn't auto. Without this, a resized column's flex-basis:0% from
      // the class still wins over its own width and it collapses to ~0px.
      s.flexBasis  = 'auto'
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

  // Border radius/width/style — same template-literal problem as justify/
  // align, fixed the same way (real inline CSS instead of a Tailwind class
  // that was never actually being generated for most values).
  if (style.rounded && style.rounded !== 'none') s.borderRadius = `${ROUNDED_PX[style.rounded]}px`
  if (style.borderWidth !== undefined && style.borderWidth > 0) {
    s.borderWidth = `${style.borderWidth}px`
    s.borderStyle = style.borderStyle ?? 'solid'
  } else if (style.borderStyle) {
    s.borderStyle = style.borderStyle
  }

  if (style.shadow && style.shadow !== 'none') s.boxShadow = SHADOW_CSS[style.shadow]

  // object-position accepts space-separated keywords ('top left') directly
  // as valid CSS — no class-name mangling needed.
  if (style.objectPosition) s.objectPosition = style.objectPosition

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

// ─── Self-positioning (auto-margin trick) ──────────────────────────────────
// 'none' is a genuine 4th state — distinct from 'left' — meaning NO margin
// override is written at all, so the parent's own Justify/Align fully governs
// this item. This matters because clicking any of the OTHER three options
// writes an explicit auto-margin, and per the CSS flex spec, an item with an
// auto margin on an axis absorbs all free space on that axis BEFORE
// justify-content/align-items gets a say — i.e. it deliberately overrides the
// parent's Justify/Align for this one item, the same way align-self would.
// That's a legitimate, useful per-item override — but only if there's also a
// real way to opt OUT of it. Before 'none' existed, even clicking "Left"
// (which looks like a no-op) permanently wrote mr:'auto', silently fighting
// the parent's Justify forever after with no way back.

export type BoxAlign  = 'none' | 'left' | 'center' | 'right'
export type BoxAlignY = 'none' | 'top'  | 'middle' | 'bottom'

export function getBoxAlign(style: StyleProps = {}): BoxAlign {
  if (style.ml === 'auto' && style.mr === 'auto') return 'center'
  if (style.ml === 'auto') return 'right'
  if (style.mr === 'auto') return 'left'
  if (style.centerContent) return 'center'
  return 'none'
}

export function setBoxAlign(align: BoxAlign): Partial<StyleProps> {
  if (align === 'none')   return { ml: undefined, mr: undefined, centerContent: undefined }
  if (align === 'center') return { ml: 'auto', mr: 'auto', centerContent: undefined }
  if (align === 'right')  return { ml: 'auto', mr: 0,      centerContent: undefined }
  return                       { ml: 0,      mr: 'auto', centerContent: undefined } // 'left'
}

// Vertical counterpart — same auto-margin mechanism on mt/mb instead of ml/mr.
// Meaningful whenever the parent is a flex/grid container with room to spare
// on the cross/main axis (e.g. a Section taller than its content via minHeight).

export function getBoxAlignY(style: StyleProps = {}): BoxAlignY {
  if (style.mt === 'auto' && style.mb === 'auto') return 'middle'
  if (style.mt === 'auto') return 'bottom'
  if (style.mb === 'auto') return 'top'
  return 'none'
}

export function setBoxAlignY(align: BoxAlignY): Partial<StyleProps> {
  if (align === 'none')   return { mt: undefined, mb: undefined }
  if (align === 'middle') return { mt: 'auto', mb: 'auto' }
  if (align === 'bottom') return { mt: 'auto', mb: 0 }
  return                       { mt: 0, mb: 'auto' } // 'top'
}

export function buildAlignMargin(style: StyleProps = {}): React.CSSProperties {
  const s: React.CSSProperties = {}
  const hasML = style.ml !== undefined
  const hasMR = style.mr !== undefined
  const hasMT = style.mt !== undefined
  const hasMB = style.mb !== undefined
  if (hasML) s.marginLeft   = style.ml === 'auto' ? 'auto' : (style.ml as number) * 4
  if (hasMR) s.marginRight  = style.mr === 'auto' ? 'auto' : (style.mr as number) * 4
  if (hasMT) s.marginTop    = style.mt === 'auto' ? 'auto' : (style.mt as number) * 4
  if (hasMB) s.marginBottom = style.mb === 'auto' ? 'auto' : (style.mb as number) * 4

  // Legacy centerContent — only applies if nothing more specific is set.
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
    s.flexBasis  = 'auto'
  } else if (style.width === 'full')  s.width = '100%'
  else if (style.width === '1/2')     s.width = '50%'
  else if (style.width === '1/3')     s.width = '33.3333%'
  else if (style.width === '2/3')     s.width = '66.6667%'
  else if (style.width === '1/4')     s.width = '25%'
  else if (style.width === '3/4')     s.width = '75%'

  // Explicit fractional width (1/2, 1/3, etc.) needs to opt out of Column's
  // hardcoded flex-1 the same way a numeric px width does — otherwise that
  // class's flex-basis:0% overrides the width above and the column
  // collapses to ~0px instead of actually taking up its fraction.
  if (
    style.width === '1/2' || style.width === '1/3' || style.width === '2/3' ||
    style.width === '1/4' || style.width === '3/4'
  ) {
    s.flexGrow   = 0
    s.flexShrink = 0
    s.flexBasis  = 'auto'
  }

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

  // mt/mb/ml/mr (numeric or 'auto') handled exclusively by buildAlignMargin,
  // called last so it correctly overrides the mx/my shorthand above when
  // present — same precedence buildInlineStyle uses.
  Object.assign(s, buildAlignMargin(style))

  return s
}

// ─── Flex/grid layout mirror (Section's inner wrapper div) ────────────────
// buildFlexLayoutClassName is kept only so existing call sites don't need to
// change — it intentionally returns nothing now, since display/flexDir/
// flexWrap/justify/align are all real inline CSS via buildFlexLayoutStyle
// below (see buildFlexInlineProps and the file header comment for why the
// Tailwind-class version of this was unreliable).

export function buildFlexLayoutClassName(_style: StyleProps = {}): string {
  return ''
}

export function buildFlexLayoutStyle(style: StyleProps = {}): React.CSSProperties {
  const s: React.CSSProperties = buildFlexInlineProps(style)
  if (style.gap !== undefined) s.gap = style.gap * 4
  return s
}

// ─── Section-specific split (full-bleed background fix) ───────────────────
// Section is the only node type that needs BOTH a background spanning the
// full page width AND a centered max-width content column. One element
// can't do both — max-width + mx:auto necessarily clips the background to
// that same narrow box.
//
// These two helpers split a Section's StyleProps into:
//   - an OUTER "band": background + border/rounded/shadow + vertical padding,
//     full width, no max-width by default — this is what SectionEditor/
//     SectionPreview's root <section> should use. It is ALWAYS a real flex
//     column container (see buildOuterLayoutInlineProps — deliberately
//     never grid, regardless of what the INNER div's own Display is set
//     to). Both Editor and Preview must build this identically or the two
//     views will disagree.
//   - an INNER "column": max-width + horizontal padding + centering (via
//     buildAlignMargin's ml/mr:auto) + its OWN flex/grid layout (via
//     buildFlexLayoutStyle/buildFlexInlineProps, where gridCols/gridRows DO
//     apply) — this positions the Section's actual CHILDREN within that
//     content block.
// Only Section uses this split; every other node type keeps using
// buildClassName/buildInlineStyle directly.

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

  if (style.textColor)   s.color       = resolveColor(style.textColor)
  if (style.borderColor) s.borderColor = resolveColor(style.borderColor)
  if (style.rounded && style.rounded !== 'none') s.borderRadius = `${ROUNDED_PX[style.rounded]}px`
  if (style.borderWidth !== undefined && style.borderWidth > 0) {
    s.borderWidth = `${style.borderWidth}px`
    s.borderStyle = style.borderStyle ?? 'solid'
  } else if (style.borderStyle) {
    s.borderStyle = style.borderStyle
  }
  if (style.shadow && style.shadow !== 'none') s.boxShadow = SHADOW_CSS[style.shadow]

  if (style.opacity !== undefined) s.opacity = style.opacity / 100

  if (style.my !== undefined) { s.marginTop = style.my * 4; s.marginBottom = style.my * 4 }

  // FIX: this function previously only ever applied VERTICAL margin (my/
  // mt/mb) directly — HORIZONTAL margin (ml/mr) was never applied at all,
  // so the outer band's own self-centering (via the centerContent:true
  // default every new Section ships with, or an explicit ml/mr:auto from
  // the Position control) was silently dropped in PREVIEW specifically.
  // The Editor "looked" fine only by coincidence: SelectableShell's wrapper
  // computes its own sizing via buildBoxSizingStyle, which already calls
  // buildAlignMargin generically for every node type — so the Editor's
  // WRAPPER div centered itself even though the actual <section>
  // underneath never did. Preview has no such wrapper; it renders this
  // <section> directly, so without this call a resized (width < 100%)
  // Section fell back to whatever its PARENT's align-items resolved to —
  // stretch's default behavior for a fixed-width item is effectively
  // flex-start (left), not centered. This call makes Preview match Editor
  // exactly, and makes every Section correctly self-center by default
  // (or honor an explicit Position override) in BOTH views.
  Object.assign(s, buildAlignMargin(style))

  Object.assign(s, buildOuterLayoutInlineProps(style))

  if (!opts.skipSizing) {
    if (typeof style.width === 'number') {
      s.width      = style.widthUnit === '%' ? `${style.width}%` : style.width
      s.flexGrow   = 0
      s.flexShrink = 0
      s.flexBasis  = 'auto'
    }

    if (typeof style.maxWidth === 'number') {
      s.maxWidth = style.maxWidth
    } else if (typeof style.width === 'number' && style.widthUnit !== '%') {
      s.maxWidth = '100%'
    }
  }

  return s
}

// The outer band no longer carries rounded/border/shadow/typography/layout as
// Tailwind classes (see buildSectionOuterStyle above, which applies all of
// that as real inline CSS) — so there's nothing style-driven left to filter
// out of a className here. Kept only so call sites don't need to change; it
// now just passes through whatever literal `extra` classes the caller supplies.
export function buildSectionOuterClassName(_style: StyleProps = {}, extra?: string): string {
  return extra ?? ''
}

export function buildSectionInnerClassName(_style: StyleProps = {}): string {
  // maxWidth is applied inline in buildSectionInnerStyle below (see
  // MAX_WIDTH_REM). 'w-full' alone is safe: it's pushed as a complete literal
  // string, and is also hardcoded literally elsewhere in the app (e.g.
  // SectionEditor's own 'w-full relative'), so it's guaranteed to exist as
  // real CSS either way.
  return 'w-full'
}

export function buildSectionInnerStyle(style: StyleProps = {}): React.CSSProperties {
  const s: React.CSSProperties = {}

  if (typeof style.maxWidth === 'number') s.maxWidth = style.maxWidth
  else if (typeof style.maxWidth === 'string') s.maxWidth = MAX_WIDTH_REM[style.maxWidth] ?? undefined

  if (style.pl !== undefined) s.paddingLeft = style.pl * 4
  else if (style.px !== undefined) s.paddingLeft = style.px * 4
  if (style.pr !== undefined) s.paddingRight = style.pr * 4
  else if (style.px !== undefined) s.paddingRight = style.px * 4

  // buildAlignMargin here covers BOTH the inner column's default horizontal
  // centering (ml/mr:auto from Section's centerContent default) AND any
  // explicit self-positioning (including the new vertical mt/mb:auto) a user
  // sets via the Position control in SectionPanel — this lets the inner
  // content block override the outer band's own Justify/Align for itself,
  // the same per-item-override relationship every other node type has with
  // ITS parent.
  Object.assign(s, buildAlignMargin(style))
  Object.assign(s, buildFlexLayoutStyle(style)) // gridCols/gridRows/justifyItems/inner-flex-direction apply HERE, on the actual children

  // The inner div is ALWAYS a flex child of the outer band (which is
  // always display:flex — see buildOuterLayoutInlineProps), REGARDLESS of
  // whether the inner div's OWN display (this Section's "Display" setting)
  // is flex or grid — flex-grow here is entirely about how the OUTER sizes
  // this child, independent of what layout system the inner uses for its
  // own children. This is what makes the inner div reliably fill the
  // outer band's full available width AND height in BOTH Flex and Grid
  // content-layout modes. Skipped when the user has explicitly set a
  // vertical self-position (Top/Middle/Bottom) — that's a deliberate
  // signal they want a shrink-wrapped, corner-positioned block instead of
  // a full-height content area, so forcing a fill here would silently
  // undo that choice.
  if (!hasVerticalSelfPosition(style)) {
    s.flexGrow   = 1
    s.flexShrink = 1
    s.minHeight  = 0
  }

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