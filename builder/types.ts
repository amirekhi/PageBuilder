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