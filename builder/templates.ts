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

// ─── Pricing ──────────────────────────────────────────────────────────────────

function buildPricing(): { nodes: NodeMap; rootChildId: string } {
  const sectionId = id()
  const headId    = id()
  const colsId    = id()

  function makeTier(parent: string, name: string, price: string, featured: boolean, features: string[]) {
    const colId    = id()
    const badgeId  = id()
    const nameId   = id()
    const priceId  = id()
    const listId   = id()
    const btnId    = id()
    const children = featured ? [badgeId, nameId, priceId, listId, btnId] : [nameId, priceId, listId, btnId]
    const nodes: Record<string, PageNode> = {
      [colId]: {
        id: colId, type: 'column', parentId: parent,
        props: { style: {
          px: 6, py: 8, display: 'flex', flexDir: 'col', gap: 4,
          bgColor: featured ? 'violet-600' : 'neutral-50',
          rounded: 'xl',
        } },
        children,
      },
      [nameId]: {
        id: nameId, type: 'heading', parentId: colId,
        props: { tag: 'h3', content: name, style: { fontSize: 'lg', fontWeight: 'semibold', textColor: featured ? 'white' : 'neutral-900' } },
        children: [],
      },
      [priceId]: {
        id: priceId, type: 'text', parentId: colId,
        props: { content: price, style: { fontSize: '4xl', fontWeight: 'bold', textColor: featured ? 'white' : 'neutral-900' } },
        children: [],
      },
      [listId]: {
        id: listId, type: 'list', parentId: colId,
        props: { items: features, markerType: 'check', style: { fontSize: 'sm', textColor: featured ? 'white' : 'neutral-600' } },
        children: [],
      },
      [btnId]: {
        id: btnId, type: 'button', parentId: colId,
        props: { label: 'Choose plan', href: '#', variant: featured ? 'outline' : 'solid' },
        children: [],
      },
    }
    if (featured) {
      nodes[badgeId] = {
        id: badgeId, type: 'badge', parentId: colId,
        props: { label: 'Most popular', variant: 'outline' },
        children: [],
      }
    }
    return { colId, nodes }
  }

  const t1 = makeTier(colsId, 'Starter',    '$9/mo',  false, ['1 project', 'Basic blocks', 'Community support'])
  const t2 = makeTier(colsId, 'Pro',        '$29/mo', true,  ['Unlimited projects', 'All blocks + templates', 'Priority support'])
  const t3 = makeTier(colsId, 'Enterprise', '$99/mo', false, ['Everything in Pro', 'SSO & audit logs', 'Dedicated manager'])

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 10, maxWidth: '6xl', centerContent: true } },
      children: [headId, colsId],
    },
    [headId]: {
      id: headId, type: 'heading', parentId: sectionId,
      props: { tag: 'h2', content: 'Simple, transparent pricing', style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' } },
      children: [],
    },
    [colsId]: {
      id: colsId, type: 'columns', parentId: sectionId,
      props: { style: { gap: 6, align: 'stretch' } },
      children: [t1.colId, t2.colId, t3.colId],
    },
    ...t1.nodes, ...t2.nodes, ...t3.nodes,
  }

  return { nodes, rootChildId: sectionId }
}

// ─── FAQ ────────────────────────────────────────────────────────────────────

function buildFAQ(): { nodes: NodeMap; rootChildId: string } {
  const sectionId = id()
  const headId    = id()

  function makeQA(parent: string, q: string, a: string) {
    const qId = id()
    const aId = id()
    const divId = id()
    return {
      ids: [qId, aId, divId],
      nodes: {
        [qId]: { id: qId, type: 'heading', parentId: parent, props: { tag: 'h3', content: q, style: { fontSize: 'lg', fontWeight: 'semibold' } }, children: [] },
        [aId]: { id: aId, type: 'text', parentId: parent, props: { content: a, style: { fontSize: 'base', textColor: 'neutral-600' } }, children: [] },
        [divId]: { id: divId, type: 'divider', parentId: parent, props: { style: { my: 4, borderColor: 'neutral-200' } }, children: [] },
      } as Record<string, PageNode>,
    }
  }

  const qa1 = makeQA(sectionId, 'How long does setup take?', 'Most teams are publishing their first page within an hour — no code required.')
  const qa2 = makeQA(sectionId, 'Can I use my own domain?', 'Yes, connect any custom domain from your project settings in a few clicks.')
  const qa3 = makeQA(sectionId, 'Is there a free plan?', 'Yes, the Starter plan is free forever for a single project.')

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 4, maxWidth: '3xl', centerContent: true } },
      children: [headId, ...qa1.ids, ...qa2.ids, ...qa3.ids],
    },
    [headId]: {
      id: headId, type: 'heading', parentId: sectionId,
      props: { tag: 'h2', content: 'Frequently asked questions', style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' } },
      children: [],
    },
    ...qa1.nodes, ...qa2.nodes, ...qa3.nodes,
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function buildStats(): { nodes: NodeMap; rootChildId: string } {
  const sectionId = id()
  const colsId    = id()

  function makeStat(parent: string, num: string, label: string) {
    const colId   = id()
    const numId   = id()
    const labelId = id()
    return {
      colId,
      nodes: {
        [colId]:   { id: colId, type: 'column', parentId: parent, props: { style: { px: 4, py: 4, display: 'flex', flexDir: 'col', gap: 1, align: 'center' } }, children: [numId, labelId] },
        [numId]:   { id: numId, type: 'heading', parentId: colId, props: { tag: 'h3', content: num, style: { fontSize: '4xl', fontWeight: 'bold', textAlign: 'center', textColor: 'violet-600' } }, children: [] },
        [labelId]: { id: labelId, type: 'text', parentId: colId, props: { content: label, style: { fontSize: 'sm', textAlign: 'center', textColor: 'neutral-500' } }, children: [] },
      } as Record<string, PageNode>,
    }
  }

  const s1 = makeStat(colsId, '12k+', 'Pages published')
  const s2 = makeStat(colsId, '99.9%', 'Uptime')
  const s3 = makeStat(colsId, '4.9/5', 'Average rating')
  const s4 = makeStat(colsId, '60+', 'Countries')

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 14, px: 8, display: 'flex', flexDir: 'col', maxWidth: '6xl', centerContent: true } },
      children: [colsId],
    },
    [colsId]: {
      id: colsId, type: 'columns', parentId: sectionId,
      props: { style: { gap: 4, justify: 'between' } },
      children: [s1.colId, s2.colId, s3.colId, s4.colId],
    },
    ...s1.nodes, ...s2.nodes, ...s3.nodes, ...s4.nodes,
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Header / Nav ───────────────────────────────────────────────────────────

function buildHeader(): { nodes: NodeMap; rootChildId: string } {
  const sectionId = id()
  const rowId     = id()
  const logoColId = id()
  const navColId  = id()
  const logoId    = id()
  const navListId = id()
  const btnId     = id()

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 4, px: 8, display: 'flex', flexDir: 'col', maxWidth: '7xl', centerContent: true, borderColor: 'neutral-200', borderWidth: 0 } },
      children: [rowId],
    },
    [rowId]: {
      id: rowId, type: 'columns', parentId: sectionId,
      props: { style: { gap: 6, align: 'center', justify: 'between' } },
      children: [logoColId, navColId],
    },
    [logoColId]: {
      id: logoColId, type: 'column', parentId: rowId,
      props: { style: { px: 0, py: 0 } },
      children: [logoId],
    },
    [logoId]: {
      id: logoId, type: 'heading', parentId: logoColId,
      props: { tag: 'h3', content: 'Brand', style: { fontSize: 'xl', fontWeight: 'bold' } },
      children: [],
    },
    [navColId]: {
      id: navColId, type: 'column', parentId: rowId,
      props: { style: { px: 0, py: 0, display: 'flex', flexDir: 'row', gap: 6, align: 'center' } },
      children: [navListId, btnId],
    },
    [navListId]: {
      id: navListId, type: 'text', parentId: navColId,
      props: { content: 'Product   Pricing   Docs   About', style: { fontSize: 'sm', textColor: 'neutral-600', fontWeight: 'medium' } },
      children: [],
    },
    [btnId]: {
      id: btnId, type: 'button', parentId: navColId,
      props: { label: 'Sign up', href: '#', variant: 'solid' },
      children: [],
    },
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Video Hero ───────────────────────────────────────────────────────────────

function buildVideoHero(): { nodes: NodeMap; rootChildId: string } {
  const sectionId = id()
  const badgeId   = id()
  const headId    = id()
  const subId     = id()
  const videoId   = id()

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 5, maxWidth: '4xl', centerContent: true, align: 'center' } },
      children: [badgeId, headId, subId, videoId],
    },
    [badgeId]: {
      id: badgeId, type: 'badge', parentId: sectionId,
      props: { label: 'New release', variant: 'soft' },
      children: [],
    },
    [headId]: {
      id: headId, type: 'heading', parentId: sectionId,
      props: { tag: 'h1', content: 'Watch how it works', style: { fontSize: '4xl', fontWeight: 'bold', textAlign: 'center' } },
      children: [],
    },
    [subId]: {
      id: subId, type: 'text', parentId: sectionId,
      props: { content: 'A two-minute walkthrough of building and publishing your first page.', style: { fontSize: 'lg', textAlign: 'center', textColor: 'neutral-500' } },
      children: [],
    },
    [videoId]: {
      id: videoId, type: 'video', parentId: sectionId,
      props: { url: '', style: { width: 'full', rounded: 'xl', aspectRatio: '16/9', shadow: 'lg' } },
      children: [],
    },
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Team Grid ──────────────────────────────────────────────────────────────

function buildTeam(): { nodes: NodeMap; rootChildId: string } {
  const sectionId = id()
  const headId    = id()
  const colsId    = id()

  function makeMember(parent: string, name: string, role: string, initials: string) {
    const colId   = id()
    const avId    = id()
    const nameId  = id()
    const roleId  = id()
    return {
      colId,
      nodes: {
        [colId]:  { id: colId, type: 'column', parentId: parent, props: { style: { px: 3, py: 3, display: 'flex', flexDir: 'col', gap: 2, align: 'center' } }, children: [avId, nameId, roleId] },
        [avId]:   { id: avId, type: 'avatar', parentId: colId, props: { src: '', initials, size: 72 }, children: [] },
        [nameId]: { id: nameId, type: 'heading', parentId: colId, props: { tag: 'h4', content: name, style: { fontSize: 'base', fontWeight: 'semibold', textAlign: 'center' } }, children: [] },
        [roleId]: { id: roleId, type: 'text', parentId: colId, props: { content: role, style: { fontSize: 'sm', textAlign: 'center', textColor: 'neutral-500' } }, children: [] },
      } as Record<string, PageNode>,
    }
  }

  const m1 = makeMember(colsId, 'Avery Chen',   'Co-founder, CEO', 'AC')
  const m2 = makeMember(colsId, 'Priya Nair',   'Co-founder, CTO', 'PN')
  const m3 = makeMember(colsId, 'Sam Okafor',   'Head of Design',  'SO')
  const m4 = makeMember(colsId, 'Mia Rodríguez','Head of Growth',  'MR')

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 10, maxWidth: '6xl', centerContent: true } },
      children: [headId, colsId],
    },
    [headId]: {
      id: headId, type: 'heading', parentId: sectionId,
      props: { tag: 'h2', content: 'Meet the team', style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' } },
      children: [],
    },
    [colsId]: {
      id: colsId, type: 'columns', parentId: sectionId,
      props: { style: { gap: 4, justify: 'between' } },
      children: [m1.colId, m2.colId, m3.colId, m4.colId],
    },
    ...m1.nodes, ...m2.nodes, ...m3.nodes, ...m4.nodes,
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Newsletter Signup ────────────────────────────────────────────────────────

function buildNewsletter(): { nodes: NodeMap; rootChildId: string } {
  const sectionId = id()
  const headId    = id()
  const subId     = id()
  const btnId     = id()
  const noteId    = id()

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 14, px: 8, display: 'flex', flexDir: 'col', gap: 4, maxWidth: '2xl', centerContent: true, align: 'center', bgColor: 'violet-50', rounded: 'xl' } },
      children: [headId, subId, btnId, noteId],
    },
    [headId]: {
      id: headId, type: 'heading', parentId: sectionId,
      props: { tag: 'h2', content: 'Get product updates', style: { fontSize: '2xl', fontWeight: 'bold', textAlign: 'center' } },
      children: [],
    },
    [subId]: {
      id: subId, type: 'text', parentId: sectionId,
      props: { content: 'One email a month. New templates, blocks, and tips — no spam.', style: { fontSize: 'base', textAlign: 'center', textColor: 'neutral-600' } },
      children: [],
    },
    [btnId]: {
      id: btnId, type: 'button', parentId: sectionId,
      props: { label: 'Subscribe', href: '#', variant: 'solid' },
      children: [],
    },
    [noteId]: {
      id: noteId, type: 'text', parentId: sectionId,
      props: { content: 'Unsubscribe anytime.', style: { fontSize: 'xs', textAlign: 'center', textColor: 'neutral-400' } },
      children: [],
    },
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Logo Cloud ───────────────────────────────────────────────────────────────

function buildLogoCloud(): { nodes: NodeMap; rootChildId: string } {
  const sectionId = id()
  const captionId = id()
  const colsId    = id()

  function makeLogoCol(parent: string, label: string) {
    const colId = id()
    const txtId = id()
    return {
      colId,
      nodes: {
        [colId]: { id: colId, type: 'column', parentId: parent, props: { style: { px: 2, py: 2, display: 'flex', align: 'center', justify: 'center' } }, children: [txtId] },
        [txtId]: { id: txtId, type: 'text', parentId: colId, props: { content: label, style: { fontSize: 'lg', fontWeight: 'semibold', textAlign: 'center', textColor: 'neutral-400' } }, children: [] },
      } as Record<string, PageNode>,
    }
  }

  const l1 = makeLogoCol(colsId, 'Acme')
  const l2 = makeLogoCol(colsId, 'Globex')
  const l3 = makeLogoCol(colsId, 'Initech')
  const l4 = makeLogoCol(colsId, 'Umbrella')
  const l5 = makeLogoCol(colsId, 'Soylent')

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 12, px: 8, display: 'flex', flexDir: 'col', gap: 6, maxWidth: '6xl', centerContent: true } },
      children: [captionId, colsId],
    },
    [captionId]: {
      id: captionId, type: 'text', parentId: sectionId,
      props: { content: 'TRUSTED BY TEAMS AT', style: { fontSize: 'xs', fontWeight: 'semibold', textAlign: 'center', textColor: 'neutral-400' } },
      children: [],
    },
    [colsId]: {
      id: colsId, type: 'columns', parentId: sectionId,
      props: { style: { gap: 4, justify: 'between', align: 'center' } },
      children: [l1.colId, l2.colId, l3.colId, l4.colId, l5.colId],
    },
    ...l1.nodes, ...l2.nodes, ...l3.nodes, ...l4.nodes, ...l5.nodes,
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function buildFooter(): { nodes: NodeMap; rootChildId: string } {
  const sectionId = id()
  const colsId    = id()
  const divId     = id()
  const bottomId  = id()

  function makeCol(parent: string, title: string, items: string[]) {
    const colId   = id()
    const titleId = id()
    const listId  = id()
    return {
      colId,
      nodes: {
        [colId]:   { id: colId, type: 'column', parentId: parent, props: { style: { px: 2, py: 0, display: 'flex', flexDir: 'col', gap: 3 } }, children: [titleId, listId] },
        [titleId]: { id: titleId, type: 'heading', parentId: colId, props: { tag: 'h4', content: title, style: { fontSize: 'sm', fontWeight: 'semibold', textColor: 'neutral-800' } }, children: [] },
        [listId]:  { id: listId, type: 'list', parentId: colId, props: { items, markerType: 'bullet', style: { fontSize: 'sm', textColor: 'neutral-500' } }, children: [] },
      } as Record<string, PageNode>,
    }
  }

  const c1 = makeCol(colsId, 'Product',  ['Features', 'Pricing', 'Templates'])
  const c2 = makeCol(colsId, 'Company',  ['About', 'Blog', 'Careers'])
  const c3 = makeCol(colsId, 'Resources',['Docs', 'Support', 'Community'])

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 14, px: 8, display: 'flex', flexDir: 'col', gap: 8, maxWidth: '6xl', centerContent: true, bgColor: 'neutral-50' } },
      children: [colsId, divId, bottomId],
    },
    [colsId]: {
      id: colsId, type: 'columns', parentId: sectionId,
      props: { style: { gap: 8, justify: 'between' } },
      children: [c1.colId, c2.colId, c3.colId],
    },
    [divId]: {
      id: divId, type: 'divider', parentId: sectionId,
      props: { style: { my: 0, borderColor: 'neutral-200' } },
      children: [],
    },
    [bottomId]: {
      id: bottomId, type: 'text', parentId: sectionId,
      props: { content: '© 2026 Acme Inc. All rights reserved.', style: { fontSize: 'xs', textAlign: 'center', textColor: 'neutral-400' } },
      children: [],
    },
    ...c1.nodes, ...c2.nodes, ...c3.nodes,
  }

  return { nodes, rootChildId: sectionId }
}
function buildComparison(): { nodes: NodeMap; rootChildId: string } {
  const sectionId = id()
  const headId    = id()
  const colsId    = id()

  function makePlanCol(parent: string, name: string, featured: boolean, rows: { label: string; included: boolean }[]) {
    const colId  = id()
    const nameId = id()
    const listId = id()
    const items = rows.map(r => `${r.included ? '✓' : '—'}  ${r.label}`)
    return {
      colId,
      nodes: {
        [colId]: {
          id: colId, type: 'column', parentId: parent,
          props: { style: {
            px: 5, py: 6, display: 'flex', flexDir: 'col', gap: 4,
            bgColor: featured ? 'violet-50' : 'white',
            borderColor: featured ? 'violet-500' : 'neutral-200',
            borderWidth: featured ? 2 : 1, borderStyle: 'solid', rounded: 'xl',
          } },
          children: [nameId, listId],
        },
        [nameId]: {
          id: nameId, type: 'heading', parentId: colId,
          props: { tag: 'h3', content: name, style: { fontSize: 'lg', fontWeight: 'semibold', textAlign: 'center' } },
          children: [],
        },
        [listId]: {
          id: listId, type: 'list', parentId: colId,
          props: { items, markerType: 'bullet', style: { fontSize: 'sm', textColor: 'neutral-600' } },
          children: [],
        },
      } as Record<string, PageNode>,
    }
  }

  const features = ['Unlimited pages', 'Custom domain', 'Remove branding', 'Team seats', 'Priority support']
  const free = makePlanCol(colsId, 'Free', false, features.map((f, i) => ({ label: f, included: i === 0 })))
  const pro  = makePlanCol(colsId, 'Pro',  true,  features.map((f, i) => ({ label: f, included: i < 4 })))
  const team = makePlanCol(colsId, 'Team', false, features.map(() => ({ label: '', included: true })).map((_, i) => ({ label: features[i], included: true })))

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 10, maxWidth: '6xl', centerContent: true } },
      children: [headId, colsId],
    },
    [headId]: {
      id: headId, type: 'heading', parentId: sectionId,
      props: { tag: 'h2', content: 'Compare plans', style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' } },
      children: [],
    },
    [colsId]: {
      id: colsId, type: 'columns', parentId: sectionId,
      props: { style: { gap: 6, align: 'stretch' } },
      children: [free.colId, pro.colId, team.colId],
    },
    ...free.nodes, ...pro.nodes, ...team.nodes,
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Blog / Article Grid ───────────────────────────────────────────────────

function buildBlogGrid(): { nodes: NodeMap; rootChildId: string } {
  const sectionId = id()
  const headId    = id()
  const colsId    = id()

  function makePost(parent: string, img: string, badge: string, title: string, excerpt: string, date: string) {
    const colId    = id()
    const imgId    = id()
    const badgeId  = id()
    const titleId  = id()
    const exId     = id()
    const dateId   = id()
    return {
      colId,
      nodes: {
        [colId]:   { id: colId, type: 'column', parentId: parent, props: { style: { px: 0, py: 0, display: 'flex', flexDir: 'col', gap: 3 } }, children: [imgId, badgeId, titleId, exId, dateId] },
        [imgId]:   { id: imgId, type: 'image', parentId: colId, props: { src: img, alt: title, style: { width: 'full', rounded: 'lg', aspectRatio: '4/3', objectFit: 'cover' } }, children: [] },
        [badgeId]: { id: badgeId, type: 'badge', parentId: colId, props: { label: badge, variant: 'soft' }, children: [] },
        [titleId]: { id: titleId, type: 'heading', parentId: colId, props: { tag: 'h3', content: title, style: { fontSize: 'lg', fontWeight: 'semibold' } }, children: [] },
        [exId]:    { id: exId, type: 'text', parentId: colId, props: { content: excerpt, style: { fontSize: 'sm', textColor: 'neutral-500' } }, children: [] },
        [dateId]:  { id: dateId, type: 'text', parentId: colId, props: { content: date, style: { fontSize: 'xs', textColor: 'neutral-400' } }, children: [] },
      } as Record<string, PageNode>,
    }
  }

  const p1 = makePost(colsId,
    'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=600&q=80',
    'Product', 'Five tips for faster page builds', 'Small habits that shave hours off every landing page you ship.', 'Jun 12, 2026')
  const p2 = makePost(colsId,
    'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=600&q=80',
    'Design', 'Why whitespace still wins', 'A look at why the simplest layouts convert best, with real examples.', 'Jun 3, 2026')
  const p3 = makePost(colsId,
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
    'Engineering', 'Under the hood: our new renderer', 'How we rebuilt the canvas for instant drag-and-drop feedback.', 'May 22, 2026')

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 10, maxWidth: '6xl', centerContent: true } },
      children: [headId, colsId],
    },
    [headId]: {
      id: headId, type: 'heading', parentId: sectionId,
      props: { tag: 'h2', content: 'From the blog', style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' } },
      children: [],
    },
    [colsId]: {
      id: colsId, type: 'columns', parentId: sectionId,
      props: { style: { gap: 8, align: 'start' } },
      children: [p1.colId, p2.colId, p3.colId],
    },
    ...p1.nodes, ...p2.nodes, ...p3.nodes,
  }

  return { nodes, rootChildId: sectionId }
}

// ─── FAQ (accordion variant) ────────────────────────────────────────────────
// Same purpose as buildFAQ but uses the interactive Accordion block instead
// of static heading/text/divider triplets — kept as a separate template so
// both styles remain available to users.

function buildFAQAccordion(): { nodes: NodeMap; rootChildId: string } {
  const sectionId = id()
  const headId    = id()
  const accId     = id()

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 6, maxWidth: '3xl', centerContent: true } },
      children: [headId, accId],
    },
    [headId]: {
      id: headId, type: 'heading', parentId: sectionId,
      props: { tag: 'h2', content: 'Frequently asked questions', style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' } },
      children: [],
    },
    [accId]: {
      id: accId, type: 'accordion', parentId: sectionId,
      props: { items: [
        { q: 'How long does setup take?', a: 'Most teams are publishing their first page within an hour — no code required.' },
        { q: 'Can I use my own domain?',  a: 'Yes, connect any custom domain from your project settings in a few clicks.' },
        { q: 'Is there a free plan?',     a: 'Yes, the Starter plan is free forever for a single project.' },
        { q: 'Do you offer refunds?',     a: 'Full refunds within 14 days of any paid plan, no questions asked.' },
      ] },
      children: [],
    },
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
  { label: 'Pricing',    icon: '💳', thumbnail: 'Three-tier pricing cards with a featured plan', build: buildPricing },
  { label: 'FAQ',        icon: '❓', thumbnail: 'Question/answer pairs with dividers',            build: buildFAQ },
  { label: 'Stats',      icon: '📊', thumbnail: 'Four-up row of big numbers and labels',           build: buildStats },
  { label: 'Logo Cloud', icon: '🏢', thumbnail: 'Caption + row of trusted-by logos/wordmarks',     build: buildLogoCloud },
  { label: 'Footer',     icon: '📐', thumbnail: 'Three link columns + divider + copyright line',   build: buildFooter },
  { label: 'Header / Nav',     icon: '🧭', thumbnail: 'Logo left, nav links + CTA button right',        build: buildHeader },
  { label: 'Video Hero',       icon: '🎬', thumbnail: 'Badge + headline + embedded video',                build: buildVideoHero },
  { label: 'Team Grid',        icon: '👥', thumbnail: 'Four-up avatars with name and role',                build: buildTeam },
  { label: 'Newsletter Signup',icon: '✉️', thumbnail: 'Boxed headline, subtext, and subscribe button',     build: buildNewsletter },
  { label: 'Comparison Table', icon: '⚖️', thumbnail: 'Three plan columns with checked feature lists', build: buildComparison },
  { label: 'Blog Grid',        icon: '📰', thumbnail: 'Three-up article cards with image, badge, excerpt', build: buildBlogGrid },
  { label: 'FAQ (Accordion)',  icon: '🪗', thumbnail: 'Collapsible question/answer accordion',           build: buildFAQAccordion },
]