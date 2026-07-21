'use client'

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { NodeMap, PageNode, NodeType } from './types'
import { NODE_REGISTRY } from './registry'
import { SEED_MEDIA, MediaItem } from './Media'
import type { StyleProps } from './styleMapper'

const HISTORY_LIMIT = 50

function makeId(): string {
  return `node_${Math.random().toString(36).slice(2, 8)}`
}

function snap(nodes: NodeMap): NodeMap {
  return JSON.parse(JSON.stringify(nodes))
}

function deleteSubtree(nodes: NodeMap, id: string): void {
  const node = nodes[id]
  if (!node) return
  node.children.forEach(cid => deleteSubtree(nodes, cid))
  if (node.parentId && nodes[node.parentId]) {
    nodes[node.parentId].children = nodes[node.parentId].children.filter(c => c !== id)
  }
  delete nodes[id]
}

function cloneSubtree(nodes: NodeMap, id: string, newParentId: string | null): PageNode[] {
  const result: PageNode[] = []
  function walk(srcId: string, parentId: string | null): string {
    const src = nodes[srcId]
    const newId = makeId()
    const cloned: PageNode = { ...src, id: newId, parentId, children: [], props: JSON.parse(JSON.stringify(src.props)) }
    result.push(cloned)
    cloned.children = src.children.map(cid => walk(cid, newId))
    return newId
  }
  walk(id, newParentId)
  return result
}

const ROOT_ID = 'root'
const INITIAL_NODES: NodeMap = {
  [ROOT_ID]: {
    id: ROOT_ID, type: 'section',
    props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 6, maxWidth: 'full', centerContent: true } },
    children: [], parentId: null,
  },
}

// ─── One-time image normalization ──────────────────────────────────────────
function normalizeImageNodes(nodes: NodeMap): NodeMap {
  const next = { ...nodes }
  let changed = false
  for (const id in next) {
    const node = next[id]
    if (node.type !== 'image') continue
    const style = (node.props.style as Record<string, unknown>) ?? {}
    const needsAspect = style.aspectRatio === undefined
    const needsFit    = style.objectFit === undefined
    if (needsAspect || needsFit) {
      changed = true
      next[id] = {
        ...node,
        props: {
          ...node.props,
          style: {
            ...style,
            aspectRatio: needsAspect ? '4/3'  : style.aspectRatio,
            objectFit:   needsFit    ? 'cover' : style.objectFit,
          },
        },
      }
    }
  }
  return changed ? next : nodes
}

// ─── Breakpoint / preview width ────────────────────────────────────────────

export type PreviewWidth = 'desktop' | 'tablet' | 'mobile'

export const PREVIEW_WIDTHS: Record<PreviewWidth, { px: number; label: string; icon: string }> = {
  desktop: { px: 1280, label: 'Desktop', icon: '🖥' },
  tablet:  { px: 768,  label: 'Tablet',  icon: '⬜' },
  mobile:  { px: 390,  label: 'Mobile',  icon: '📱' },
}

// ─── Control panel tab ──────────────────────────────────────────────────────
// Lifted into the store (rather than local useState inside ControlPanel)
// specifically so TopBar — a completely separate component — can switch to
// Theme/SEO from its own buttons. ControlPanel's own visible tab BAR only
// ever renders layers/style/content (see ControlPanel.tsx); Theme and SEO
// are still perfectly normal values this same field can hold and still
// render the exact same tab body they always did — they've just lost their
// own button in that particular tab bar, in favor of a button living in
// TopBar instead. Nothing about how the tab content itself works changes.
export type ControlPanelTab = 'layers' | 'style' | 'content' | 'theme' | 'seo'

// ─── Global design tokens (colors + typography) ────────────────────────────
// Page-wide, NOT per-node — sibling to globalCustomCss, not part of the
// `nodes` tree. Colors are genuinely LIVE-linked: a node's style can store a
// reference (`global:<id>`, see makeGlobalColorRef in styleMapper.ts)
// instead of a literal hex, and every place that reference is used re-
// resolves it at render time — so editing a GlobalColor's `value` here
// instantly updates every block bound to it, with no per-node data to
// migrate. Typography presets are deliberately NOT live-linked (see the
// comment on GlobalTypographyStyle) — applying one just copies its values
// onto a node's style once, the same as picking values by hand.
//
// NOT tracked in undo/redo history (pushHistory only ever snapshots
// `nodes`) — same precedent as globalCustomCss, which has never been
// undo-tracked either. Editing your brand palette is a rare, deliberate
// action, not a rapid-iteration one the way node edits are.

export interface GlobalColor {
  id:    string
  name:  string
  value: string // hex, e.g. '#7c3aed'
}

// Deliberately just the "shape" fields (size/weight/line-height/align) —
// the same subset StylePanel's own Typography group already exposes.
// Unlike GlobalColor, applying one of these is a one-time COPY onto a
// node's style, not a live reference: a text style touches several
// StyleProps fields at once (fontSize + fontWeight + leading + textAlign),
// and letting a node "subscribe" to all of them simultaneously would mean
// either overriding fields the user deliberately customized afterward, or
// building a much heavier partial-override-tracking system than a first
// version needs. Copy-once matches how "paragraph styles" work in most
// design tools' quick-apply feature, as opposed to their separate (heavier)
// linked-style-system feature.
export interface GlobalTypographyStyle {
  id:         string
  name:       string
  fontSize?:   StyleProps['fontSize']
  fontWeight?: StyleProps['fontWeight']
  leading?:    StyleProps['leading']
  textAlign?:  StyleProps['textAlign']
}

function makeGlobalId(): string {
  return `global_${Math.random().toString(36).slice(2, 8)}`
}

// ─── SEO settings ───────────────────────────────────────────────────────────
// Page-wide, same as globalColors/globalTypography/globalCustomCss above —
// one set of metadata for the whole page, not per-node. Also NOT
// undo-tracked, same precedent as the other global-settings fields.
export interface SeoSettings {
  title?:         string
  description?:   string
  keywords?:      string
  ogTitle?:       string
  ogDescription?: string
  ogImage?:       string
  canonicalUrl?:  string
  noIndex?:       boolean
  favicon?:       string
}

const DEFAULT_SEO: SeoSettings = {
  title:       'Untitled Page',
  description: '',
}

const DEFAULT_GLOBAL_COLORS: GlobalColor[] = [
  { id: makeGlobalId(), name: 'Primary',   value: '#7c3aed' },
  { id: makeGlobalId(), name: 'Secondary', value: '#4f46e5' },
  { id: makeGlobalId(), name: 'Text',      value: '#171717' },
  { id: makeGlobalId(), name: 'Accent',    value: '#f59e0b' },
]

const DEFAULT_GLOBAL_TYPOGRAPHY: GlobalTypographyStyle[] = [
  { id: makeGlobalId(), name: 'Heading 1', fontSize: '5xl', fontWeight: 'bold',     leading: 'tight' },
  { id: makeGlobalId(), name: 'Heading 2', fontSize: '3xl', fontWeight: 'bold',     leading: 'snug' },
  { id: makeGlobalId(), name: 'Heading 3', fontSize: '2xl', fontWeight: 'semibold', leading: 'snug' },
  { id: makeGlobalId(), name: 'Body',      fontSize: 'base', fontWeight: 'normal',  leading: 'relaxed' },
]

type MediaPickCallback = (item: MediaItem) => void
type ImageEditCallback = (editedDataUrl: string) => void

interface BuilderStore {
  nodes:        NodeMap
  rootId:       string
  selectedId:   string | null
  draggingId:   string | null
  resizingId:   string | null
  mode:         'edit' | 'preview'
  previewWidth: PreviewWidth
  editingBreakpoint: PreviewWidth

  canvasScale: number
  previewReplayNonce: number
  richEditingId: string | null
  globalCustomCss: string

  controlPanelTab:    ControlPanelTab
  setControlPanelTab: (tab: ControlPanelTab) => void

  globalColors:     GlobalColor[]
  globalTypography: GlobalTypographyStyle[]
  seo:              SeoSettings

  past:         NodeMap[]
  future:       NodeMap[]

  mediaLibrary:      MediaItem[]
  isMediaPickerOpen: boolean
  mediaPickCallback: MediaPickCallback | null

  // Image editor (see ImageEditorModal.tsx). Sibling to the media picker
  // above, not a replacement — the media picker chooses WHICH image; the
  // image editor fine-tunes the one already chosen. Same callback-based
  // shape deliberately, so it drops into the existing pattern instead of
  // inventing a new one: openImageEditor(src, onSave) hands back an edited
  // data URL through onSave exactly the way openMediaPicker(onPick) hands
  // back a MediaItem through onPick.
  isImageEditorOpen:    boolean
  imageEditorSrc:       string | null
  imageEditorCallback:  ImageEditCallback | null

  selectedNode:    () => PageNode | null
  canUndo:         () => boolean
  canRedo:         () => boolean

  setMode:              (mode: 'edit' | 'preview') => void
  setPreviewWidth:      (w: PreviewWidth) => void
  setEditingBreakpoint: (bp: PreviewWidth) => void
  setCanvasScale:       (scale: number) => void
  replayAnimations:     () => void
  setRichEditing:       (id: string | null) => void
  setGlobalCustomCss:   (css: string) => void
  selectNode:      (id: string | null) => void
  setDragging:     (id: string | null) => void
  setResizing:     (id: string | null) => void
  updateProps:     (id: string, props: Record<string, unknown>) => void
  addNode:         (type: NodeType, parentId: string, index: number) => void
  moveNode:        (id: string, newParentId: string, index: number) => void
  deleteNode:      (id: string) => void
  duplicateNode:   (id: string) => void
  undo:            () => void
  redo:            () => void

  addGlobalColor:    (name: string, value: string) => void
  updateGlobalColor: (id: string, patch: Partial<Omit<GlobalColor, 'id'>>) => void
  deleteGlobalColor: (id: string) => void

  addGlobalTypography:    (name: string) => void
  updateGlobalTypography: (id: string, patch: Partial<Omit<GlobalTypographyStyle, 'id'>>) => void
  deleteGlobalTypography: (id: string) => void

  updateSeo: (patch: Partial<SeoSettings>) => void

  openMediaPicker:  (onPick: MediaPickCallback) => void
  closeMediaPicker: () => void
  addUploadedMedia: (item: MediaItem) => void

  openImageEditor:  (src: string, onSave: ImageEditCallback) => void
  closeImageEditor: () => void
}

export const useBuilderStore = create<BuilderStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      nodes:        normalizeImageNodes(INITIAL_NODES),
      rootId:       ROOT_ID,
      selectedId:   null,
      draggingId:   null,
      resizingId:   null,
      mode:         'edit',
      previewWidth: 'desktop',
      editingBreakpoint: 'desktop',
      canvasScale: 1,
      previewReplayNonce: 0,
      richEditingId: null,
      globalCustomCss: '',

      controlPanelTab: 'layers',

      globalColors:     DEFAULT_GLOBAL_COLORS,
      globalTypography: DEFAULT_GLOBAL_TYPOGRAPHY,
      seo:              { ...DEFAULT_SEO },

      past:         [],
      future:       [],

      mediaLibrary:      SEED_MEDIA,
      isMediaPickerOpen: false,
      mediaPickCallback: null,

      isImageEditorOpen:   false,
      imageEditorSrc:      null,
      imageEditorCallback: null,

      selectedNode: () => {
        const { nodes, selectedId } = get()
        return selectedId ? (nodes[selectedId] ?? null) : null
      },
      canUndo: () => get().past.length > 0,
      canRedo: () => get().future.length > 0,

      setMode:              (mode) => set(s => { s.mode = mode }),
      setPreviewWidth:      (w)    => set(s => { s.previewWidth = w }),
      setEditingBreakpoint: (bp)   => set(s => { s.editingBreakpoint = bp }),
      setCanvasScale:       (scale) => set(s => { s.canvasScale = scale }),
      replayAnimations:     () => set(s => { s.previewReplayNonce += 1 }),
      setRichEditing:       (id) => set(s => { s.richEditingId = id }),
      setGlobalCustomCss:   (css) => set(s => { s.globalCustomCss = css }),
      setControlPanelTab:   (tab) => set(s => { s.controlPanelTab = tab }),
      selectNode:      (id)   => set(s => { s.selectedId = id }),
      setDragging:     (id)   => set(s => { s.draggingId = id }),
      setResizing:     (id)   => set(s => { s.resizingId = id }),

      updateProps: (id, props) => set(s => {
        pushHistory(s)
        Object.assign(s.nodes[id].props, props)
      }),

      addNode: (type, parentId, index) => set(s => {
        pushHistory(s)
        const def = NODE_REGISTRY[type]
        if (!def) return
        const id = makeId()
        s.nodes[id] = {
          id, type,
          props:    JSON.parse(JSON.stringify(def.defaultProps)),
          children: [],
          parentId,
        }
        const extras = def.createExtras?.(id) ?? []
        extras.forEach(extra => {
          s.nodes[extra.id] = extra
          if (extra.parentId === id) s.nodes[id].children.push(extra.id)
        })
        s.nodes[parentId].children.splice(index, 0, id)
        s.selectedId = id
      }),

      moveNode: (id, newParentId, index) => set(s => {
        pushHistory(s)
        const node = s.nodes[id]
        if (!node || !node.parentId) return
        let cursor: string | null = newParentId
        while (cursor) {
          if (cursor === id) return
          cursor = s.nodes[cursor]?.parentId ?? null
        }
        const oldParent = s.nodes[node.parentId]
        if (oldParent) {
          const oldIdx = oldParent.children.indexOf(id)
          oldParent.children.splice(oldIdx, 1)
          const adjustedIndex = newParentId === node.parentId && index > oldIdx
            ? index - 1
            : index
          s.nodes[newParentId].children.splice(adjustedIndex, 0, id)
        } else {
          s.nodes[newParentId].children.splice(index, 0, id)
        }
        node.parentId = newParentId
      }),

      deleteNode: (id) => set(s => {
        pushHistory(s)
        if (s.selectedId === id) s.selectedId = null
        deleteSubtree(s.nodes, id)
      }),

      duplicateNode: (id) => set(s => {
        pushHistory(s)
        const node = s.nodes[id]
        if (!node || !node.parentId) return
        const clones = cloneSubtree(s.nodes, id, node.parentId)
        clones.forEach(c => { s.nodes[c.id] = c })
        const parent  = s.nodes[node.parentId]
        const origIdx = parent.children.indexOf(id)
        parent.children.splice(origIdx + 1, 0, clones[0].id)
        s.selectedId = clones[0].id
      }),

      undo: () => set(s => {
        if (!s.past.length) return
        s.future.unshift(snap(s.nodes))
        if (s.future.length > HISTORY_LIMIT) s.future.pop()
        s.nodes      = s.past.shift()!
        s.selectedId = null
      }),

      redo: () => set(s => {
        if (!s.future.length) return
        s.past.unshift(snap(s.nodes))
        if (s.past.length > HISTORY_LIMIT) s.past.pop()
        s.nodes      = s.future.shift()!
        s.selectedId = null
      }),

      addGlobalColor: (name, value) => set(s => {
        s.globalColors.push({ id: makeGlobalId(), name, value })
      }),
      updateGlobalColor: (id, patch) => set(s => {
        const c = s.globalColors.find(c => c.id === id)
        if (c) Object.assign(c, patch)
      }),
      deleteGlobalColor: (id) => set(s => {
        // Deliberately does NOT touch any node's style — a node still
        // storing a `global:<id>` reference to a since-deleted color
        // simply resolves to no color at render time (see resolveColor in
        // styleMapper.ts), the same as any other "value that no longer
        // exists" case. No migration pass needed.
        s.globalColors = s.globalColors.filter(c => c.id !== id)
      }),

      addGlobalTypography: (name) => set(s => {
        s.globalTypography.push({ id: makeGlobalId(), name, fontSize: 'base', fontWeight: 'normal', leading: 'normal' })
      }),
      updateGlobalTypography: (id, patch) => set(s => {
        const t = s.globalTypography.find(t => t.id === id)
        if (t) Object.assign(t, patch)
      }),
      deleteGlobalTypography: (id) => set(s => {
        s.globalTypography = s.globalTypography.filter(t => t.id !== id)
      }),

      updateSeo: (patch) => set(s => {
        Object.assign(s.seo, patch)
      }),

      openMediaPicker: (onPick) => set(s => {
        s.isMediaPickerOpen = true
        s.mediaPickCallback = onPick
      }),

      closeMediaPicker: () => set(s => {
        s.isMediaPickerOpen = false
        s.mediaPickCallback = null
      }),

      addUploadedMedia: (item) => set(s => {
        s.mediaLibrary.unshift(item)
      }),

      openImageEditor: (src, onSave) => set(s => {
        s.isImageEditorOpen   = true
        s.imageEditorSrc      = src
        s.imageEditorCallback = onSave
      }),

      closeImageEditor: () => set(s => {
        s.isImageEditorOpen   = false
        s.imageEditorSrc      = null
        s.imageEditorCallback = null
      }),
    }))
  )
)

function pushHistory(s: { past: NodeMap[]; future: NodeMap[]; nodes: NodeMap }) {
  s.past.unshift(snap(s.nodes))
  if (s.past.length > HISTORY_LIMIT) s.past.pop()
  s.future = []
}