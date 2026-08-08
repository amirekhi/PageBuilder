import { describe, it, expect } from 'vitest'
import { NODE_REGISTRY, BLOCK_GROUPS } from '../builder/registry'
import { NodeType } from '../builder/types'

const ALL_TYPES = Object.keys(NODE_REGISTRY) as NodeType[]

describe('NODE_REGISTRY shape', () => {
  it.each(ALL_TYPES)('%s has label, icon, defaultProps, and all three components', (type) => {
    const def = NODE_REGISTRY[type]
    expect(def.label).toBeTruthy()
    expect(def.icon).toBeTruthy()
    expect(def.defaultProps).toBeTypeOf('object')
    expect(def.EditorComponent).toBeTypeOf('function')
    expect(def.PreviewComponent).toBeTypeOf('function')
    expect(def.EditorPanel).toBeTypeOf('function')
  })

  it('every insertable type in BLOCK_GROUPS actually exists in NODE_REGISTRY', () => {
    const groupedTypes = BLOCK_GROUPS.flatMap(g => g.types)
    groupedTypes.forEach(type => {
      expect(NODE_REGISTRY[type]).toBeDefined()
    })
  })

  // These registry types are deliberately excluded from BLOCK_GROUPS — none
  // of them is ever inserted directly from the sidebar's block picker:
  //   - 'column' only ever comes into existence via columns.createExtras()
  //     when a Columns block is inserted.
  //   - 'tabpane' only ever comes into existence via tabs.createExtras()
  //     when a Tabs block is inserted, or via its own "+ Add tab" action
  //     (TabsPanel / TabsEditor's empty-state button) — see registry.tsx's
  //     tabpane entry for the full reasoning (a bare tabpane with no Tabs
  //     parent would just be an unlabeled Column with no header to click).
  //   - 'slide' is the same story for Carousel — only ever spawned via
  //     carousel.createExtras() or its own "+ Add slide" action.
  // So all three are the registry types expected to be "orphaned" from
  // BLOCK_GROUPS by design, not by omission.
  it('every directly-insertable registry type is placed in a BLOCK_GROUP', () => {
    const groupedTypes = new Set(BLOCK_GROUPS.flatMap(g => g.types))
    const NOT_DIRECTLY_INSERTABLE = new Set(['column', 'tabpane', 'slide'])
    ALL_TYPES
      .filter(type => !NOT_DIRECTLY_INSERTABLE.has(type))
      .forEach(type => {
        expect(groupedTypes.has(type)).toBe(true)
      })
  })
})

describe('columns.createExtras', () => {
  it('produces exactly 2 column children with fresh unique ids and correct parentId', () => {
    const parentId = 'parent_123'
    const extras = NODE_REGISTRY.columns.createExtras!(parentId)
    expect(extras).toHaveLength(2)
    extras.forEach(child => {
      expect(child.type).toBe('column')
      expect(child.parentId).toBe(parentId)
      expect(child.children).toEqual([])
    })
    expect(extras[0].id).not.toBe(extras[1].id)
  })

  it('generates a different id set on every call (not cached/shared)', () => {
    const first = NODE_REGISTRY.columns.createExtras!('p1')
    const second = NODE_REGISTRY.columns.createExtras!('p1')
    expect(first[0].id).not.toBe(second[0].id)
    expect(first[1].id).not.toBe(second[1].id)
  })
})

describe('tabs.createExtras', () => {
  it('produces exactly 2 tabpane children with fresh unique ids and correct parentId', () => {
    const parentId = 'parent_tabs_1'
    const extras = NODE_REGISTRY.tabs.createExtras!(parentId)
    expect(extras).toHaveLength(2)
    extras.forEach(child => {
      expect(child.type).toBe('tabpane')
      expect(child.parentId).toBe(parentId)
      expect(child.children).toEqual([])
      expect(child.props.label).toBeTruthy()
    })
    expect(extras[0].id).not.toBe(extras[1].id)
  })
})

describe('carousel.createExtras', () => {
  it('produces exactly 2 slide children with fresh unique ids and correct parentId', () => {
    const parentId = 'parent_carousel_1'
    const extras = NODE_REGISTRY.carousel.createExtras!(parentId)
    expect(extras).toHaveLength(2)
    extras.forEach(child => {
      expect(child.type).toBe('slide')
      expect(child.parentId).toBe(parentId)
      expect(child.children).toEqual([])
    })
    expect(extras[0].id).not.toBe(extras[1].id)
  })
})

describe('defaultFullWidth flag — must match the documented hardcoded-w-full node types', () => {
  // Grid/Tabs/Tab Pane/Carousel/Slide all hardcode 'w-full' in their own
  // Editor/Preview render (see the defaultFullWidth doc comment on each
  // entry in registry.tsx) — same pattern as the original five, so they
  // belong in this list too. Missing a type here isn't a style nitpick:
  // without defaultFullWidth, SelectableShell's canvas wrapper doesn't
  // know to mirror the child's own forced full width, and the selection
  // outline/resize handles visibly detach from the actual rendered block
  // whenever it sits in a non-stretch-aligned flex parent.
  const shouldBeFullWidth: NodeType[] = [
    'section', 'columns', 'image', 'divider', 'accordion',
     'grid', 'tabs', 'tabpane', 'carousel', 'slide', 'form',
  ]

  it.each(shouldBeFullWidth)('%s has defaultFullWidth: true', (type) => {
    expect(NODE_REGISTRY[type].defaultFullWidth).toBe(true)
  })

  it.each(ALL_TYPES.filter(t => !shouldBeFullWidth.includes(t)))('%s does NOT set defaultFullWidth', (type) => {
    expect(NODE_REGISTRY[type].defaultFullWidth).toBeFalsy()
  })
})

describe('defaultFlexFill flag — only Column hardcodes flex-1', () => {
  it('column has defaultFlexFill: true', () => {
    expect(NODE_REGISTRY.column.defaultFlexFill).toBe(true)
  })

  it.each(ALL_TYPES.filter(t => t !== 'column'))('%s does NOT set defaultFlexFill', (type) => {
    expect(NODE_REGISTRY[type].defaultFlexFill).toBeFalsy()
  })
})

it('section defaults to a flex column with maxWidth full and centerContent', () => {
  expect(NODE_REGISTRY.section.defaultProps.style).toMatchObject({
    display: 'flex', flexDir: 'col', maxWidth: 'full', centerContent: true,
  })
})

it('grid defaults to a 3x2 grid with dense-friendly row height and stretch alignment', () => {
  expect(NODE_REGISTRY.grid.defaultProps.style).toMatchObject({
    display: 'grid', gridCols: 3, gridRows: 2,
    justifyItems: 'stretch', align: 'stretch',
  })
})

it('carousel defaults to autoplay off, looping, with arrows and dots shown', () => {
  expect(NODE_REGISTRY.carousel.defaultProps).toMatchObject({
    autoplay: false, loop: true, showArrows: true, showDots: true,
  })
})