'use client'

import { NodeMap, PageNode } from './types'

function id() {
  return `node_${Math.random().toString(36).slice(2, 8)}`
}

export interface Template {
  label:     string
  icon:      string
  thumbnail: string // emoji or short descriptor for the picker card
  build:     () => { nodes: NodeMap; rootChildId: string }
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function buildHero(): { nodes: NodeMap; rootChildId: string } {
  const sectionId  = id()
  const headingId  = id()
  const subId      = id()
  const btnRowId   = id()
  const btn1Id     = id()
  const btn2Id     = id()

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 20, px: 8, display: 'flex', flexDir: 'col', gap: 6, maxWidth: '5xl', centerContent: true, bgColor: undefined, align: 'center', justify: 'center' } },
      children: [headingId, subId, btnRowId],
    },
    [headingId]: {
      id: headingId, type: 'heading', parentId: sectionId,
      props: { tag: 'h1', content: 'Build pages that convert.', style: { fontSize: '5xl', fontWeight: 'bold', textAlign: 'center', color: undefined } },
      children: [],
    },
    [subId]: {
      id: subId, type: 'text', parentId: sectionId,
      props: { content: 'A fast, visual way to design and ship landing pages without touching code. Drag blocks, customise everything, publish instantly.', style: { fontSize: 'lg', textAlign: 'center', color: undefined } },
      children: [],
    },
    [btnRowId]: {
      id: btnRowId, type: 'columns', parentId: sectionId,
      props: { style: { gap: 3, justify: 'center', align: 'center' } },
      children: [btn1Id, btn2Id],
    },
    [btn1Id]: {
      id: btn1Id, type: 'button', parentId: btnRowId,
      props: { label: 'Get started free', href: '#', variant: 'solid' },
      children: [],
    },
    [btn2Id]: {
      id: btn2Id, type: 'button', parentId: btnRowId,
      props: { label: 'See examples', href: '#', variant: 'outline' },
      children: [],
    },
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Feature two-column ───────────────────────────────────────────────────────

function buildTwoColFeature(): { nodes: NodeMap; rootChildId: string } {
  const sectionId = id()
  const colsId    = id()
  const col1Id    = id()
  const col2Id    = id()
  const imgId     = id()
  const eyebrowId = id()
  const headId    = id()
  const bodyId    = id()
  const btnId     = id()

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 8, maxWidth: '5xl', centerContent: true } },
      children: [colsId],
    },
    [colsId]: {
      id: colsId, type: 'columns', parentId: sectionId,
      props: { style: { gap: 12, align: 'center' } },
      children: [col1Id, col2Id],
    },
    [col1Id]: {
      id: col1Id, type: 'column', parentId: colsId,
      props: { style: { px: 0, py: 0 } },
      children: [imgId],
    },
    [col2Id]: {
      id: col2Id, type: 'column', parentId: colsId,
      props: { style: { px: 0, py: 4, display: 'flex', flexDir: 'col', gap: 4 } },
      children: [eyebrowId, headId, bodyId, btnId],
    },
    [imgId]: {
      id: imgId, type: 'image', parentId: col1Id,
      props: { src: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=600&q=80', alt: 'Feature screenshot', style: { width: 'full', rounded: 'xl', aspectRatio: '4/3', objectFit: 'cover' } },
      children: [],
    },
    [eyebrowId]: {
      id: eyebrowId, type: 'text', parentId: col2Id,
      props: { content: '✦ WHAT YOU GET', style: { fontSize: 'xs', fontWeight: 'semibold', color: undefined } },
      children: [],
    },
    [headId]: {
      id: headId, type: 'heading', parentId: col2Id,
      props: { tag: 'h2', content: 'Everything you need to launch fast.', style: { fontSize: '3xl', fontWeight: 'bold' } },
      children: [],
    },
    [bodyId]: {
      id: bodyId, type: 'text', parentId: col2Id,
      props: { content: 'Drag-and-drop blocks, live preview across breakpoints, one-click publish. No designer required.', style: { fontSize: 'base', color: undefined } },
      children: [],
    },
    [btnId]: {
      id: btnId, type: 'button', parentId: col2Id,
      props: { label: 'Learn more →', href: '#', variant: 'ghost' },
      children: [],
    },
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Testimonial ──────────────────────────────────────────────────────────────

function buildTestimonial(): { nodes: NodeMap; rootChildId: string } {
  const sectionId = id()
  const quoteId   = id()
  const authorId  = id()
  const divId     = id()

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 6, maxWidth: '3xl', centerContent: true, bgColor: undefined, align: 'center' } },
      children: [quoteId, divId, authorId],
    },
    [quoteId]: {
      id: quoteId, type: 'text', parentId: sectionId,
      props: { content: '"This builder cut our landing-page turnaround from two weeks to two hours. I can\'t imagine shipping without it now."', style: { fontSize: '2xl', fontWeight: 'medium', textAlign: 'center', fontStyle: 'italic' } },
      children: [],
    },
    [divId]: {
      id: divId, type: 'divider', parentId: sectionId,
      props: { style: { my: 2, borderColor: undefined } },
      children: [],
    },
    [authorId]: {
      id: authorId, type: 'text', parentId: sectionId,
      props: { content: 'Jordan Lee · Head of Growth, Acme Corp', style: { fontSize: 'sm', textAlign: 'center', color: undefined } },
      children: [],
    },
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Three-column features ────────────────────────────────────────────────────

function buildThreeColFeatures(): { nodes: NodeMap; rootChildId: string } {
  const sectionId = id()
  const headId    = id()
  const colsId    = id()

  function makeCard(parent: string, emoji: string, title: string, body: string) {
    const colId  = id()
    const emojiId = id()
    const titleId = id()
    const bodyId  = id()
    const nodes: Record<string, PageNode> = {
      [colId]: {
        id: colId, type: 'column', parentId: parent,
        props: { style: { px: 4, py: 6, bgColor: undefined, display: 'flex', flexDir: 'col', gap: 3 } },
        children: [emojiId, titleId, bodyId],
      },
      [emojiId]: {
        id: emojiId, type: 'text', parentId: colId,
        props: { content: emoji, style: { fontSize: '3xl' } },
        children: [],
      },
      [titleId]: {
        id: titleId, type: 'heading', parentId: colId,
        props: { tag: 'h3', content: title, style: { fontSize: 'xl', fontWeight: 'semibold' } },
        children: [],
      },
      [bodyId]: {
        id: bodyId, type: 'text', parentId: colId,
        props: { content: body, style: { fontSize: 'sm', color: undefined } },
        children: [],
      },
    }
    return { colId, nodes }
  }

  const c1 = makeCard(colsId, '⚡', 'Instant preview', 'See your changes live as you type. No refresh, no compile step.')
  const c2 = makeCard(colsId, '🎨', 'Full style control', 'Spacing, colour, typography — all editable without writing a single line of CSS.')
  const c3 = makeCard(colsId, '📱', 'Responsive out of the box', 'Switch between desktop, tablet, and mobile previews at any time.')

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 10, maxWidth: '6xl', centerContent: true } },
      children: [headId, colsId],
    },
    [headId]: {
      id: headId, type: 'heading', parentId: sectionId,
      props: { tag: 'h2', content: 'Why teams love it.', style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' } },
      children: [],
    },
    [colsId]: {
      id: colsId, type: 'columns', parentId: sectionId,
      props: { style: { gap: 6, align: 'start' } },
      children: [c1.colId, c2.colId, c3.colId],
    },
    ...c1.nodes,
    ...c2.nodes,
    ...c3.nodes,
  }

  return { nodes, rootChildId: sectionId }
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────

function buildCTABanner(): { nodes: NodeMap; rootChildId: string } {
  const sectionId = id()
  const headId    = id()
  const subId     = id()
  const btnId     = id()

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 5, maxWidth: '3xl', centerContent: true, align: 'center' } },
      children: [headId, subId, btnId],
    },
    [headId]: {
      id: headId, type: 'heading', parentId: sectionId,
      props: { tag: 'h2', content: 'Ready to ship your next page?', style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' } },
      children: [],
    },
    [subId]: {
      id: subId, type: 'text', parentId: sectionId,
      props: { content: 'Join thousands of teams who publish faster with Page Builder. Free to start, no credit card required.', style: { fontSize: 'lg', textAlign: 'center', color: undefined } },
      children: [],
    },
    [btnId]: {
      id: btnId, type: 'button', parentId: sectionId,
      props: { label: 'Start building for free', href: '#', variant: 'solid' },
      children: [],
    },
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const TEMPLATES: Template[] = [
  {
    label:     'Hero',
    icon:      '🏔️',
    thumbnail: 'Large headline, subtext, and two CTA buttons',
    build:     buildHero,
  },
  {
    label:     'Feature — Image + Text',
    icon:      '🖼️',
    thumbnail: 'Two-column: image left, eyebrow + heading + body right',
    build:     buildTwoColFeature,
  },
  {
    label:     'Testimonial',
    icon:      '💬',
    thumbnail: 'Large pull-quote with author credit',
    build:     buildTestimonial,
  },
  {
    label:     'Feature Grid',
    icon:      '✦',
    thumbnail: 'Three columns with icon, title, and description',
    build:     buildThreeColFeatures,
  },
  {
    label:     'CTA Banner',
    icon:      '🚀',
    thumbnail: 'Headline, subtitle, and single call-to-action button',
    build:     buildCTABanner,
  },
]