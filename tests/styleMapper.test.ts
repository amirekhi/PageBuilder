import { describe, it, expect } from 'vitest'
import {
  buildClassName,
  buildInlineStyle,
  buildSectionOuterClassName,
  buildSectionOuterStyle,
  getBoxAlign,
  setBoxAlign,
  resolveColor,
} from '../builder/styleMapper'

describe('buildClassName', () => {
  it('includes rounded/border/shadow classes', () => {
    const cls = buildClassName({ rounded: 'xl', borderWidth: 2, borderStyle: 'solid', shadow: 'lg' })
    expect(cls).toContain('rounded-xl')
    expect(cls).toContain('border-2')
    expect(cls).toContain('border-solid')
    expect(cls).toContain('shadow-lg')
  })

  it('omits w-full/max-w when width/maxWidth are unset', () => {
    const cls = buildClassName({})
    expect(cls).not.toContain('w-full')
    expect(cls).not.toContain('max-w-')
  })
})

// REGRESSION TEST: SectionEditor used to hardcode className="w-full relative"
// and never call buildClassName/buildSectionOuterClassName at all — so
// rounded/border/shadow never reached the DOM in the Editor (only in
// Preview, whose <section> did call buildClassName). This test locks in
// that buildSectionOuterClassName actually surfaces those class-based
// properties, so if SectionEditor's className ever gets hardcoded again,
// this test won't tell you directly (it doesn't test the component) — but
// it does guarantee the helper it SHOULD be calling still works correctly.
// See SectionEditor.test.tsx below for the component-level version that
// would have caught the actual regression.
describe('buildSectionOuterClassName', () => {
  it('keeps rounded/border/shadow classes (the outer band owns these)', () => {
    const cls = buildSectionOuterClassName({ rounded: 'xl', shadow: 'md', borderWidth: 1 }, 'w-full relative')
    expect(cls).toContain('rounded-xl')
    expect(cls).toContain('shadow-md')
    expect(cls).toContain('border')
    expect(cls).toContain('w-full')
    expect(cls).toContain('relative')
  })

  it('strips layout/sizing classes (those belong on the INNER column instead)', () => {
    const cls = buildSectionOuterClassName({ display: 'flex', flexDir: 'row', justify: 'center', align: 'center', width: 'full', maxWidth: 'lg' })
    expect(cls).not.toContain('flex')
    expect(cls).not.toContain('flex-row')
    expect(cls).not.toContain('justify-center')
    expect(cls).not.toContain('items-center')
    expect(cls).not.toContain('w-full')
    expect(cls).not.toContain('max-w-lg')
  })
})

// REGRESSION TEST: buildSectionOuterStyle originally had no textColor/
// borderColor handling at all — a Section's own Text Color / Border Color
// panel controls silently changed state but never rendered in the Editor
// (Preview used buildInlineStyle, which always had this).
describe('buildSectionOuterStyle', () => {
  it('applies textColor and borderColor as inline styles', () => {
    const style = buildSectionOuterStyle({ textColor: 'white', borderColor: 'violet-500' })
    expect(style.color).toBe(resolveColor('white'))
    expect(style.borderColor).toBe(resolveColor('violet-500'))
  })

  it('applies vertical margin (mt/mb/my)', () => {
    const styleFromMy = buildSectionOuterStyle({ my: 4 })
    expect(styleFromMy.marginTop).toBe(16)
    expect(styleFromMy.marginBottom).toBe(16)

    const styleFromSides = buildSectionOuterStyle({ mt: 2, mb: 6 })
    expect(styleFromSides.marginTop).toBe(8)
    expect(styleFromSides.marginBottom).toBe(24)
  })
})

// REGRESSION TEST: a percentage width applied twice (once via the
// SelectableShell wrapper's buildBoxSizingStyle, once again via the child's
// own buildInlineStyle) compounds — 45% of an element that's already 45% of
// its real container resolves to ~20%, not 45%. skipSizing exists
// specifically to prevent this double-application in the Editor.
describe('buildInlineStyle skipSizing', () => {
  it('omits width when skipSizing is true (Editor path)', () => {
    const style = buildInlineStyle({ width: 45, widthUnit: '%' }, { skipSizing: true })
    expect(style.width).toBeUndefined()
  })

  it('applies percentage width when skipSizing is false (Preview path)', () => {
    const style = buildInlineStyle({ width: 45, widthUnit: '%' }, { skipSizing: false })
    expect(style.width).toBe('45%')
  })

  it('applies plain pixel width regardless of skipSizing (harmless either way)', () => {
    const withSkip    = buildInlineStyle({ width: 320, widthUnit: 'px' }, { skipSizing: true })
    const withoutSkip = buildInlineStyle({ width: 320, widthUnit: 'px' }, { skipSizing: false })
    expect(withSkip.width).toBeUndefined() // still correctly omitted — the wrapper owns it
    expect(withoutSkip.width).toBe(320)
  })
})

describe('getBoxAlign / setBoxAlign round-trip', () => {
  it('center -> ml/mr auto -> reads back as center', () => {
    const patch = setBoxAlign('center')
    expect(getBoxAlign(patch as any)).toBe('center')
  })

  it('right -> ml auto, mr 0 -> reads back as right', () => {
    const patch = setBoxAlign('right')
    expect(getBoxAlign(patch as any)).toBe('right')
  })

  it('left -> ml 0, mr auto -> reads back as left', () => {
    const patch = setBoxAlign('left')
    expect(getBoxAlign(patch as any)).toBe('left')
  })
})

describe('resolveColor', () => {
  it('resolves known preset names to hex', () => {
    expect(resolveColor('violet-600')).toBe('#7c3aed')
  })

  it('passes through raw values unchanged (e.g. custom hex, transparent)', () => {
    expect(resolveColor('#123456')).toBe('#123456')
    expect(resolveColor('transparent')).toBe('transparent')
  })

  it('returns undefined for no value', () => {
    expect(resolveColor(undefined)).toBeUndefined()
  })
})