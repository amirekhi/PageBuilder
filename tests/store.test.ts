// store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useBuilderStore } from '../builder/store'

// Snapshot the store's true initial state once, right after module load,
// before any test has mutated it. Every test then resets to a deep clone
// of this — so we're always working with the REAL INITIAL_NODES / SEED_MEDIA
// that store.ts itself defines, no hand-rolled fixtures.
const pristine = useBuilderStore.getState()
const pristineNodes = JSON.parse(JSON.stringify(pristine.nodes))
const pristineMedia = JSON.parse(JSON.stringify(pristine.mediaLibrary))
const rootId = pristine.rootId

beforeEach(() => {
  useBuilderStore.setState({
    nodes: JSON.parse(JSON.stringify(pristineNodes)),
    rootId,
    selectedId: null,
    draggingId: null,
    resizingId: null,
    mode: 'edit',
    previewWidth: 'desktop',
    editingBreakpoint: 'desktop',
    canvasScale: 1,
    previewReplayNonce: 0,
    past: [],
    future: [],
    mediaLibrary: JSON.parse(JSON.stringify(pristineMedia)),
    isMediaPickerOpen: false,
    mediaPickCallback: null,
  })
})

describe('addNode (real NODE_REGISTRY)', () => {
  it('adds a text node with the registry default props', () => {
    useBuilderStore.getState().addNode('text', rootId, 0)
    const state = useBuilderStore.getState()
    const newId = state.nodes[rootId].children[0]
    expect(state.nodes[newId].type).toBe('text')
    expect(state.nodes[newId].props.content).toBe('Add your text here.')
    expect(state.selectedId).toBe(newId)
  })

  it('spawns the two column children via createExtras when adding columns', () => {
    useBuilderStore.getState().addNode('columns', rootId, 0)
    const state = useBuilderStore.getState()
    const columnsId = state.nodes[rootId].children[0]
    const columnsNode = state.nodes[columnsId]

    expect(columnsNode.type).toBe('columns')
    expect(columnsNode.children).toHaveLength(2)
    columnsNode.children.forEach(childId => {
      expect(state.nodes[childId].type).toBe('column')
      expect(state.nodes[childId].parentId).toBe(columnsId)
    })
  })

  it('inserts at the given index rather than always appending', () => {
    useBuilderStore.getState().addNode('text', rootId, 0)
    useBuilderStore.getState().addNode('heading', rootId, 0) // insert before the text node
    const children = useBuilderStore.getState().nodes[rootId].children
    expect(useBuilderStore.getState().nodes[children[0]].type).toBe('heading')
    expect(useBuilderStore.getState().nodes[children[1]].type).toBe('text')
  })

  it('pushes history so the action becomes undoable', () => {
    expect(useBuilderStore.getState().canUndo()).toBe(false)
    useBuilderStore.getState().addNode('button', rootId, 0)
    expect(useBuilderStore.getState().canUndo()).toBe(true)
  })
})

describe('deleteNode', () => {
  it('removes the node, clears selection, and detaches it from its parent', () => {
    useBuilderStore.getState().addNode('button', rootId, 0)
    const id = useBuilderStore.getState().nodes[rootId].children[0]

    useBuilderStore.getState().deleteNode(id)
    const state = useBuilderStore.getState()
    expect(state.nodes[id]).toBeUndefined()
    expect(state.nodes[rootId].children).not.toContain(id)
    expect(state.selectedId).toBeNull()
  })

  it('cascades to children (deleteSubtree) — deleting Columns removes its Columns children too', () => {
    useBuilderStore.getState().addNode('columns', rootId, 0)
    const columnsId = useBuilderStore.getState().nodes[rootId].children[0]
    const [col1, col2] = useBuilderStore.getState().nodes[columnsId].children

    useBuilderStore.getState().deleteNode(columnsId)
    const state = useBuilderStore.getState()
    expect(state.nodes[columnsId]).toBeUndefined()
    expect(state.nodes[col1]).toBeUndefined()
    expect(state.nodes[col2]).toBeUndefined()
  })
})

describe('duplicateNode', () => {
  it('clones a leaf node with a new id, deep-cloned props, right after the original', () => {
    useBuilderStore.getState().addNode('heading', rootId, 0)
    const origId = useBuilderStore.getState().nodes[rootId].children[0]

    useBuilderStore.getState().duplicateNode(origId)
    const state = useBuilderStore.getState()
    const children = state.nodes[rootId].children

    expect(children).toHaveLength(2)
    expect(children[0]).toBe(origId)
    const cloneId = children[1]
    expect(cloneId).not.toBe(origId)
    expect(state.nodes[cloneId].props.content).toBe('Your Heading')
    expect(state.selectedId).toBe(cloneId)

    // props must be a deep clone, not a shared reference
    expect(state.nodes[cloneId].props).not.toBe(state.nodes[origId].props)
  })

  it('clones an entire subtree (Columns + its 2 columns) with fresh ids throughout', () => {
    useBuilderStore.getState().addNode('columns', rootId, 0)
    const columnsId = useBuilderStore.getState().nodes[rootId].children[0]
    const originalColChildren = useBuilderStore.getState().nodes[columnsId].children

    useBuilderStore.getState().duplicateNode(columnsId)
    const state = useBuilderStore.getState()
    const cloneColumnsId = state.nodes[rootId].children[1]
    const cloneColChildren = state.nodes[cloneColumnsId].children

    expect(cloneColChildren).toHaveLength(2)
    cloneColChildren.forEach((cid, i) => {
      expect(cid).not.toBe(originalColChildren[i])
      expect(state.nodes[cid].parentId).toBe(cloneColumnsId)
      expect(state.nodes[cid].type).toBe('column')
    })
  })
})

describe('moveNode', () => {
  it('relocates a node from one parent to another', () => {
    useBuilderStore.getState().addNode('section', rootId, 0)
    const sectionId = useBuilderStore.getState().nodes[rootId].children[0]
    useBuilderStore.getState().addNode('text', rootId, 1)
    const textId = useBuilderStore.getState().nodes[rootId].children[1]

    useBuilderStore.getState().moveNode(textId, sectionId, 0)
    const state = useBuilderStore.getState()
    expect(state.nodes[rootId].children).not.toContain(textId)
    expect(state.nodes[sectionId].children).toContain(textId)
    expect(state.nodes[textId].parentId).toBe(sectionId)
  })

  it('refuses to move a node into its own descendant (prevents cycles)', () => {
    useBuilderStore.getState().addNode('section', rootId, 0)
    const sectionA = useBuilderStore.getState().nodes[rootId].children[0]
    useBuilderStore.getState().addNode('section', sectionA, 0)
    const sectionB = useBuilderStore.getState().nodes[sectionA].children[0]

    useBuilderStore.getState().moveNode(sectionA, sectionB, 0)
    const state = useBuilderStore.getState()
    // sectionA must still be exactly where it started — under root
    expect(state.nodes[rootId].children).toContain(sectionA)
    expect(state.nodes[sectionA].parentId).toBe(rootId)
  })

  it('adjusts the target index correctly when reordering within the same parent', () => {
    useBuilderStore.getState().addNode('text', rootId, 0)
    useBuilderStore.getState().addNode('heading', rootId, 1)
    useBuilderStore.getState().addNode('button', rootId, 2)
    const [textId, headingId, buttonId] = useBuilderStore.getState().nodes[rootId].children

    // move the first item (index 0) to the end (index 3)
    useBuilderStore.getState().moveNode(textId, rootId, 3)
    const children = useBuilderStore.getState().nodes[rootId].children
    expect(children).toEqual([headingId, buttonId, textId])
  })
})

describe('undo / redo', () => {
  it('reverts the last change and canRedo becomes true', () => {
    useBuilderStore.getState().addNode('text', rootId, 0)
    expect(useBuilderStore.getState().nodes[rootId].children).toHaveLength(1)

    useBuilderStore.getState().undo()
    const state = useBuilderStore.getState()
    expect(state.nodes[rootId].children).toHaveLength(0)
    expect(state.canRedo()).toBe(true)
    expect(state.canUndo()).toBe(false)
  })

  it('redo restores what undo reverted', () => {
    useBuilderStore.getState().addNode('text', rootId, 0)
    const idAfterAdd = useBuilderStore.getState().nodes[rootId].children[0]

    useBuilderStore.getState().undo()
    useBuilderStore.getState().redo()

    const state = useBuilderStore.getState()
    expect(state.nodes[rootId].children).toEqual([idAfterAdd])
    expect(state.canRedo()).toBe(false)
  })

  it('a new action after undo clears the redo stack', () => {
    useBuilderStore.getState().addNode('text', rootId, 0)
    useBuilderStore.getState().undo()
    expect(useBuilderStore.getState().canRedo()).toBe(true)

    useBuilderStore.getState().addNode('heading', rootId, 0)
    expect(useBuilderStore.getState().canRedo()).toBe(false)
  })

  it('caps history at 50 entries', () => {
    for (let i = 0; i < 60; i++) {
      useBuilderStore.getState().addNode('text', rootId, 0)
    }
    expect(useBuilderStore.getState().past.length).toBe(50)
  })
})

describe('updateProps', () => {
  it('merges new props onto the existing ones without wiping untouched keys', () => {
    useBuilderStore.getState().addNode('button', rootId, 0)
    const id = useBuilderStore.getState().nodes[rootId].children[0]

    useBuilderStore.getState().updateProps(id, { label: 'Buy now' })
    const props = useBuilderStore.getState().nodes[id].props
    expect(props.label).toBe('Buy now')
    expect(props.href).toBe('#') // untouched default survives the merge
  })
})

describe('media actions', () => {
  it('openMediaPicker stores the callback and flips the flag', () => {
    const cb = () => {}
    useBuilderStore.getState().openMediaPicker(cb)
    const state = useBuilderStore.getState()
    expect(state.isMediaPickerOpen).toBe(true)
    expect(state.mediaPickCallback).toBe(cb)
  })

  it('closeMediaPicker resets both', () => {
    useBuilderStore.getState().openMediaPicker(() => {})
    useBuilderStore.getState().closeMediaPicker()
    const state = useBuilderStore.getState()
    expect(state.isMediaPickerOpen).toBe(false)
    expect(state.mediaPickCallback).toBeNull()
  })

  it('addUploadedMedia unshifts onto the front of the library', () => {
    const before = useBuilderStore.getState().mediaLibrary.length
    useBuilderStore.getState().addUploadedMedia({
      id: 'upload_test', url: 'data:image/png;base64,xxx', name: 'test.png',
      alt: 'test', width: 10, height: 10, category: 'photo', sizeLabel: '1 KB',
    })
    const state = useBuilderStore.getState()
    expect(state.mediaLibrary.length).toBe(before + 1)
    expect(state.mediaLibrary[0].id).toBe('upload_test')
  })
})

describe('simple setters', () => {
  it('setMode / setPreviewWidth / setEditingBreakpoint / setCanvasScale', () => {
    useBuilderStore.getState().setMode('preview')
    useBuilderStore.getState().setPreviewWidth('mobile')
    useBuilderStore.getState().setEditingBreakpoint('tablet')
    useBuilderStore.getState().setCanvasScale(0.75)

    const state = useBuilderStore.getState()
    expect(state.mode).toBe('preview')
    expect(state.previewWidth).toBe('mobile')
    expect(state.editingBreakpoint).toBe('tablet')
    expect(state.canvasScale).toBe(0.75)
  })

  it('replayAnimations increments the nonce', () => {
    const before = useBuilderStore.getState().previewReplayNonce
    useBuilderStore.getState().replayAnimations()
    expect(useBuilderStore.getState().previewReplayNonce).toBe(before + 1)
  })
})

describe('selectedNode', () => {
  it('returns null when nothing is selected', () => {
    expect(useBuilderStore.getState().selectedNode()).toBeNull()
  })

  it('returns the node matching selectedId', () => {
    useBuilderStore.getState().addNode('text', rootId, 0)
    const id = useBuilderStore.getState().nodes[rootId].children[0]
    expect(useBuilderStore.getState().selectedNode()?.id).toBe(id)
  })
})