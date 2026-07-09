import { NodeType, NodeDefinition, PageNode } from './types'
import {
  SectionEditor,  SectionPreview,  SectionPanel,
  ColumnsEditor,  ColumnsPreview,  ColumnsPanel,
  ColumnEditor,   ColumnPreview,   ColumnPanel,
  TextEditor,     TextPreview,     TextPanel,
  HeadingEditor,  HeadingPreview,  HeadingPanel,
  ImageEditor,    ImagePreview,    ImagePanel,
  ButtonEditor,   ButtonPreview,   ButtonPanel,
  SpacerEditor,   SpacerPreview,   SpacerPanel,
  DividerEditor,  DividerPreview,  DividerPanel,
  ListEditor,   ListPreview,   ListPanel,
  BadgeEditor,  BadgePreview,  BadgePanel,
  AvatarEditor, AvatarPreview, AvatarPanel,
  QuoteEditor,  QuotePreview,  QuotePanel,
  VideoEditor,  VideoPreview,  VideoPanel,
 AccordionEditor, AccordionPreview, AccordionPanel,
} from './nodeComponents'

function makeId() {
  return `node_${Math.random().toString(36).slice(2, 8)}`
}

export const NODE_REGISTRY: Record<NodeType, NodeDefinition> = {

  accordion: {
    label: 'Accordion', icon: '▾', isContainer: false,
    EditorComponent:  AccordionEditor,
    PreviewComponent: AccordionPreview,
    EditorPanel:      AccordionPanel,
    // AccordionRender hardcodes 'w-full' in its className regardless of
    // style.width — the wrapper needs to know that so it doesn't
    // shrink-wrap when no explicit width has been set.
    defaultFullWidth: true,
    defaultProps: {
      items: [
        { q: 'What is included in the free plan?', a: 'One project, all core blocks, and community support.' },
        { q: 'Can I cancel anytime?',               a: 'Yes — there are no contracts or cancellation fees.' },
        { q: 'Do you offer discounts for teams?',   a: 'Yes, contact sales for volume pricing on 10+ seats.' },
      ],
      style: {},
    },
  },

   avatar: {
    label: 'Avatar', icon: '◍', isContainer: false,
    EditorComponent:  AvatarEditor,
    PreviewComponent: AvatarPreview,
    EditorPanel:      AvatarPanel,
    // Avatar sizes itself off node.props.size (a fixed diameter), never
    // through style.width/buildBoxSizingStyle at all — not affected by
    // this class of bug, no defaultFullWidth needed.
    defaultProps: { src: '', initials: 'JL', size: 56, style: {} },
  },

  quote: {
    label: 'Quote Card', icon: '❝', isContainer: false,
    EditorComponent:  QuoteEditor,
    PreviewComponent: QuotePreview,
    EditorPanel:      QuotePanel,
    // QuoteRender does NOT hardcode w-full — it's meant to shrink-to-content
    // by design (a pull-quote card), correctly in both editor and preview
    // already. No defaultFullWidth here on purpose.
    defaultProps: {
      quote: 'A short, glowing quote from a happy customer.',
      name: 'Jordan Lee', role: 'Head of Growth, Acme Corp', avatarSrc: '',
      style: { px: 6, py: 6, bgColor: 'neutral-50', rounded: 'xl' },
    },
  },

  video: {
    label: 'Video', icon: '▶', isContainer: false,
    EditorComponent:  VideoEditor,
    PreviewComponent: VideoPreview,
    EditorPanel:      VideoPanel,
    // VideoRender doesn't hardcode w-full in its className — its default
    // width comes from the explicit style.width:'full' already set below,
    // so buildBoxSizingStyle already sees it and sizes the wrapper
    // correctly without needing defaultFullWidth.
    defaultProps: { url: '', style: { width: 'full', rounded: 'lg', aspectRatio: '16/9' } },
  },

   list: {
    label: 'List', icon: '☰', isContainer: false,
    EditorComponent:  ListEditor,
    PreviewComponent: ListPreview,
    EditorPanel:      ListPanel,
    // ListRender does NOT hardcode w-full — shrink-to-content by design,
    // correct already in both views.
    defaultProps: {
      items: ['First item', 'Second item', 'Third item'],
      markerType: 'check',
      style: { fontSize: 'base', textColor: 'neutral-700' },
    },
  },

  badge: {
    label: 'Badge', icon: '◐', isContainer: false,
    EditorComponent:  BadgeEditor,
    PreviewComponent: BadgePreview,
    EditorPanel:      BadgePanel,
    // BadgeRender renders inline-flex, shrink-to-content by design — no
    // defaultFullWidth.
    defaultProps: { label: 'New', variant: 'soft', style: {} },
  },


  section: {
    label: 'Section', icon: '▤', isContainer: true,
    EditorComponent:  SectionEditor,
    PreviewComponent: SectionPreview,
    EditorPanel:      SectionPanel,
    // SectionEditor/Preview hardcode 'w-full' in their className regardless
    // of style.width — confirmed by the Hero template bug (button-row
    // Columns node shrank in editor because its wrapper didn't know about
    // this same default).
    defaultFullWidth: true,
    defaultProps: {
      style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 6, maxWidth: '5xl', centerContent: true },
    },
  },

  columns: {
    label: 'Columns', icon: '⊞', isContainer: true,
    EditorComponent:  ColumnsEditor,
    PreviewComponent: ColumnsPreview,
    EditorPanel:      ColumnsPanel,
    // Same hardcoded w-full pattern as Section — this is the exact node
    // type that surfaced the bug in the Hero template's button row.
    defaultFullWidth: true,
    defaultProps: {
      // justify-between + w-full so columns spread across full width (left & right)
      style: { display: 'flex', gap: 6, justify: 'between', width: 'full' },
    },
    createExtras: (parentId: string): PageNode[] => [
      { id: makeId(), type: 'column', props: { style: { px: 4, py: 4 } }, children: [], parentId },
      { id: makeId(), type: 'column', props: { style: { px: 4, py: 4 } }, children: [], parentId },
    ],
  },

  column: {
    label: 'Column', icon: '▥', isContainer: true,
    EditorComponent:  ColumnEditor,
    PreviewComponent: ColumnPreview,
    EditorPanel:      ColumnPanel,
    // NOTE: ColumnEditor hardcodes 'flex-1' (not w-full) in its className —
    // a related but DIFFERENT default (share available space with sibling
    // Columns, rather than "be 100% wide"). This isn't covered by
    // defaultFullWidth/buildBoxSizingStyle's width handling, and hasn't
    // been confirmed as an active bug yet — flagged here deliberately
    // rather than guessed at. Revisit if Columns rows are ever seen
    // collapsing/misbehaving the same way in editor vs preview.
    defaultProps: { style: { px: 4, py: 4 } },
  },

  text: {
    label: 'Text', icon: '¶', isContainer: false,
    EditorComponent:  TextEditor,
    PreviewComponent: TextPreview,
    EditorPanel:      TextPanel,
    // TextEditor/Preview do NOT hardcode w-full — shrink-to-content
    // (bounded by min-width:0 for wrapping) by design already.
    defaultProps: {
      content: 'Add your text here.',
      style:   { fontSize: 'base', textColor: 'neutral-700', leading: 'relaxed' },
    },
  },

  heading: {
    label: 'Heading', icon: 'H', isContainer: false,
    EditorComponent:  HeadingEditor,
    PreviewComponent: HeadingPreview,
    EditorPanel:      HeadingPanel,
    // Same as Text — no hardcoded w-full.
    defaultProps: {
      content: 'Your Heading',
      tag:     'h2',
      style:   { fontSize: '3xl', fontWeight: 'bold', textColor: 'neutral-900' },
    },
  },

  image: {
    label: 'Image', icon: '🖼', isContainer: false,
    EditorComponent:  ImageEditor,
    PreviewComponent: ImagePreview,
    EditorPanel:      ImagePanel,
    // ImageEditor's empty-state placeholder and its "no src" branch both
    // hardcode 'w-full'/'block w-full' regardless of style.width — needs
    // the same wrapper mirroring as Section/Columns.
    defaultFullWidth: true,
    // Consistent default box: 4:3 aspect ratio with cover fit, so every newly
    // added image — regardless of its native resolution — renders the same
    // size and shape until the user explicitly changes it.
    defaultProps: { src: '', alt: '', style: { width: 'full', rounded: 'md', aspectRatio: '4/3', objectFit: 'cover' } },
  },

  button: {
    label: 'Button', icon: '⬜', isContainer: false,
    EditorComponent:  ButtonEditor,
    PreviewComponent: ButtonPreview,
    EditorPanel:      ButtonPanel,
    // ButtonRender renders inline-flex, shrink-to-content by design — no
    // defaultFullWidth. (Previous width:'auto' experiment here was reverted
    // earlier since it broke drag-resize; this plain {} is the known-good
    // state.)
    defaultProps: { label: 'Click me', href: '#', variant: 'solid', style: {} },
  },

  spacer: {
    label: 'Spacer', icon: '↕', isContainer: false,
    EditorComponent:  SpacerEditor,
    PreviewComponent: SpacerPreview,
    EditorPanel:      SpacerPanel,
    // Spacer sizes itself off node.props.height directly, never through
    // style.width/buildBoxSizingStyle — not affected, no defaultFullWidth.
    defaultProps: { height: 40, style: {} },
  },

  divider: {
    label: 'Divider', icon: '—', isContainer: false,
    EditorComponent:  DividerEditor,
    PreviewComponent: DividerPreview,
    EditorPanel:      DividerPanel,
    // DividerEditor/Preview hardcode 'w-full' in their className regardless
    // of style.width — same pattern as Section/Columns/Image.
    defaultFullWidth: true,
    defaultProps: {
      style: { my: 6, borderColor: 'neutral-200', borderWidth: 1, borderStyle: 'solid' },
    },
  },
}

export const BLOCK_GROUPS: { label: string; types: NodeType[] }[] = [
  { label: 'Layout',   types: ['section', 'columns', 'spacer', 'divider'] },
  { label: 'Content',  types: ['heading', 'text', 'image', 'list', 'video', 'accordion'] },
  { label: 'Elements', types: ['button', 'badge', 'avatar', 'quote'] },
]