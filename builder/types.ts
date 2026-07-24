// ─── Node types ───────────────────────────────────────────────────────────────

export type NodeType =
  | 'section' | 'columns' | 'column' | 'grid'
  | 'tabs' | 'tabpane'
  | 'carousel' | 'slide'
  | 'text' | 'heading' | 'image' | 'button'
  | 'spacer' | 'divider'
  | 'list' | 'badge'
  | 'avatar' | 'quote' | 'video'
  | 'accordion'

export interface PageNode {
  id:       string
  type:     NodeType
  props:    Record<string, unknown>
  children: string[]       // ordered child node IDs
  parentId: string | null
}

export type NodeMap = Record<string, PageNode>

// ─── Component props passed to every Editor/Preview component ─────────────────

export interface NodeComponentProps {
  node:      PageNode
  children?: React.ReactNode

  // ── Animation (Preview-only) ──────────────────────────────────────────
  // Supplied by RenderPreviewNode (see Renderer.tsx), which calls the
  // useAnimationProps() hook (see animations.ts) and passes the result down
  // as plain props. EditorComponents are never given these — RenderEditorNode
  // doesn't pass them — so the editor canvas is completely unaffected.
  //
  // WHY THIS HAS TO BE A PROP, NOT SOMETHING APPLIED FROM OUTSIDE:
  // every *Preview component here returns a single root DOM element
  // (<section>, <p>, <img>, etc), but the ELEMENT RenderPreviewNode actually
  // holds a reference to is `<def.PreviewComponent node={node}>`  — i.e. the
  // component invocation, not the DOM node it eventually renders. There is
  // no way to reach "the root DOM element two function calls down" from
  // outside; cloning/mutating the outer element only adds props that a
  // component ignores unless it's explicitly written to read them. So every
  // *Preview component below must accept these two props itself and apply
  // them to its own root element's `ref` and `style`.
  animationRef?:   React.Ref<any>
  animationStyle?: React.CSSProperties

  // ── "Which child is currently active" (Editor AND Preview) ────────────
  // Used by any container whose children are mutually exclusive — only ONE
  // is ever visible at a time (currently Tabs and Carousel). Which index is
  // active, plus a setter. Threaded in from Renderer.tsx (RenderEditorNode/
  // RenderPreviewNode) via a local `useState` — ONE instance per node,
  // since React scopes component-local state by the node's position/key in
  // the tree, which is exactly what's needed here (each Tabs/Carousel
  // block on the page tracks its own active child independently). This is
  // deliberately NOT stored in node.props: persisting it through
  // updateProps would push a full undo-history entry on every single
  // click/autoplay tick, for state that isn't really "page content" — same
  // reasoning AccordionRender already applies to its own openIdx (local
  // state, never persisted).
  //
  // Renderer.tsx is also where the display:none hide/show wrapping for the
  // INACTIVE children happens — directly around each RenderEditorNode/
  // RenderPreviewNode call, at the exact point this state lives (see the
  // FIX comment in Renderer.tsx's RenderEditorNode for why doing that
  // wrapping one layer further out, inside TabsEditor itself, turned out to
  // be unreliable). TabsEditor/TabsPreview/CarouselEditor/CarouselPreview
  // never get per-child metadata any other way, since `children` above is
  // an opaque, already-rendered ReactNode blob.
  //
  // Optional and harmless for every other node type — nothing else
  // destructures or reads them.
  activeIndex?:          number
  onActiveIndexChange?: (index: number) => void
}

// ─── Props passed into every sidebar panel ────────────────────────────────────

export interface PanelProps {
  node:     PageNode
  onChange: (props: Record<string, unknown>) => void
}

// ─── Registry entry ───────────────────────────────────────────────────────────

export interface NodeDefinition {
  label:            string
  icon:             string
  isContainer:      boolean
  EditorComponent:  React.FC<NodeComponentProps>
  PreviewComponent: React.FC<NodeComponentProps>
  EditorPanel:      React.FC<PanelProps>
  defaultProps:     Record<string, unknown>
  // Optional: spawn extra child nodes when this type is inserted (e.g. columns → 2 column children)
  createExtras?:    (parentId: string) => PageNode[]
  // True for node types whose own render function hardcodes a `w-full`
  // class regardless of style.width (Section, Columns, Image, Divider,
  // Accordion, Grid, Tabs, Tab Pane). The SelectableShell wrapper needs to
  // mirror this exact same default — otherwise, when style.width is
  // genuinely unset AND the node sits in a flex parent that isn't using
  // the default `stretch` alignment (e.g. align:'center'), the wrapper
  // shrink-wraps to content while the component's own inner element still
  // renders full-width one level deeper inside it — invisible until the
  // wrapper is the thing constraining the box.
  defaultFullWidth?: boolean
  // True for node types whose own render function hardcodes `flex-1` (or
  // equivalent flex-fill behavior) regardless of style.width (currently
  // just Column). SelectableShell's wrapper is the actual flex item inside
  // a row/column of flex children — the node's own rendered element is one
  // level further in and never itself a flex child — so without this flag
  // the wrapper has no flex-grow/shrink/basis at all when width is unset,
  // and shrink-wraps to its own content instead of sharing space evenly
  // with its siblings the way the inner element's own flex-1 class visually
  // implies it should. Only applied when style.width is genuinely unset —
  // a manually resized column already gets flexGrow:0/flexShrink:0 from
  // buildBoxSizingStyle's own numeric-width branch, so this never conflicts
  // with that. See SelectableShell.tsx and registry.ts's `column` entry.
  defaultFlexFill?: boolean
}