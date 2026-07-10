// ─── Node types ───────────────────────────────────────────────────────────────

export type NodeType =
  | 'section' | 'columns' | 'column'
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
  // Accordion). The SelectableShell wrapper needs to mirror this exact
  // same default — otherwise, when style.width is genuinely unset AND the
  // node sits in a flex parent that isn't using the default `stretch`
  // alignment (e.g. align:'center'), the wrapper shrink-wraps to content
  // while the component's own inner element still renders full-width one
  // level deeper inside it — invisible until the wrapper is the thing
  // constraining the box.
  defaultFullWidth?: boolean
}