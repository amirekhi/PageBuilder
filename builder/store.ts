'use client'

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { NodeMap, PageNode, NodeType } from './types'
import { NODE_REGISTRY } from './registry'
import { SEED_MEDIA, MediaItem } from './Media'

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
    props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 6, maxWidth: '5xl', centerContent: true } },
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

type MediaPickCallback = (item: MediaItem) => void

interface BuilderStore {
  nodes:        NodeMap
  rootId:       string
  selectedId:   string | null
  draggingId:   string | null
  resizingId:   string | null
  mode:         'edit' | 'preview'
  previewWidth: PreviewWidth
  editingBreakpoint: PreviewWidth

  // The current zoom factor the EditorRenderer canvas is being displayed
  // at (1 = full size, <1 = shrunk to fit available panel width). The
  // canvas is always rendered internally at its true logical pixel width
  // (e.g. 1440px for desktop) so layout math (maxWidth, fixed widths,
  // percentages) resolves exactly as it would on a real page — this value
  // is purely the visual scale-down applied on top, and ResizeHandles
  // reads it to convert raw pointer-movement pixels back into logical
  // canvas pixels so dragging still feels 1:1 regardless of zoom.
  canvasScale: number

  // Bumped by replayAnimations() below. PreviewRenderer keys its rendered
  // tree off this value (see Renderer.tsx) — changing a React key forces a
  // full unmount/remount of every node, which is what actually resets each
  // AnimatedNode's IntersectionObserver and re-triggers its CSS animation.
  // Lives here (not as local useState in PreviewRenderer) specifically so
  // TopBar — a totally separate component — can trigger it via a button.
  previewReplayNonce: number

  past:         NodeMap[]
  future:       NodeMap[]

  // Media library
  mediaLibrary:      MediaItem[]
  isMediaPickerOpen: boolean
  mediaPickCallback: MediaPickCallback | null

  selectedNode:    () => PageNode | null
  canUndo:         () => boolean
  canRedo:         () => boolean

  setMode:              (mode: 'edit' | 'preview') => void
  setPreviewWidth:      (w: PreviewWidth) => void
  setEditingBreakpoint: (bp: PreviewWidth) => void
  setCanvasScale:       (scale: number) => void
  replayAnimations:     () => void
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

  // Media actions
  openMediaPicker:  (onPick: MediaPickCallback) => void
  closeMediaPicker: () => void
  addUploadedMedia: (item: MediaItem) => void
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
      past:         [],
      future:       [],

      mediaLibrary:      SEED_MEDIA,
      isMediaPickerOpen: false,
      mediaPickCallback: null,

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

      // ── Media ──
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
    }))
  )
)

function pushHistory(s: { past: NodeMap[]; future: NodeMap[]; nodes: NodeMap }) {
  s.past.unshift(snap(s.nodes))
  if (s.past.length > HISTORY_LIMIT) s.past.pop()
  s.future = []
}