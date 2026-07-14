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

  // 'column' is deliberately excluded from BLOCK_GROUPS — it's never
  // inserted directly from the sidebar, only auto-spawned as a child via
  // columns.createExtras(). So it's the one registry type expected to be
  // "orphaned" from BLOCK_GROUPS by design.
  it('every directly-insertable registry type is placed in a BLOCK_GROUP', () => {
    const groupedTypes = new Set(BLOCK_GROUPS.flatMap(g => g.types))
    const NOT_DIRECTLY_INSERTABLE = new Set(['column'])
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

describe('defaultFullWidth flag — must match the documented hardcoded-w-full node types', () => {
  const shouldBeFullWidth: NodeType[] = ['section', 'columns', 'image', 'divider', 'accordion']

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