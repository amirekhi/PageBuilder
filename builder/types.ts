// ─── Node types ───────────────────────────────────────────────────────────────

export type NodeType =
  | 'section'
  | 'columns'
  | 'column'
  | 'text'
  | 'heading'
  | 'image'
  | 'button'
  | 'spacer'
  | 'divider'

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
}