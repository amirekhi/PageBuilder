import { NodeType, NodeDefinition, PageNode } from './types'
import {
  SectionEditor,  SectionPreview,  SectionPanel,
  ColumnsEditor,  ColumnsPreview,  ColumnsPanel,
  ColumnEditor,   ColumnPreview,   ColumnPanel,
  GridEditor,     GridPreview,     GridPanel,
  TabsEditor,     TabsPreview,     TabsPanel,
  TabPaneEditor,  TabPanePreview,  TabPanePanel,
  CarouselEditor, CarouselPreview, CarouselPanel,
  SlideEditor,    SlidePreview,    SlidePanel,
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
      style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 6, maxWidth: 'full', centerContent: true },
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
    // CONFIRMED (was previously only flagged as suspected, see the old
    // comment this replaces): ColumnEditor/ColumnPreview hardcode 'flex-1'
    // in their className regardless of style.width, exactly like the
    // w-full pattern above — but SelectableShell's wrapper (the actual
    // flex item inside a Columns row in the EDITOR tree; ColumnEditor's own
    // div is one level further in and isn't a flex child of anything) never
    // knew to mirror it. Result: an untouched Column shrink-wraps to its own
    // content's width in the editor instead of splitting the row evenly —
    // this is what made the Pricing template's three tiers render uneven
    // and "out of order" in the editor while looking correct in Preview
    // (PreviewRenderer has no such wrapper in between, so ColumnPreview's
    // own flex-1 reaches the real flex item directly).
    //
    // defaultFlexFill tells SelectableShell to apply the equivalent of
    // flex:1 1 0% to ITSELF whenever no explicit width has been set on this
    // node — see SelectableShell.tsx. A manually resized column (which sets
    // an explicit style.width) is unaffected: buildBoxSizingStyle already
    // gives that case flexGrow:0/flexShrink:0, so this flag only fills the
    // gap for the default, unresized case.
    //
    // NOTE: Column is now dual-purpose — it's also reused as the default
    // "cell" content wrapper for the Grid element (see templates.ts's
    // buildBentoGrid and GridCellSpanField in panelComponents.tsx), since it
    // already offers padding/background/rounded corners out of the box.
    // Column's hardcoded flex-1 class is harmless there: flex properties on
    // an element are simply ignored by the browser whenever that element's
    // actual parent is display:grid rather than display:flex, so it never
    // conflicts with the grid-column/grid-row placement Grid gives it.
    defaultFlexFill: true,
    defaultProps: { style: { px: 4, py: 4 } },
  },

  grid: {
    label: 'Grid', icon: '▦', isContainer: true,
    EditorComponent:  GridEditor,
    PreviewComponent: GridPreview,
    EditorPanel:      GridPanel,
    // GridEditor/Preview hardcode 'w-full' in their className regardless of
    // style.width — same pattern as Section/Columns/Image/Divider/Accordion.
    defaultFullWidth: true,
    // display:'grid' is what makes Renderer.tsx's existing generic
    // container logic (which keys off resolvedStyle.display === 'grid', not
    // node.type) treat this correctly for free — DropSlots span every
    // column instead of stealing one, and the empty-state/"Add block"
    // prompts already know to do the same. gridRowMinHeight keeps bento
    // cells from collapsing to their content's height alone; justifyItems/
    // align default to 'stretch' so a cell's content fills whatever space
    // its span gives it, matching the classic bento look out of the box.
    defaultProps: {
      style: {
        display: 'grid', gridCols: 3, gridRows: 2, gap: 4,
        gridRowMinHeight: 100, justifyItems: 'stretch', align: 'stretch',
      },
    },
  },

  tabs: {
    label: 'Tabs', icon: '🗂', isContainer: true,
    EditorComponent:  TabsEditor,
    PreviewComponent: TabsPreview,
    EditorPanel:      TabsPanel,
    // TabsEditor/Preview hardcode 'w-full' in their className regardless of
    // style.width — same pattern as Section/Columns/Grid/etc.
    defaultFullWidth: true,
    // No activeTab in here on purpose — which tab is showing is UI-local
    // state (see the doc comment on activeIndex/onActiveIndexChange in
    // types.ts), never persisted node data, so there's nothing to seed it
    // with here.
    defaultProps: { style: { gap: 4 } },
    createExtras: (parentId: string): PageNode[] => [
      { id: makeId(), type: 'tabpane', props: { label: 'Tab 1', style: { px: 4, py: 4, display: 'flex', flexDir: 'col', gap: 3 } }, children: [], parentId },
      { id: makeId(), type: 'tabpane', props: { label: 'Tab 2', style: { px: 4, py: 4, display: 'flex', flexDir: 'col', gap: 3 } }, children: [], parentId },
    ],
  },

  tabpane: {
    label: 'Tab', icon: '▭', isContainer: true,
    EditorComponent:  TabPaneEditor,
    PreviewComponent: TabPanePreview,
    EditorPanel:      TabPanePanel,
    // TabPaneEditor/Preview hardcode 'w-full' — same pattern as Column
    // (which it's otherwise closely modeled on).
    defaultFullWidth: true,
    // Deliberately NOT listed in BLOCK_GROUPS below — same precedent as
    // 'column' (also never directly insertable from the generic block
    // picker). A tabpane only ever comes into existence via Tabs'
    // createExtras above or its own "+ Add tab" action (TabsPanel /
    // TabsEditor's empty-state button) — inserting one as a bare top-level
    // block, unattached to a Tabs parent, wouldn't make sense (it would
    // just be an unlabeled Column with no tab header to click).
    defaultProps: { label: 'Tab', style: { px: 4, py: 4, display: 'flex', flexDir: 'col', gap: 3 } },
  },

  carousel: {
    label: 'Carousel', icon: '🎠', isContainer: true,
    EditorComponent:  CarouselEditor,
    PreviewComponent: CarouselPreview,
    EditorPanel:      CarouselPanel,
    // CarouselEditor/Preview hardcode 'w-full' — same pattern as Tabs and
    // every other container that spans the row by default.
    defaultFullWidth: true,
    // Autoplay/loop/arrows/dots ARE genuine persisted authoring choices
    // (unlike activeIndex, which is transient UI state — see the doc
    // comment on activeIndex/onActiveIndexChange in types.ts) — they're the
    // page author deciding how this carousel should behave for every
    // visitor, so they belong in node.props like any other content
    // decision, not in local component state.
    defaultProps: { autoplay: false, autoplayInterval: 4000, loop: true, showArrows: true, showDots: true, style: {} },
    createExtras: (parentId: string): PageNode[] => [
      { id: makeId(), type: 'slide', props: { style: { px: 0, py: 0 } }, children: [], parentId },
      { id: makeId(), type: 'slide', props: { style: { px: 0, py: 0 } }, children: [], parentId },
    ],
  },

  slide: {
    label: 'Slide', icon: '▭', isContainer: true,
    EditorComponent:  SlideEditor,
    PreviewComponent: SlidePreview,
    EditorPanel:      SlidePanel,
    // SlideEditor/Preview hardcode 'w-full' — same pattern as Tab Pane.
    defaultFullWidth: true,
    // Deliberately NOT listed in BLOCK_GROUPS below — same precedent as
    // 'tabpane'/'column'. A slide only ever comes into existence via
    // Carousel's createExtras above or its own "+ Add slide" action
    // (CarouselPanel / CarouselEditor's empty-state button).
    //
    // Zero default padding (unlike tabpane's px:4/py:4) — the most common
    // slide content is a single edge-to-edge Image or a Quote card that
    // already brings its own padding, so a Slide starts as a bare
    // full-bleed frame rather than adding an extra inset that would need
    // to be removed for the most common case.
    defaultProps: { style: { px: 0, py: 0 } },
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
  { label: 'Layout',   types: ['section', 'columns', 'grid', 'tabs', 'carousel', 'spacer', 'divider'] },
  { label: 'Content',  types: ['heading', 'text', 'image', 'list', 'video', 'accordion'] },
  { label: 'Elements', types: ['button', 'badge', 'avatar', 'quote'] },
]