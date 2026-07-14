// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import {
  sanitizeRichText, buildTextExtensions, buildHeadingExtensions, useRichTextEdit,
} from '../builder/richText'
import { useBuilderStore } from '../builder/store'
import { PageNode } from '../builder/types'

function makeNode(type: PageNode['type'] = 'text', content = '<p>Hello</p>'): PageNode {
  return { id: 'n1', type, parentId: null, children: [], props: { content } }
}

describe('sanitizeRichText', () => {
  it('keeps allowlisted formatting tags untouched', () => {
    const html = '<p><strong>Bold</strong> <em>italic</em> <u>underline</u> <a href="https://x.com">link</a></p>'
    expect(sanitizeRichText(html)).toBe(html)
  })

  it('strips <script> tags entirely', () => {
    const html = '<p>Hello</p><script>alert(1)</script>'
    const clean = sanitizeRichText(html)
    expect(clean).not.toContain('<script>')
    expect(clean).not.toContain('alert')
  })

  it('strips disallowed event-handler attributes like onclick', () => {
    const html = '<p onclick="alert(1)">Hello</p>'
    const clean = sanitizeRichText(html)
    expect(clean).not.toContain('onclick')
    expect(clean).toContain('Hello')
  })

  it('strips tags not in the allowlist (e.g. iframe, img) while keeping the text', () => {
    const html = '<p>Hello<iframe src="evil.com"></iframe> world</p>'
    const clean = sanitizeRichText(html)
    expect(clean).not.toContain('<iframe')
    expect(clean).toContain('Hello')
    expect(clean).toContain('world')
  })

  it('keeps lists and blockquotes (used by Text but not Heading)', () => {
    const html = '<ul><li>one</li><li>two</li></ul><blockquote>quote</blockquote>'
    expect(sanitizeRichText(html)).toBe(html)
  })
})

describe('buildTextExtensions / buildHeadingExtensions', () => {
  it('both return a non-empty extension array', () => {
    expect(buildTextExtensions().length).toBeGreaterThan(0)
    expect(buildHeadingExtensions().length).toBeGreaterThan(0)
  })
})

describe('useRichTextEdit', () => {
  beforeEach(() => {
    useBuilderStore.setState({ selectedId: 'n1' })
  })

  it('starts NOT in rich-editing mode', () => {
    const node = makeNode()
    const { result } = renderHook(() => useRichTextEdit(node, 'content', buildTextExtensions()))
    expect(result.current.isRichEditing).toBe(false)
  })

  it('startEditing() flips isRichEditing to true and the editor becomes editable', async () => {
    const node = makeNode()
    const { result } = renderHook(() => useRichTextEdit(node, 'content', buildTextExtensions()))

    act(() => { result.current.startEditing() })

    expect(result.current.isRichEditing).toBe(true)
    await waitFor(() => expect(result.current.editor?.isEditable).toBe(true))
  })

  // REGRESSION TEST for the "commit on deselect" path — the second of the
  // two ways editing can end (see the block comment on useRichTextEdit):
  // if selectedId changes to a DIFFERENT node while mid-edit, WITHOUT a
  // native blur event firing first (e.g. clicking straight from this block
  // onto another block's own canvas element), it must still commit and
  // close — this is exactly the scenario a real blur listener would miss.
  it('commits and exits rich-editing when selectedId moves to a different node', async () => {
    const node = makeNode('text', '<p>Original</p>')
    let capturedProps: Record<string, unknown> | null = null
    const updateProps = (id: string, props: Record<string, unknown>) => { capturedProps = props }
    useBuilderStore.setState({ updateProps: updateProps as any })

    const { result } = renderHook(() => useRichTextEdit(node, 'content', buildTextExtensions()))

    act(() => { result.current.startEditing() })
    await waitFor(() => expect(result.current.editor?.isEditable).toBe(true))

    act(() => {
      result.current.editor?.commands.insertContent(' edited')
    })

    act(() => {
      useBuilderStore.setState({ selectedId: 'some-other-node' })
    })

    await waitFor(() => expect(result.current.isRichEditing).toBe(false))
    expect(capturedProps).toEqual({ content: expect.stringContaining('edited') })
  })

  it('does NOT commit or exit when selectedId stays the same node', async () => {
    const node = makeNode()
    const { result } = renderHook(() => useRichTextEdit(node, 'content', buildTextExtensions()))

    act(() => { result.current.startEditing() })
    await waitFor(() => expect(result.current.editor?.isEditable).toBe(true))

    act(() => {
      // re-set to the SAME id — should be a no-op for the commit-on-deselect effect
      useBuilderStore.setState({ selectedId: 'n1' })
    })

    expect(result.current.isRichEditing).toBe(true)
  })

  it('syncs external content changes into the editor while NOT editing', async () => {
    const node = makeNode('text', '<p>First</p>')
    const { result, rerender } = renderHook(
      ({ n }) => useRichTextEdit(n, 'content', buildTextExtensions()),
      { initialProps: { n: node } }
    )

    await waitFor(() => expect(result.current.editor).not.toBeNull())
    expect(result.current.editor?.getHTML()).toBe('<p>First</p>')

    const updatedNode = { ...node, props: { ...node.props, content: '<p>Changed externally</p>' } }
    rerender({ n: updatedNode })

    await waitFor(() => expect(result.current.editor?.getHTML()).toBe('<p>Changed externally</p>'))
  })
})