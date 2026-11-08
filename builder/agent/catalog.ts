// Single source of truth for what the AI agent is ALLOWED to do.
//
// Pure data, no React and no runtime imports (type-only import below), so it
// is safe to import from BOTH the server route (src/app/api/agent/route.ts,
// via prompt.ts) and the client validator (ops.ts / sanitize.ts). The prompt
// shown to Gemini and the validator that guards the store are generated from
// the SAME tables, so they cannot drift apart.

import type { NodeType } from '../types'

// ─── Ops ────────────────────────────────────────────────────────────────────
export const AGENT_OPS = ['add', 'update', 'delete', 'move', 'template', 'clear', 'seo', 'say'] as const
export type AgentOpName = typeof AGENT_OPS[number]
export const MAX_OPS_PER_RUN = 400

// Must match the keys of SECTION_BUILDERS in templates.ts.
export const TEMPLATE_KEYS = [
  'header', 'hero', 'twoColFeature', 'testimonial', 'threeColFeatures', 'pricing', 'faq',
  'stats', 'videoHero', 'team', 'newsletter', 'logoCloud', 'footer', 'comparison',
  'blogGrid', 'faqAccordion', 'bentoGrid', 'featureTabs', 'ctaBanner', 'imageGallery',
  'logoCarousel', 'testimonialCarousel',
] as const

// ─── Colors ─────────────────────────────────────────────────────────────────
// Same names as COLOR_HEX in styleMapper.ts (plus raw hex, validated in sanitize.ts).
export const COLOR_NAMES = [
  'white', 'black', 'transparent',
  'slate-50', 'slate-100', 'slate-200', 'slate-700', 'slate-800', 'slate-900',
  'neutral-50', 'neutral-100', 'neutral-200', 'neutral-700', 'neutral-900',
  'violet-50', 'violet-100', 'violet-500', 'violet-600', 'violet-700',
  'blue-50', 'blue-500', 'blue-600',
  'green-50', 'green-500', 'green-600',
  'red-50', 'red-500', 'red-600',
  'amber-50', 'amber-400', 'amber-500',
] as const

// ─── Fonts (agent writes a short key, we store the real CSS value) ─────────
export const FONT_MAP: Record<string, string> = {
  sans: 'ui-sans-serif, system-ui, sans-serif',
  serif: 'ui-serif, Georgia, serif',
  mono: 'ui-monospace, "SF Mono", monospace',
  vazirmatn: "'Vazirmatn', ui-sans-serif, system-ui, sans-serif",
  naskh: "'Noto Naskh Arabic', serif",
  lalezar: "'Lalezar', cursive",
}

// ─── Images ─────────────────────────────────────────────────────────────────
// Only these Unsplash photos are known to exist (they are the ones your own
// templates use). Models hallucinate photo ids; sanitize.ts swaps any unknown
// images.unsplash.com URL for one of these so a page never ships broken images.
export const ALLOWED_IMAGES: { id: string; hint: string }[] = [
  { id: '1551650975-87deedd944c3', hint: 'analytics dashboard / software' },
  { id: '1522071820081-009f0129c71c', hint: 'team collaborating at a table' },
  { id: '1499951360447-b19be8fe80f5', hint: 'laptop on a desk / work' },
  { id: '1432888622747-4eb9a8efeb07', hint: 'desk workspace' },
  { id: '1460925895917-afdab827c52f', hint: 'charts and analytics on a laptop' },
  { id: '1561070791-2526d30994b5', hint: 'colourful design / creative' },
  { id: '1499750310107-5fef28a66643', hint: 'workspace with laptop and coffee' },
  { id: '1467232004584-a241de8bcf5d', hint: 'creative / branding' },
  { id: '1487014679447-9f8336841d58', hint: 'creative / design' },
  { id: '1522199755839-a2bacb67c546', hint: 'writing / laptop' },
]
export const imageUrl = (id: string, w = 1200) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80`

// ─── Animation ──────────────────────────────────────────────────────────────
export const ANIM_EFFECTS = [
  'none', 'fade-in', 'fade-in-up', 'fade-in-down', 'fade-in-left', 'fade-in-right',
  'zoom-in', 'zoom-out', 'slide-up', 'slide-down', 'slide-left', 'slide-right',
  'bounce-in', 'flip-in',
] as const
export const ANIM_EASINGS = ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'] as const
export const ANIM_TRIGGERS = ['onLoad', 'onScroll'] as const

// ─── Style whitelist ────────────────────────────────────────────────────────
export type StyleKind =
  | { t: 'int'; min: number; max: number }
  | { t: 'intSet'; values: readonly number[] }
  | { t: 'enum'; values: readonly string[] }
  | { t: 'numOrEnum'; min: number; max: number; values: readonly string[] }
  | { t: 'bool' }
  | { t: 'color' }
  | { t: 'gradient' }
  | { t: 'image' }
  | { t: 'font' }

const SPACE: StyleKind = { t: 'int', min: 0, max: 64 }
const SPACE_AUTO: StyleKind = { t: 'numOrEnum', min: 0, max: 64, values: ['auto'] }
const SIZES = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', 'full'] as const

export const STYLE_SPEC: Record<string, StyleKind> = {
  // spacing (unit = 4px, so 4 => 16px)
  px: SPACE, py: SPACE, pt: SPACE, pb: SPACE, pl: SPACE, pr: SPACE,
  mx: SPACE, my: SPACE, gap: SPACE,
  mt: SPACE_AUTO, mb: SPACE_AUTO, ml: SPACE_AUTO, mr: SPACE_AUTO,
  // colors
  bgColor: { t: 'color' }, textColor: { t: 'color' }, borderColor: { t: 'color' },
  bgGradient: { t: 'gradient' },
  bgImage: { t: 'image' },
  bgSize: { t: 'enum', values: ['cover', 'contain', 'auto'] },
  bgPos: { t: 'enum', values: ['center', 'top', 'bottom', 'left', 'right'] },
  bgOverlay: { t: 'int', min: 0, max: 80 },
  // typography
  fontFamily: { t: 'font' },
  fontSize: { t: 'enum', values: ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'] },
  fontWeight: { t: 'enum', values: ['light', 'normal', 'medium', 'semibold', 'bold', 'extrabold'] },
  textAlign: { t: 'enum', values: ['left', 'center', 'right', 'justify'] },
  leading: { t: 'enum', values: ['none', 'tight', 'snug', 'normal', 'relaxed', 'loose'] },
  italic: { t: 'bool' }, uppercase: { t: 'bool' },
  // layout
  display: { t: 'enum', values: ['block', 'flex', 'grid'] },
  flexDir: { t: 'enum', values: ['row', 'col', 'row-reverse', 'col-reverse'] },
  flexWrap: { t: 'enum', values: ['wrap', 'nowrap'] },
  justify: { t: 'enum', values: ['start', 'end', 'center', 'between', 'around', 'evenly'] },
  align: { t: 'enum', values: ['start', 'end', 'center', 'stretch', 'baseline'] },
  centerContent: { t: 'bool' },
  hidden: { t: 'bool' },
  // grid
  gridCols: { t: 'int', min: 1, max: 6 },
  gridRows: { t: 'numOrEnum', min: 1, max: 6, values: ['auto'] },
  justifyItems: { t: 'enum', values: ['start', 'end', 'center', 'stretch'] },
  gridRowMinHeight: { t: 'int', min: 40, max: 400 },
  gridColSpan: { t: 'int', min: 1, max: 4 },
  gridRowSpan: { t: 'int', min: 1, max: 4 },
  // sizing
  width: { t: 'numOrEnum', min: 10, max: 2000, values: ['full', 'auto', '1/2', '1/3', '2/3', '1/4', '3/4'] },
  widthUnit: { t: 'enum', values: ['px', '%'] },
  maxWidth: { t: 'numOrEnum', min: 100, max: 2000, values: SIZES },
  minHeight: { t: 'numOrEnum', min: 0, max: 1600, values: ['screen', 'full'] },
  height: { t: 'numOrEnum', min: 0, max: 1600, values: ['auto', 'full'] },
  // border + effects
  rounded: { t: 'enum', values: ['none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'] },
  borderWidth: { t: 'intSet', values: [0, 1, 2, 4, 8] },
  borderStyle: { t: 'enum', values: ['solid', 'dashed', 'dotted'] },
  shadow: { t: 'enum', values: ['none', 'sm', 'md', 'lg', 'xl', '2xl'] },
  opacity: { t: 'int', min: 0, max: 100 },
  // images
  objectFit: { t: 'enum', values: ['cover', 'contain', 'fill', 'none'] },
  aspectRatio: { t: 'enum', values: ['auto', '1/1', '4/3', '16/9', '3/2', '21/9'] },
  objectPosition: { t: 'enum', values: ['center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right'] },
}

// ─── Per-node props whitelist ───────────────────────────────────────────────
// Anything not listed here is dropped. Deliberately ABSENT: customCss,
// customJs, htmlId, styleHover and every id/tree field — the agent can never
// write executable code or touch the tree structure through props.
export type PropKind =
  | { t: 'html'; max?: number }
  | { t: 'text'; max: number }
  | { t: 'href' }
  | { t: 'image' }
  | { t: 'video' }
  | { t: 'bool' }
  | { t: 'int'; min: number; max: number }
  | { t: 'enum'; values: readonly string[] }
  | { t: 'strList'; maxItems: number; maxLen: number }
  | { t: 'qaList'; maxItems: number }
  | { t: 'fieldName' }
  | { t: 'forced'; value: unknown }

const BTN_VARIANTS = ['solid', 'outline', 'ghost'] as const

export const PROP_SPECS: Record<NodeType, Record<string, PropKind>> = {
  section: {}, columns: {}, column: {}, grid: {}, tabs: {}, slide: {}, divider: {},
  tabpane: { label: { t: 'text', max: 40 } },
  carousel: {
    autoplay: { t: 'bool' }, autoplayInterval: { t: 'int', min: 1500, max: 10000 },
    loop: { t: 'bool' }, showArrows: { t: 'bool' }, showDots: { t: 'bool' },
  },
  text: { content: { t: 'html', max: 2000 } },
  heading: { content: { t: 'html', max: 300 }, tag: { t: 'enum', values: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] } },
  image: { src: { t: 'image' }, alt: { t: 'text', max: 160 } },
  button: {
    label: { t: 'text', max: 40 }, href: { t: 'href' }, variant: { t: 'enum', values: BTN_VARIANTS },
    linkType: { t: 'enum', values: ['relative', 'absolute'] }, openInNewTab: { t: 'bool' },
  },
  spacer: { height: { t: 'int', min: 4, max: 400 } },
  list: {
    items: { t: 'strList', maxItems: 12, maxLen: 160 },
    markerType: { t: 'enum', values: ['bullet', 'check', 'arrow', 'number'] },
  },
  badge: { label: { t: 'text', max: 30 }, variant: { t: 'enum', values: ['solid', 'soft', 'outline'] } },
  avatar: { src: { t: 'image' }, initials: { t: 'text', max: 2 }, size: { t: 'int', min: 24, max: 200 } },
  quote: {
    quote: { t: 'text', max: 400 }, name: { t: 'text', max: 60 }, role: { t: 'text', max: 80 },
    avatarSrc: { t: 'image' },
  },
  video: { url: { t: 'video' } },
  accordion: { items: { t: 'qaList', maxItems: 10 } },
  form: {
    // The agent may never choose where form data is sent.
    action: { t: 'forced', value: '' },
    method: { t: 'enum', values: ['POST', 'GET'] }, submitAsJson: { t: 'bool' },
    successMessage: { t: 'text', max: 160 }, errorMessage: { t: 'text', max: 160 },
  },
  formInput: {
    fieldName: { t: 'fieldName' }, label: { t: 'text', max: 60 }, placeholder: { t: 'text', max: 80 },
    inputType: { t: 'enum', values: ['text', 'email', 'tel', 'number', 'date', 'url'] }, required: { t: 'bool' },
  },
  formTextarea: {
    fieldName: { t: 'fieldName' }, label: { t: 'text', max: 60 }, placeholder: { t: 'text', max: 80 },
    rows: { t: 'int', min: 2, max: 20 }, required: { t: 'bool' },
  },
  formSelect: {
    fieldName: { t: 'fieldName' }, label: { t: 'text', max: 60 },
    options: { t: 'strList', maxItems: 12, maxLen: 60 }, required: { t: 'bool' },
  },
  formCheckbox: { fieldName: { t: 'fieldName' }, label: { t: 'text', max: 100 }, required: { t: 'bool' } },
  formSubmit: { label: { t: 'text', max: 40 }, variant: { t: 'enum', values: BTN_VARIANTS } },
}

// Short purpose + child rules, shown to the model.
export const NODE_NOTES: Record<NodeType, string> = {
  section: 'Full-width band. Page = ordered sections under "root". Flex column by default. May contain anything.',
  columns: 'Horizontal flex row (use for side-by-side layouts). Children are normally "column" (buttons/other blocks also work).',
  column: 'One cell of a columns row; shares the row evenly by default. Add display:flex, flexDir:col, gap to stack its content with spacing.',
  grid: 'CSS grid container (gridCols x gridRows). Prefer columns; use grid only for bento-style layouts.',
  tabs: 'Tabbed container. Children MUST be "tabpane" only.',
  tabpane: 'One tab (child of tabs ONLY). Holds any blocks.',
  carousel: 'Sliding container. Children MUST be "slide" only.',
  slide: 'One carousel slide (child of carousel ONLY). Holds any blocks.',
  text: 'Paragraph. content = inline HTML (strong, em, u, a, br only).',
  heading: 'Heading h1-h6. content = short text, same inline HTML rules.',
  image: 'Image (src, alt). Use only the allowed image URLs. Give style width:"full", aspectRatio, objectFit:"cover", rounded.',
  button: 'Link button (label, href, variant). Use href "#" unless the user gave a real URL.',
  spacer: 'Vertical gap (props.height px).',
  divider: 'Horizontal rule.',
  list: 'Bulleted/checked list (props.items string[]).',
  badge: 'Small pill label.',
  avatar: 'Round avatar with initials.',
  quote: 'Testimonial card (quote, name, role).',
  video: 'YouTube/Vimeo embed (props.url).',
  accordion: 'FAQ accordion (props.items [{q,a}]).',
  form: 'Form container; add formInput/formTextarea/formSelect/formCheckbox/formSubmit children yourself. Never set action.',
  formInput: 'Single-line field.',
  formTextarea: 'Multi-line field.',
  formSelect: 'Dropdown (options string[]).',
  formCheckbox: 'Checkbox.',
  formSubmit: 'Submit button for the enclosing form.',
}

// ─── Prompt helpers (generated from the tables above) ───────────────────────
export function describeStyleKind(k: StyleKind): string {
  switch (k.t) {
    case 'int': return `integer ${k.min}..${k.max}`
    case 'intSet': return k.values.join('|')
    case 'enum': return k.values.join('|')
    case 'numOrEnum': return `integer ${k.min}..${k.max} or ${k.values.join('|')}`
    case 'bool': return 'true|false'
    case 'color': return 'color name, #hex, or transparent'
    case 'gradient': return '"linear-gradient(to right, #7c3aed, #4f46e5)" style string'
    case 'image': return 'image URL (allowed list only)'
    case 'font': return Object.keys(FONT_MAP).join('|')
  }
}

export function describeStyleSpec(): string {
  return Object.entries(STYLE_SPEC).map(([key, kind]) => `- ${key}: ${describeStyleKind(kind)}`).join('\n')
}

function describePropKind(k: PropKind): string {
  switch (k.t) {
    case 'html': return 'inline HTML'
    case 'text': return `text<=${k.max}`
    case 'href': return 'link'
    case 'image': return 'image URL'
    case 'video': return 'YouTube/Vimeo URL'
    case 'bool': return 'bool'
    case 'int': return `int ${k.min}..${k.max}`
    case 'enum': return k.values.join('|')
    case 'strList': return `string[] max ${k.maxItems}`
    case 'qaList': return `[{q,a}] max ${k.maxItems}`
    case 'fieldName': return 'snake_case key'
    case 'forced': return ''
  }
}

export function describePropSpecs(): string {
  return (Object.keys(NODE_NOTES) as NodeType[]).map(type => {
    const props = Object.entries(PROP_SPECS[type])
      .filter(([, kind]) => kind.t !== 'forced')
      .map(([key, kind]) => `${key}(${describePropKind(kind)})`)
    return `- ${type}: ${NODE_NOTES[type]}${props.length ? `\n    props: ${props.join(', ')}` : ''}`
  }).join('\n')
}
