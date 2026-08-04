'use client'

import { NodeMap, PageNode } from './types'
import type { Locale } from './store'

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
const HERO_COPY = {
  en: {
    heading: 'Build pages that convert.',
    sub: 'A fast, visual way to design and ship landing pages without touching code. Drag blocks, customise everything, publish instantly.',
    btn1: 'Get started free',
    btn2: 'See examples',
  },
  fa: {
    heading: 'صفحاتی بسازید که تبدیل ایجاد می‌کنند.',
    sub: 'راهی سریع و بصری برای طراحی و انتشار صفحات فرود بدون نیاز به کدنویسی. بلوک‌ها را بکشید، همه‌چیز را سفارشی کنید، فوراً منتشر کنید.',
    btn1: 'شروع رایگان',
    btn2: 'مشاهده نمونه‌ها',
  },
}

function buildHero(locale: Locale = 'en'): { nodes: NodeMap; rootChildId: string } {
  const c = HERO_COPY[locale] ?? HERO_COPY.en
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
      props: { tag: 'h1', content: c.heading, style: { fontSize: '5xl', fontWeight: 'bold', textAlign: 'center', color: undefined } },
      children: [],
    },
    [subId]: {
      id: subId, type: 'text', parentId: sectionId,
      props: { content: c.sub, style: { fontSize: 'lg', textAlign: 'center', color: undefined } },
      children: [],
    },
    [btnRowId]: {
      id: btnRowId, type: 'columns', parentId: sectionId,
      props: { style: { gap: 3, justify: 'center', align: 'center' } },
      children: [btn1Id, btn2Id],
    },
    [btn1Id]: {
      id: btn1Id, type: 'button', parentId: btnRowId,
      props: { label: c.btn1, href: '#', variant: 'solid' },
      children: [],
    },
    [btn2Id]: {
      id: btn2Id, type: 'button', parentId: btnRowId,
      props: { label: c.btn2, href: '#', variant: 'outline' },
      children: [],
    },
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Feature two-column ───────────────────────────────────────────────────────

const TWO_COL_FEATURE_COPY = {
  en: {
    imgAlt: 'Feature screenshot',
    eyebrow: '✦ WHAT YOU GET',
    heading: 'Everything you need to launch fast.',
    body: 'Drag-and-drop blocks, live preview across breakpoints, one-click publish. No designer required.',
    btn: 'Learn more →',
  },
  fa: {
    imgAlt: 'تصویر ویژگی',
    eyebrow: '✦ آنچه دریافت می‌کنید',
    heading: 'هر آنچه برای انتشار سریع نیاز دارید.',
    body: 'بلوک‌های کشیدنی-رهاشدنی، پیش‌نمایش زنده در همه اندازه‌ها، انتشار با یک کلیک. نیازی به طراح ندارید.',
    btn: '← بیشتر بدانید',
  },
}

function buildTwoColFeature(locale: Locale = 'en'): { nodes: NodeMap; rootChildId: string } {
  const c = TWO_COL_FEATURE_COPY[locale] ?? TWO_COL_FEATURE_COPY.en
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
      props: { src: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=600&q=80', alt: c.imgAlt, style: { width: 'full', rounded: 'xl', aspectRatio: '4/3', objectFit: 'cover' } },
      children: [],
    },
    [eyebrowId]: {
      id: eyebrowId, type: 'text', parentId: col2Id,
      props: { content: c.eyebrow, style: { fontSize: 'xs', fontWeight: 'semibold', color: undefined } },
      children: [],
    },
    [headId]: {
      id: headId, type: 'heading', parentId: col2Id,
      props: { tag: 'h2', content: c.heading, style: { fontSize: '3xl', fontWeight: 'bold' } },
      children: [],
    },
    [bodyId]: {
      id: bodyId, type: 'text', parentId: col2Id,
      props: { content: c.body, style: { fontSize: 'base', color: undefined } },
      children: [],
    },
    [btnId]: {
      id: btnId, type: 'button', parentId: col2Id,
      props: { label: c.btn, href: '#', variant: 'ghost' },
      children: [],
    },
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Testimonial ──────────────────────────────────────────────────────────────

const TESTIMONIAL_COPY = {
  en: {
    quote: '"This builder cut our landing-page turnaround from two weeks to two hours. I can\'t imagine shipping without it now."',
    author: 'Jordan Lee · Head of Growth, Acme Corp',
  },
  fa: {
    quote: '«این ابزار زمان ساخت صفحه فرود ما را از دو هفته به دو ساعت کاهش داد. دیگر نمی‌توانم بدون آن کار کنم.»',
    author: 'جردن لی · مدیر رشد، شرکت آکمی',
  },
}

function buildTestimonial(locale: Locale = 'en'): { nodes: NodeMap; rootChildId: string } {
  const c = TESTIMONIAL_COPY[locale] ?? TESTIMONIAL_COPY.en
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
      props: { content: c.quote, style: { fontSize: '2xl', fontWeight: 'medium', textAlign: 'center', fontStyle: 'italic' } },
      children: [],
    },
    [divId]: {
      id: divId, type: 'divider', parentId: sectionId,
      props: { style: { my: 2, borderColor: undefined } },
      children: [],
    },
    [authorId]: {
      id: authorId, type: 'text', parentId: sectionId,
      props: { content: c.author, style: { fontSize: 'sm', textAlign: 'center', color: undefined } },
      children: [],
    },
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Three-column features ────────────────────────────────────────────────────

const THREE_COL_FEATURES_COPY = {
  en: {
    heading: 'Why teams love it.',
    cards: [
      { emoji: '⚡', title: 'Instant preview', body: 'See your changes live as you type. No refresh, no compile step.' },
      { emoji: '🎨', title: 'Full style control', body: 'Spacing, colour, typography — all editable without writing a single line of CSS.' },
      { emoji: '📱', title: 'Responsive out of the box', body: 'Switch between desktop, tablet, and mobile previews at any time.' },
    ],
  },
  fa: {
    heading: 'چرا تیم‌ها آن را دوست دارند.',
    cards: [
      { emoji: '⚡', title: 'پیش‌نمایش آنی', body: 'تغییرات خود را همان لحظه که تایپ می‌کنید ببینید. بدون رفرش، بدون کامپایل.' },
      { emoji: '🎨', title: 'کنترل کامل استایل', body: 'فاصله‌گذاری، رنگ، تایپوگرافی — همه بدون نوشتن حتی یک خط CSS قابل ویرایش است.' },
      { emoji: '📱', title: 'واکنش‌گرا از همان ابتدا', body: 'در هر زمان بین پیش‌نمایش دسکتاپ، تبلت و موبایل جابه‌جا شوید.' },
    ],
  },
}

function buildThreeColFeatures(locale: Locale = 'en'): { nodes: NodeMap; rootChildId: string } {
  const c = THREE_COL_FEATURES_COPY[locale] ?? THREE_COL_FEATURES_COPY.en
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

  const c1 = makeCard(colsId, c.cards[0].emoji, c.cards[0].title, c.cards[0].body)
  const c2 = makeCard(colsId, c.cards[1].emoji, c.cards[1].title, c.cards[1].body)
  const c3 = makeCard(colsId, c.cards[2].emoji, c.cards[2].title, c.cards[2].body)

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 10, maxWidth: '6xl', centerContent: true } },
      children: [headId, colsId],
    },
    [headId]: {
      id: headId, type: 'heading', parentId: sectionId,
      props: { tag: 'h2', content: c.heading, style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' } },
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

const PRICING_COPY = {
  en: {
    heading: 'Simple, transparent pricing',
    chooseButton: 'Choose plan', mostPopular: 'Most popular',
    tiers: [
      { name: 'Starter',    price: '$9/mo',  features: ['1 project', 'Basic blocks', 'Community support'] },
      { name: 'Pro',        price: '$29/mo', features: ['Unlimited projects', 'All blocks + templates', 'Priority support'] },
      { name: 'Enterprise', price: '$99/mo', features: ['Everything in Pro', 'SSO & audit logs', 'Dedicated manager'] },
    ],
  },
  fa: {
    heading: 'قیمت‌گذاری ساده و شفاف',
    chooseButton: 'انتخاب پلن', mostPopular: 'محبوب‌ترین',
    tiers: [
      { name: 'استارتر',  price: '۹ دلار در ماه',  features: ['۱ پروژه', 'بلوک‌های پایه', 'پشتیبانی انجمن'] },
      { name: 'حرفه‌ای',  price: '۲۹ دلار در ماه', features: ['پروژه‌های نامحدود', 'همه بلوک‌ها و قالب‌ها', 'پشتیبانی اولویت‌دار'] },
      { name: 'سازمانی',  price: '۹۹ دلار در ماه', features: ['همه امکانات پلن حرفه‌ای', 'SSO و لاگ حسابرسی', 'مدیر اختصاصی'] },
    ],
  },
}

function buildPricing(locale: Locale = 'en'): { nodes: NodeMap; rootChildId: string } {
  const c = PRICING_COPY[locale] ?? PRICING_COPY.en
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
        props: { label: c.chooseButton, href: '#', variant: featured ? 'outline' : 'solid' },
        children: [],
      },
    }
    if (featured) {
      nodes[badgeId] = {
        id: badgeId, type: 'badge', parentId: colId,
        props: { label: c.mostPopular, variant: 'outline' },
        children: [],
      }
    }
    return { colId, nodes }
  }

  const t1 = makeTier(colsId, c.tiers[0].name, c.tiers[0].price, false, c.tiers[0].features)
  const t2 = makeTier(colsId, c.tiers[1].name, c.tiers[1].price, true,  c.tiers[1].features)
  const t3 = makeTier(colsId, c.tiers[2].name, c.tiers[2].price, false, c.tiers[2].features)

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 10, maxWidth: '6xl', centerContent: true } },
      children: [headId, colsId],
    },
    [headId]: {
      id: headId, type: 'heading', parentId: sectionId,
      props: { tag: 'h2', content: c.heading, style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' } },
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

const FAQ_COPY = {
  en: {
    heading: 'Frequently asked questions',
    qa: [
      { q: 'How long does setup take?', a: 'Most teams are publishing their first page within an hour — no code required.' },
      { q: 'Can I use my own domain?',  a: 'Yes, connect any custom domain from your project settings in a few clicks.' },
      { q: 'Is there a free plan?',     a: 'Yes, the Starter plan is free forever for a single project.' },
    ],
  },
  fa: {
    heading: 'سوالات متداول',
    qa: [
      { q: 'راه‌اندازی چقدر طول می‌کشد؟', a: 'اکثر تیم‌ها ظرف یک ساعت اولین صفحه خود را منتشر می‌کنند — بدون نیاز به کدنویسی.' },
      { q: 'می‌توانم از دامنه اختصاصی خودم استفاده کنم؟', a: 'بله، با چند کلیک از تنظیمات پروژه هر دامنه دلخواهی را متصل کنید.' },
      { q: 'پلن رایگان وجود دارد؟', a: 'بله، پلن استارتر برای یک پروژه همیشه رایگان است.' },
    ],
  },
}

function buildFAQ(locale: Locale = 'en'): { nodes: NodeMap; rootChildId: string } {
  const c = FAQ_COPY[locale] ?? FAQ_COPY.en
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

  const qa1 = makeQA(sectionId, c.qa[0].q, c.qa[0].a)
  const qa2 = makeQA(sectionId, c.qa[1].q, c.qa[1].a)
  const qa3 = makeQA(sectionId, c.qa[2].q, c.qa[2].a)

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 4, maxWidth: '3xl', centerContent: true } },
      children: [headId, ...qa1.ids, ...qa2.ids, ...qa3.ids],
    },
    [headId]: {
      id: headId, type: 'heading', parentId: sectionId,
      props: { tag: 'h2', content: c.heading, style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' } },
      children: [],
    },
    ...qa1.nodes, ...qa2.nodes, ...qa3.nodes,
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Stats ────────────────────────────────────────────────────────────────────
// Numbers themselves ('12k+', '99.9%', '4.9/5', '60+') are kept in Latin
// numerals in BOTH locales — deliberately, same as the '%' figures in
// buildBentoGrid below. Only the labels underneath translate.

const STATS_COPY = {
  en: {
    stats: [
      { num: '12k+',  label: 'Pages published' },
      { num: '99.9%', label: 'Uptime' },
      { num: '4.9/5', label: 'Average rating' },
      { num: '60+',   label: 'Countries' },
    ],
  },
  fa: {
    stats: [
      { num: '12k+',  label: 'صفحه منتشر شده' },
      { num: '99.9%', label: 'زمان فعالیت' },
      { num: '4.9/5', label: 'میانگین امتیاز' },
      { num: '60+',   label: 'کشور' },
    ],
  },
}

function buildStats(locale: Locale = 'en'): { nodes: NodeMap; rootChildId: string } {
  const c = STATS_COPY[locale] ?? STATS_COPY.en
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

  const s1 = makeStat(colsId, c.stats[0].num, c.stats[0].label)
  const s2 = makeStat(colsId, c.stats[1].num, c.stats[1].label)
  const s3 = makeStat(colsId, c.stats[2].num, c.stats[2].label)
  const s4 = makeStat(colsId, c.stats[3].num, c.stats[3].label)

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

const HEADER_COPY = {
  en: { logo: 'Brand', nav: 'Product   Pricing   Docs   About', btn: 'Sign up' },
  fa: { logo: 'برند',  nav: 'محصول   قیمت‌گذاری   مستندات   درباره ما', btn: 'ثبت‌نام' },
}

function buildHeader(locale: Locale = 'en'): { nodes: NodeMap; rootChildId: string } {
  const c = HEADER_COPY[locale] ?? HEADER_COPY.en
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
      props: { tag: 'h3', content: c.logo, style: { fontSize: 'xl', fontWeight: 'bold' } },
      children: [],
    },
    [navColId]: {
      id: navColId, type: 'column', parentId: rowId,
      props: { style: { px: 0, py: 0, display: 'flex', flexDir: 'row', gap: 6, align: 'center' } },
      children: [navListId, btnId],
    },
    [navListId]: {
      id: navListId, type: 'text', parentId: navColId,
      props: { content: c.nav, style: { fontSize: 'sm', textColor: 'neutral-600', fontWeight: 'medium' } },
      children: [],
    },
    [btnId]: {
      id: btnId, type: 'button', parentId: navColId,
      props: { label: c.btn, href: '#', variant: 'solid' },
      children: [],
    },
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Video Hero ───────────────────────────────────────────────────────────────

const VIDEO_HERO_COPY = {
  en: {
    badge: 'New release',
    heading: 'Watch how it works',
    sub: 'A two-minute walkthrough of building and publishing your first page.',
  },
  fa: {
    badge: 'انتشار جدید',
    heading: 'ببینید چگونه کار می‌کند',
    sub: 'یک راهنمای دو دقیقه‌ای برای ساخت و انتشار اولین صفحه شما.',
  },
}

function buildVideoHero(locale: Locale = 'en'): { nodes: NodeMap; rootChildId: string } {
  const c = VIDEO_HERO_COPY[locale] ?? VIDEO_HERO_COPY.en
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
      props: { label: c.badge, variant: 'soft' },
      children: [],
    },
    [headId]: {
      id: headId, type: 'heading', parentId: sectionId,
      props: { tag: 'h1', content: c.heading, style: { fontSize: '4xl', fontWeight: 'bold', textAlign: 'center' } },
      children: [],
    },
    [subId]: {
      id: subId, type: 'text', parentId: sectionId,
      props: { content: c.sub, style: { fontSize: 'lg', textAlign: 'center', textColor: 'neutral-500' } },
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
// Names and initials are kept identical in both locales (proper names
// aren't translated); only role titles switch.

const TEAM_COPY = {
  en: {
    members: [
      { name: 'Avery Chen',    role: 'Co-founder, CEO', initials: 'AC' },
      { name: 'Priya Nair',    role: 'Co-founder, CTO', initials: 'PN' },
      { name: 'Sam Okafor',    role: 'Head of Design',  initials: 'SO' },
      { name: 'Mia Rodríguez', role: 'Head of Growth',  initials: 'MR' },
    ],
    heading: 'Meet the team',
  },
  fa: {
    members: [
      { name: 'Avery Chen',    role: 'هم‌بنیان‌گذار، مدیرعامل', initials: 'AC' },
      { name: 'Priya Nair',    role: 'هم‌بنیان‌گذار، مدیر فنی', initials: 'PN' },
      { name: 'Sam Okafor',    role: 'مدیر طراحی',             initials: 'SO' },
      { name: 'Mia Rodríguez', role: 'مدیر رشد',               initials: 'MR' },
    ],
    heading: 'با تیم آشنا شوید',
  },
}

function buildTeam(locale: Locale = 'en'): { nodes: NodeMap; rootChildId: string } {
  const c = TEAM_COPY[locale] ?? TEAM_COPY.en
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

  const m1 = makeMember(colsId, c.members[0].name, c.members[0].role, c.members[0].initials)
  const m2 = makeMember(colsId, c.members[1].name, c.members[1].role, c.members[1].initials)
  const m3 = makeMember(colsId, c.members[2].name, c.members[2].role, c.members[2].initials)
  const m4 = makeMember(colsId, c.members[3].name, c.members[3].role, c.members[3].initials)

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 10, maxWidth: '6xl', centerContent: true } },
      children: [headId, colsId],
    },
    [headId]: {
      id: headId, type: 'heading', parentId: sectionId,
      props: { tag: 'h2', content: c.heading, style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' } },
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

const NEWSLETTER_COPY = {
  en: {
    heading: 'Get product updates',
    sub: 'One email a month. New templates, blocks, and tips — no spam.',
    btn: 'Subscribe',
    note: 'Unsubscribe anytime.',
  },
  fa: {
    heading: 'به‌روزرسانی‌های محصول را دریافت کنید',
    sub: 'یک ایمیل در ماه. قالب‌ها، بلوک‌ها و نکات جدید — بدون اسپم.',
    btn: 'عضویت',
    note: 'هر زمان می‌توانید لغو عضویت کنید.',
  },
}

function buildNewsletter(locale: Locale = 'en'): { nodes: NodeMap; rootChildId: string } {
  const c = NEWSLETTER_COPY[locale] ?? NEWSLETTER_COPY.en
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
      props: { tag: 'h2', content: c.heading, style: { fontSize: '2xl', fontWeight: 'bold', textAlign: 'center' } },
      children: [],
    },
    [subId]: {
      id: subId, type: 'text', parentId: sectionId,
      props: { content: c.sub, style: { fontSize: 'base', textAlign: 'center', textColor: 'neutral-600' } },
      children: [],
    },
    [btnId]: {
      id: btnId, type: 'button', parentId: sectionId,
      props: { label: c.btn, href: '#', variant: 'solid' },
      children: [],
    },
    [noteId]: {
      id: noteId, type: 'text', parentId: sectionId,
      props: { content: c.note, style: { fontSize: 'xs', textAlign: 'center', textColor: 'neutral-400' } },
      children: [],
    },
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Logo Cloud ───────────────────────────────────────────────────────────────
// Brand wordmarks (Acme, Globex, etc.) are kept in Latin script in both
// locales — they're rendered as logotypes, the same reasoning a real logo
// image wouldn't be transliterated. Only the caption above them translates.

const LOGO_CLOUD_COPY = {
  en: { caption: 'TRUSTED BY TEAMS AT' },
  fa: { caption: 'مورد اعتماد تیم‌ها در' },
}

function buildLogoCloud(locale: Locale = 'en'): { nodes: NodeMap; rootChildId: string } {
  const c = LOGO_CLOUD_COPY[locale] ?? LOGO_CLOUD_COPY.en
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
      props: { content: c.caption, style: { fontSize: 'xs', fontWeight: 'semibold', textAlign: 'center', textColor: 'neutral-400' } },
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

const FOOTER_COPY = {
  en: {
    columns: [
      { title: 'Product',   items: ['Features', 'Pricing', 'Templates'] },
      { title: 'Company',   items: ['About', 'Blog', 'Careers'] },
      { title: 'Resources', items: ['Docs', 'Support', 'Community'] },
    ],
    copyright: '© 2026 Acme Inc. All rights reserved.',
  },
  fa: {
    columns: [
      { title: 'محصول', items: ['امکانات', 'قیمت‌گذاری', 'قالب‌ها'] },
      { title: 'شرکت',  items: ['درباره ما', 'وبلاگ', 'فرصت‌های شغلی'] },
      { title: 'منابع', items: ['مستندات', 'پشتیبانی', 'انجمن'] },
    ],
    copyright: '© 2026 شرکت آکمی. تمام حقوق محفوظ است.',
  },
}

function buildFooter(locale: Locale = 'en'): { nodes: NodeMap; rootChildId: string } {
  const c = FOOTER_COPY[locale] ?? FOOTER_COPY.en
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

  const c1 = makeCol(colsId, c.columns[0].title, c.columns[0].items)
  const c2 = makeCol(colsId, c.columns[1].title, c.columns[1].items)
  const c3 = makeCol(colsId, c.columns[2].title, c.columns[2].items)

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
      props: { content: c.copyright, style: { fontSize: 'xs', textAlign: 'center', textColor: 'neutral-400' } },
      children: [],
    },
    ...c1.nodes, ...c2.nodes, ...c3.nodes,
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Comparison Table ───────────────────────────────────────────────────────

const COMPARISON_COPY = {
  en: {
    heading: 'Compare plans',
    plans: ['Free', 'Pro', 'Team'],
    features: ['Unlimited pages', 'Custom domain', 'Remove branding', 'Team seats', 'Priority support'],
  },
  fa: {
    heading: 'مقایسه پلن‌ها',
    plans: ['رایگان', 'حرفه‌ای', 'تیمی'],
    features: ['صفحات نامحدود', 'دامنه اختصاصی', 'حذف برندینگ', 'صندلی‌های تیمی', 'پشتیبانی اولویت‌دار'],
  },
}

function buildComparison(locale: Locale = 'en'): { nodes: NodeMap; rootChildId: string } {
  const c = COMPARISON_COPY[locale] ?? COMPARISON_COPY.en
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

  const features = c.features
  const free = makePlanCol(colsId, c.plans[0], false, features.map((f, i) => ({ label: f, included: i === 0 })))
  const pro  = makePlanCol(colsId, c.plans[1], true,  features.map((f, i) => ({ label: f, included: i < 4 })))
  const team = makePlanCol(colsId, c.plans[2], false, features.map(f => ({ label: f, included: true })))

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 10, maxWidth: '6xl', centerContent: true } },
      children: [headId, colsId],
    },
    [headId]: {
      id: headId, type: 'heading', parentId: sectionId,
      props: { tag: 'h2', content: c.heading, style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' } },
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
// Dates keep Latin numerals in both locales (day + year), only the month
// name and post copy translate — matching how numeric figures are handled
// elsewhere in this file (Stats, Bento Grid percentages).

const BLOG_GRID_COPY = {
  en: {
    heading: 'From the blog',
    posts: [
      { badge: 'Product',     title: 'Five tips for faster page builds', excerpt: 'Small habits that shave hours off every landing page you ship.', date: 'Jun 12, 2026' },
      { badge: 'Design',      title: 'Why whitespace still wins',        excerpt: 'A look at why the simplest layouts convert best, with real examples.', date: 'Jun 3, 2026' },
      { badge: 'Engineering', title: 'Under the hood: our new renderer', excerpt: 'How we rebuilt the canvas for instant drag-and-drop feedback.', date: 'May 22, 2026' },
    ],
  },
  fa: {
    heading: 'از وبلاگ',
    posts: [
      { badge: 'محصول',  title: 'پنج نکته برای ساخت سریع‌تر صفحه', excerpt: 'عادت‌های کوچکی که ساعت‌ها زمان ساخت هر صفحه فرود شما را کاهش می‌دهند.', date: '12 ژوئن 2026' },
      { badge: 'طراحی', title: 'چرا فضای خالی هنوز برنده است',    excerpt: 'نگاهی به این‌که چرا ساده‌ترین چیدمان‌ها بهترین تبدیل را دارند، با مثال‌های واقعی.', date: '3 ژوئن 2026' },
      { badge: 'مهندسی', title: 'زیر کاپوت: رندرر جدید ما',        excerpt: 'چگونه بوم را برای بازخورد آنی کشیدن‌ورهاکردن از نو ساختیم.', date: '22 مه 2026' },
    ],
  },
}

function buildBlogGrid(locale: Locale = 'en'): { nodes: NodeMap; rootChildId: string } {
  const c = BLOG_GRID_COPY[locale] ?? BLOG_GRID_COPY.en
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
    c.posts[0].badge, c.posts[0].title, c.posts[0].excerpt, c.posts[0].date)
  const p2 = makePost(colsId,
    'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=600&q=80',
    c.posts[1].badge, c.posts[1].title, c.posts[1].excerpt, c.posts[1].date)
  const p3 = makePost(colsId,
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
    c.posts[2].badge, c.posts[2].title, c.posts[2].excerpt, c.posts[2].date)

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 10, maxWidth: '6xl', centerContent: true } },
      children: [headId, colsId],
    },
    [headId]: {
      id: headId, type: 'heading', parentId: sectionId,
      props: { tag: 'h2', content: c.heading, style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' } },
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

const FAQ_ACCORDION_COPY = {
  en: {
    heading: 'Frequently asked questions',
    items: [
      { q: 'How long does setup take?', a: 'Most teams are publishing their first page within an hour — no code required.' },
      { q: 'Can I use my own domain?',  a: 'Yes, connect any custom domain from your project settings in a few clicks.' },
      { q: 'Is there a free plan?',     a: 'Yes, the Starter plan is free forever for a single project.' },
      { q: 'Do you offer refunds?',     a: 'Full refunds within 14 days of any paid plan, no questions asked.' },
    ],
  },
  fa: {
    heading: 'سوالات متداول',
    items: [
      { q: 'راه‌اندازی چقدر طول می‌کشد؟', a: 'اکثر تیم‌ها ظرف یک ساعت اولین صفحه خود را منتشر می‌کنند — بدون نیاز به کدنویسی.' },
      { q: 'می‌توانم از دامنه اختصاصی خودم استفاده کنم؟', a: 'بله، با چند کلیک از تنظیمات پروژه هر دامنه دلخواهی را متصل کنید.' },
      { q: 'پلن رایگان وجود دارد؟', a: 'بله، پلن استارتر برای یک پروژه همیشه رایگان است.' },
      { q: 'آیا امکان بازگشت وجه وجود دارد؟', a: 'بازگشت کامل وجه ظرف ۱۴ روز برای هر پلن پولی، بدون هیچ پرسشی.' },
    ],
  },
}

function buildFAQAccordion(locale: Locale = 'en'): { nodes: NodeMap; rootChildId: string } {
  const c = FAQ_ACCORDION_COPY[locale] ?? FAQ_ACCORDION_COPY.en
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
      props: { tag: 'h2', content: c.heading, style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' } },
      children: [],
    },
    [accId]: {
      id: accId, type: 'accordion', parentId: sectionId,
      props: { items: c.items },
      children: [],
    },
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Bento Grid ─────────────────────────────────────────────────────────────
// The '99.9%' figure keeps Latin numerals in both locales, same as Stats.

const BENTO_GRID_COPY = {
  en: {
    heading: 'Everything, at a glance',
    sub: 'A bento-style overview of what makes it work.',
    cells: [
      { title: 'Built for speed',  body: 'Live preview with zero lag, however complex the page gets.' },
      { title: 'Any device',       body: 'Responsive by default, on every breakpoint.' },
      { title: '99.9% uptime',     body: 'Rock-solid hosting, no surprises.' },
      { title: 'Team-ready',       body: 'Invite your whole team — no seat limits, ever.' },
    ],
  },
  fa: {
    heading: 'همه‌چیز، در یک نگاه',
    sub: 'مروری به سبک بنتو از آنچه آن را کارآمد می‌کند.',
    cells: [
      { title: 'ساخته‌شده برای سرعت', body: 'پیش‌نمایش زنده بدون تأخیر، هرچقدر هم صفحه پیچیده شود.' },
      { title: 'هر دستگاهی',          body: 'واکنش‌گرا به‌طور پیش‌فرض، در هر اندازه صفحه.' },
      { title: '99.9% زمان فعالیت',   body: 'میزبانی کاملاً پایدار، بدون هیچ غافلگیری.' },
      { title: 'آماده برای تیم',      body: 'کل تیم خود را دعوت کنید — بدون محدودیت تعداد کاربر، هرگز.' },
    ],
  },
}

function buildBentoGrid(locale: Locale = 'en'): { nodes: NodeMap; rootChildId: string } {
  const c = BENTO_GRID_COPY[locale] ?? BENTO_GRID_COPY.en
  const sectionId = id()
  const headId    = id()
  const subId     = id()
  const gridId    = id()

  function makeCell(
    parent: string, colSpan: number, rowSpan: number,
    title: string, body: string, bg: string, textColor: string,
  ) {
    const cellId  = id()
    const titleId = id()
    const bodyId  = id()
    return {
      cellId,
      nodes: {
        [cellId]: {
          id: cellId, type: 'column', parentId: parent,
          props: { style: {
            px: 6, py: 6, display: 'flex', flexDir: 'col', gap: 2, justify: 'end',
            bgColor: bg, rounded: 'xl',
            gridColSpan: colSpan, gridRowSpan: rowSpan,
          } },
          children: [titleId, bodyId],
        },
        [titleId]: {
          id: titleId, type: 'heading', parentId: cellId,
          props: { tag: 'h3', content: title, style: { fontSize: colSpan >= 2 ? '2xl' : 'lg', fontWeight: 'bold', textColor } },
          children: [],
        },
        [bodyId]: {
          id: bodyId, type: 'text', parentId: cellId,
          props: { content: body, style: { fontSize: 'sm', textColor } },
          children: [],
        },
      } as Record<string, PageNode>,
    }
  }

  const c1 = makeCell(gridId, 2, 2, c.cells[0].title, c.cells[0].body, 'violet-600',  'white')
  const c2 = makeCell(gridId, 1, 1, c.cells[1].title, c.cells[1].body, 'neutral-800', 'white')
  const c3 = makeCell(gridId, 1, 1, c.cells[2].title, c.cells[2].body, 'blue-600',    'white')
  const c4 = makeCell(gridId, 2, 1, c.cells[3].title, c.cells[3].body, 'neutral-900', 'white')

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 8, maxWidth: '6xl', centerContent: true } },
      children: [headId, subId, gridId],
    },
    [headId]: {
      id: headId, type: 'heading', parentId: sectionId,
      props: { tag: 'h2', content: c.heading, style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' } },
      children: [],
    },
    [subId]: {
      id: subId, type: 'text', parentId: sectionId,
      props: { content: c.sub, style: { fontSize: 'base', textAlign: 'center', textColor: 'neutral-500' } },
      children: [],
    },
    [gridId]: {
      id: gridId, type: 'grid', parentId: sectionId,
      props: { style: { display: 'grid', gridCols: 3, gridRows: 2, gap: 4, gridRowMinHeight: 140, justifyItems: 'stretch', align: 'stretch' } },
      children: [c1.cellId, c2.cellId, c3.cellId, c4.cellId],
    },
    ...c1.nodes, ...c2.nodes, ...c3.nodes, ...c4.nodes,
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Feature Tabs ───────────────────────────────────────────────────────────

const FEATURE_TABS_COPY = {
  en: {
    heading: 'Everything you need, in one place',
    tabs: [
      {
        label: 'Design', title: 'Design without limits',
        body: 'Every spacing, color, and typography control an agency would charge you for — built in, and editable with a click.',
        img: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&q=80',
      },
      {
        label: 'Collaborate', title: 'Built for teams',
        body: 'Real-time editing, comments, and shareable previews — everyone stays in sync without a single export/import round-trip.',
        img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&q=80',
      },
      {
        label: 'Publish', title: 'Ship in one click',
        body: 'Push straight to your domain with SSL, CDN caching, and SEO metadata already configured for you.',
        img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
      },
    ],
  },
  fa: {
    heading: 'هر آنچه نیاز دارید، در یک مکان',
    tabs: [
      {
        label: 'طراحی', title: 'طراحی بدون محدودیت',
        body: 'هر کنترل فاصله‌گذاری، رنگ و تایپوگرافی که یک آژانس برایش از شما هزینه می‌گرفت — از پیش ساخته شده و با یک کلیک قابل ویرایش.',
        img: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&q=80',
      },
      {
        label: 'همکاری', title: 'ساخته‌شده برای تیم‌ها',
        body: 'ویرایش هم‌زمان، نظرات و پیش‌نمایش‌های قابل اشتراک‌گذاری — همه بدون حتی یک چرخه خروجی/ورودی هماهنگ می‌مانند.',
        img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&q=80',
      },
      {
        label: 'انتشار', title: 'با یک کلیک منتشر کنید',
        body: 'مستقیم روی دامنه خود منتشر کنید، با SSL، کش CDN و متادیتای سئو که از قبل برایتان تنظیم شده است.',
        img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
      },
    ],
  },
}

function buildFeatureTabs(locale: Locale = 'en'): { nodes: NodeMap; rootChildId: string } {
  const c = FEATURE_TABS_COPY[locale] ?? FEATURE_TABS_COPY.en
  const sectionId = id()
  const headId     = id()
  const tabsId     = id()

  function makeTabPane(
    parent: string, label: string, title: string, body: string, img: string,
  ) {
    const paneId  = id()
    const colsId  = id()
    const col1Id  = id()
    const col2Id  = id()
    const titleId = id()
    const bodyId  = id()
    const imgId   = id()
    return {
      paneId,
      nodes: {
        [paneId]: {
          id: paneId, type: 'tabpane', parentId: parent,
          props: { label, style: { px: 0, py: 6, display: 'flex', flexDir: 'col' } },
          children: [colsId],
        },
        [colsId]: {
          id: colsId, type: 'columns', parentId: paneId,
          props: { style: { gap: 8, align: 'center' } },
          children: [col1Id, col2Id],
        },
        [col1Id]: {
          id: col1Id, type: 'column', parentId: colsId,
          props: { style: { px: 0, py: 0, display: 'flex', flexDir: 'col', gap: 3 } },
          children: [titleId, bodyId],
        },
        [col2Id]: {
          id: col2Id, type: 'column', parentId: colsId,
          props: { style: { px: 0, py: 0 } },
          children: [imgId],
        },
        [titleId]: {
          id: titleId, type: 'heading', parentId: col1Id,
          props: { tag: 'h3', content: title, style: { fontSize: '2xl', fontWeight: 'bold' } },
          children: [],
        },
        [bodyId]: {
          id: bodyId, type: 'text', parentId: col1Id,
          props: { content: body, style: { fontSize: 'base', textColor: 'neutral-600' } },
          children: [],
        },
        [imgId]: {
          id: imgId, type: 'image', parentId: col2Id,
          props: { src: img, alt: title, style: { width: 'full', rounded: 'xl', aspectRatio: '4/3', objectFit: 'cover' } },
          children: [],
        },
      } as Record<string, PageNode>,
    }
  }

  const t1 = makeTabPane(tabsId, c.tabs[0].label, c.tabs[0].title, c.tabs[0].body, c.tabs[0].img)
  const t2 = makeTabPane(tabsId, c.tabs[1].label, c.tabs[1].title, c.tabs[1].body, c.tabs[1].img)
  const t3 = makeTabPane(tabsId, c.tabs[2].label, c.tabs[2].title, c.tabs[2].body, c.tabs[2].img)

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 8, maxWidth: '5xl', centerContent: true } },
      children: [headId, tabsId],
    },
    [headId]: {
      id: headId, type: 'heading', parentId: sectionId,
      props: { tag: 'h2', content: c.heading, style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' } },
      children: [],
    },
    [tabsId]: {
      id: tabsId, type: 'tabs', parentId: sectionId,
      props: { style: { gap: 4 } },
      children: [t1.paneId, t2.paneId, t3.paneId],
    },
    ...t1.nodes, ...t2.nodes, ...t3.nodes,
  }

  return { nodes, rootChildId: sectionId }
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────

const CTA_BANNER_COPY = {
  en: {
    heading: 'Ready to ship your next page?',
    sub: 'Join thousands of teams who publish faster with Page Builder. Free to start, no credit card required.',
    btn: 'Start building for free',
  },
  fa: {
    heading: 'آماده انتشار صفحه بعدی خود هستید؟',
    sub: 'به هزاران تیمی بپیوندید که با Page Builder سریع‌تر منتشر می‌کنند. شروع رایگان، بدون نیاز به کارت اعتباری.',
    btn: 'رایگان شروع کنید',
  },
}

function buildCTABanner(locale: Locale = 'en'): { nodes: NodeMap; rootChildId: string } {
  const c = CTA_BANNER_COPY[locale] ?? CTA_BANNER_COPY.en
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
      props: { tag: 'h2', content: c.heading, style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' } },
      children: [],
    },
    [subId]: {
      id: subId, type: 'text', parentId: sectionId,
      props: { content: c.sub, style: { fontSize: 'lg', textAlign: 'center', color: undefined } },
      children: [],
    },
    [btnId]: {
      id: btnId, type: 'button', parentId: sectionId,
      props: { label: c.btn, href: '#', variant: 'solid' },
      children: [],
    },
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Image Gallery (Carousel) ────────────────────────────────────────────────

const IMAGE_GALLERY_COPY = {
  en: {
    heading: 'See it in action',
    alts: ['Product screenshot one', 'Product screenshot two', 'Product screenshot three'],
  },
  fa: {
    heading: 'آن را در عمل ببینید',
    alts: ['تصویر محصول یک', 'تصویر محصول دو', 'تصویر محصول سه'],
  },
}

function buildImageGallery(locale: Locale = 'en'): { nodes: NodeMap; rootChildId: string } {
  const c = IMAGE_GALLERY_COPY[locale] ?? IMAGE_GALLERY_COPY.en
  const sectionId  = id()
  const headId     = id()
  const carouselId = id()

  function makeImageSlide(parent: string, src: string, alt: string) {
    const slideId = id()
    const imgId   = id()
    return {
      slideId,
      nodes: {
        [slideId]: { id: slideId, type: 'slide', parentId: parent, props: { style: { px: 0, py: 0 } }, children: [imgId] },
        [imgId]:   { id: imgId, type: 'image', parentId: slideId, props: { src, alt, style: { width: 'full', aspectRatio: '16/9', objectFit: 'cover' } }, children: [] },
      } as Record<string, PageNode>,
    }
  }

  const s1 = makeImageSlide(carouselId, 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=1200&q=80', c.alts[0])
  const s2 = makeImageSlide(carouselId, 'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=1200&q=80', c.alts[1])
  const s3 = makeImageSlide(carouselId, 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80', c.alts[2])

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 8, maxWidth: '5xl', centerContent: true } },
      children: [headId, carouselId],
    },
    [headId]: {
      id: headId, type: 'heading', parentId: sectionId,
      props: { tag: 'h2', content: c.heading, style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' } },
      children: [],
    },
    [carouselId]: {
      id: carouselId, type: 'carousel', parentId: sectionId,
      props: { autoplay: true, autoplayInterval: 5000, loop: true, showArrows: true, showDots: true, style: { rounded: 'xl' } },
      children: [s1.slideId, s2.slideId, s3.slideId],
    },
    ...s1.nodes, ...s2.nodes, ...s3.nodes,
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Logo Carousel (Carousel) ────────────────────────────────────────────────
// Brand wordmarks kept in Latin script, same reasoning as Logo Cloud above —
// only the caption translates.

const LOGO_CAROUSEL_COPY = {
  en: { caption: 'TRUSTED BY TEAMS AT' },
  fa: { caption: 'مورد اعتماد تیم‌ها در' },
}

function buildLogoCarousel(locale: Locale = 'en'): { nodes: NodeMap; rootChildId: string } {
  const c = LOGO_CAROUSEL_COPY[locale] ?? LOGO_CAROUSEL_COPY.en
  const sectionId  = id()
  const captionId  = id()
  const carouselId = id()

  function makeLogoSlide(parent: string, names: string[]) {
    const slideId = id()
    const colsId  = id()
    const colIds  = names.map(() => id())
    const txtIds  = names.map(() => id())
    const nodes: Record<string, PageNode> = {
      [slideId]: { id: slideId, type: 'slide', parentId: parent, props: { style: { px: 4, py: 6 } }, children: [colsId] },
      [colsId]:  { id: colsId, type: 'columns', parentId: slideId, props: { style: { gap: 4, justify: 'between', align: 'center' } }, children: colIds },
    }
    names.forEach((name, i) => {
      nodes[colIds[i]] = { id: colIds[i], type: 'column', parentId: colsId, props: { style: { px: 2, py: 2, display: 'flex', align: 'center', justify: 'center' } }, children: [txtIds[i]] }
      nodes[txtIds[i]] = { id: txtIds[i], type: 'text', parentId: colIds[i], props: { content: name, style: { fontSize: 'lg', fontWeight: 'semibold', textAlign: 'center', textColor: 'neutral-400' } }, children: [] }
    })
    return { slideId, nodes }
  }

  const s1 = makeLogoSlide(carouselId, ['Acme', 'Globex', 'Initech'])
  const s2 = makeLogoSlide(carouselId, ['Umbrella', 'Soylent', 'Stark'])

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 12, px: 8, display: 'flex', flexDir: 'col', gap: 6, maxWidth: '5xl', centerContent: true } },
      children: [captionId, carouselId],
    },
    [captionId]: {
      id: captionId, type: 'text', parentId: sectionId,
      props: { content: c.caption, style: { fontSize: 'xs', fontWeight: 'semibold', textAlign: 'center', textColor: 'neutral-400' } },
      children: [],
    },
    [carouselId]: {
      id: carouselId, type: 'carousel', parentId: sectionId,
      // showArrows was false — the reason this template had no way to
      // navigate manually in either locale. Autoplay + dots alone isn't
      // enough; arrows are the primary manual control everywhere else.
      props: { autoplay: true, autoplayInterval: 3500, loop: true, showArrows: true, showDots: true, style: {} },
      children: [s1.slideId, s2.slideId],
    },
    ...s1.nodes, ...s2.nodes,
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Testimonial Carousel (Carousel) ─────────────────────────────────────────
// Person names kept as-is; company names get the same transliteration
// already established by TESTIMONIAL_COPY ("Acme Corp" → "شرکت آکمی").

const TESTIMONIAL_CAROUSEL_COPY = {
  en: {
    heading: 'What teams are saying',
    slides: [
      { quote: 'This builder cut our landing-page turnaround from two weeks to two hours.', name: 'Jordan Lee', role: 'Head of Growth, Acme Corp' },
      { quote: 'The Grid and Tabs elements alone replaced three separate plugins we used to pay for.', name: 'Priya Nair', role: 'CTO, Globex' },
      { quote: 'Our whole team ships pages now, not just the one person who knew CSS.', name: 'Sam Okafor', role: 'Head of Design, Initech' },
    ],
  },
  fa: {
    heading: 'تیم‌ها چه می‌گویند',
    slides: [
      { quote: 'این ابزار زمان ساخت صفحه فرود ما را از دو هفته به دو ساعت کاهش داد.', name: 'Jordan Lee', role: 'مدیر رشد، شرکت آکمی' },
      { quote: 'فقط عناصر Grid و Tabs جایگزین سه افزونه جداگانه‌ای شدند که قبلاً برایشان هزینه می‌پرداختیم.', name: 'Priya Nair', role: 'مدیر فنی، گلوبکس' },
      { quote: 'حالا کل تیم ما صفحات را منتشر می‌کند، نه فقط همان یک نفری که CSS بلد بود.', name: 'Sam Okafor', role: 'مدیر طراحی، اینیتک' },
    ],
  },
}

function buildTestimonialCarousel(locale: Locale = 'en'): { nodes: NodeMap; rootChildId: string } {
  const c = TESTIMONIAL_CAROUSEL_COPY[locale] ?? TESTIMONIAL_CAROUSEL_COPY.en
  const sectionId  = id()
  const headId     = id()
  const carouselId = id()

  function makeTestimonialSlide(parent: string, quote: string, name: string, role: string) {
    const slideId = id()
    const quoteId = id()
    return {
      slideId,
      nodes: {
        [slideId]: {
          id: slideId, type: 'slide', parentId: parent,
          props: { style: { px: 8, py: 4, display: 'flex', justify: 'center', align: 'center' } },
          children: [quoteId],
        },
        [quoteId]: {
          id: quoteId, type: 'quote', parentId: slideId,
          props: {
            quote, name, role, avatarSrc: '',
            style: { px: 8, py: 8, bgColor: 'neutral-50', rounded: 'xl', maxWidth: 640 },
          },
          children: [],
        },
      } as Record<string, PageNode>,
    }
  }

  const s1 = makeTestimonialSlide(carouselId, c.slides[0].quote, c.slides[0].name, c.slides[0].role)
  const s2 = makeTestimonialSlide(carouselId, c.slides[1].quote, c.slides[1].name, c.slides[1].role)
  const s3 = makeTestimonialSlide(carouselId, c.slides[2].quote, c.slides[2].name, c.slides[2].role)

  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 8, maxWidth: '4xl', centerContent: true } },
      children: [headId, carouselId],
    },
    [headId]: {
      id: headId, type: 'heading', parentId: sectionId,
      props: { tag: 'h2', content: c.heading, style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' } },
      children: [],
    },
    [carouselId]: {
      id: carouselId, type: 'carousel', parentId: sectionId,
      props: { autoplay: true, autoplayInterval: 6000, loop: true, showArrows: true, showDots: true, style: { minHeight: 260 } },
      children: [s1.slideId, s2.slideId, s3.slideId],
    },
    ...s1.nodes, ...s2.nodes, ...s3.nodes,
  }

  return { nodes, rootChildId: sectionId }
}

// ─── Registry ─────────────────────────────────────────────────────────────────

// ─── Locale-aware template list ────────────────────────────────────────────
// CHANGED: every template now has a real Farsi content pack (its own
// COPY object above, same pattern the original five — Hero, CTA Banner,
// Testimonial, Pricing, FAQ — already used) and accepts `locale` as a
// parameter. getTemplates(locale) below now threads `locale` into every
// single build() call, not just five of them. Labels/thumbnails for the
// picker card itself still come from TEMPLATE_LABELS_FA, unchanged.
const TEMPLATE_LABELS_FA: Partial<Record<string, { label: string; thumbnail: string }>> = {
  'Hero':        { label: 'قهرمان',        thumbnail: 'تیتر بزرگ، زیرنویس و دو دکمه اقدام' },
  'Feature — Image + Text': { label: 'ویژگی — تصویر و متن', thumbnail: 'دو ستون: تصویر در سمت چپ، تیتر و متن در سمت راست' },
  'Testimonial': { label: 'نظر مشتری',     thumbnail: 'نقل‌قول بزرگ همراه با اعتبار نویسنده' },
  'Feature Grid': { label: 'شبکه ویژگی‌ها', thumbnail: 'سه ستون با آیکون، تیتر و توضیحات' },
  'CTA Banner':  { label: 'بنر فراخوان',   thumbnail: 'تیتر، زیرنویس و یک دکمه فراخوان' },
  'Pricing':     { label: 'قیمت‌گذاری',    thumbnail: 'سه کارت قیمتی با یک پلن ویژه' },
  'FAQ':         { label: 'سوالات متداول', thumbnail: 'جفت‌های پرسش و پاسخ همراه با خط جداکننده' },
  'Stats':       { label: 'آمار',          thumbnail: 'چهار عدد و برچسب بزرگ در یک ردیف' },
  'Logo Cloud':  { label: 'ابر لوگو',      thumbnail: 'عنوان و ردیفی از لوگوهای مورد اعتماد' },
  'Footer':      { label: 'فوتر',          thumbnail: 'سه ستون لینک + خط جداکننده + کپی‌رایت' },
  'Header / Nav': { label: 'هدر / ناوبری',  thumbnail: 'لوگو در سمت راست، لینک‌های ناوبری و دکمه در سمت چپ' },
  'Video Hero':  { label: 'قهرمان ویدیویی', thumbnail: 'نشان، تیتر و ویدیوی جاسازی‌شده' },
  'Team Grid':   { label: 'شبکه تیم',      thumbnail: 'چهار آواتار با نام و نقش' },
  'Newsletter Signup': { label: 'عضویت خبرنامه', thumbnail: 'تیتر، متن و دکمه عضویت در یک کادر' },
  'Comparison Table': { label: 'جدول مقایسه', thumbnail: 'سه ستون پلن با لیست امکانات تیک‌دار' },
  'Blog Grid':   { label: 'شبکه وبلاگ',    thumbnail: 'سه کارت مقاله با تصویر، برچسب و خلاصه' },
  'FAQ (Accordion)': { label: 'سوالات متداول (آکاردئون)', thumbnail: 'آکاردئون پرسش و پاسخ قابل جمع‌شدن' },
  'Bento Grid':  { label: 'شبکه بنتو',     thumbnail: 'شبکه نامتقارن: یک خانه بزرگ و سه خانه کوچک‌تر' },
  'Feature Tabs': { label: 'تب‌های ویژگی',  thumbnail: 'نمایش تب‌دار ویژگی‌ها — تصویر و متن در هر تب' },
  'Image Gallery': { label: 'گالری تصاویر', thumbnail: 'کاروسل تصاویر تمام‌عرض با پخش خودکار' },
  'Logo Carousel': { label: 'کاروسل لوگو',  thumbnail: 'ردیف‌های چرخان و خودکار لوگوهای مورد اعتماد' },
  'Testimonial Carousel': { label: 'کاروسل نظرات مشتری', thumbnail: 'کارت‌های چرخان و خودکار نقل‌قول مشتری' },
}

export function getTemplates(locale: Locale = 'en'): Template[] {
  const base: Template[] = [
    { label: 'Hero', icon: '🏔️', thumbnail: 'Large headline, subtext, and two CTA buttons', build: () => buildHero(locale) },
    { label: 'Feature — Image + Text', icon: '🖼️', thumbnail: 'Two-column: image left, eyebrow + heading + body right', build: () => buildTwoColFeature(locale) },
    { label: 'Testimonial', icon: '💬', thumbnail: 'Large pull-quote with author credit', build: () => buildTestimonial(locale) },
    { label: 'Feature Grid', icon: '✦', thumbnail: 'Three columns with icon, title, and description', build: () => buildThreeColFeatures(locale) },
    { label: 'CTA Banner', icon: '🚀', thumbnail: 'Headline, subtitle, and single call-to-action button', build: () => buildCTABanner(locale) },
    { label: 'Pricing', icon: '💳', thumbnail: 'Three-tier pricing cards with a featured plan', build: () => buildPricing(locale) },
    { label: 'FAQ', icon: '❓', thumbnail: 'Question/answer pairs with dividers', build: () => buildFAQ(locale) },
    { label: 'Stats', icon: '📊', thumbnail: 'Four-up row of big numbers and labels', build: () => buildStats(locale) },
    { label: 'Logo Cloud', icon: '🏢', thumbnail: 'Caption + row of trusted-by logos/wordmarks', build: () => buildLogoCloud(locale) },
    { label: 'Footer', icon: '📐', thumbnail: 'Three link columns + divider + copyright line', build: () => buildFooter(locale) },
    { label: 'Header / Nav', icon: '🧭', thumbnail: 'Logo left, nav links + CTA button right', build: () => buildHeader(locale) },
    { label: 'Video Hero', icon: '🎬', thumbnail: 'Badge + headline + embedded video', build: () => buildVideoHero(locale) },
    { label: 'Team Grid', icon: '👥', thumbnail: 'Four-up avatars with name and role', build: () => buildTeam(locale) },
    { label: 'Newsletter Signup', icon: '✉️', thumbnail: 'Boxed headline, subtext, and subscribe button', build: () => buildNewsletter(locale) },
    { label: 'Comparison Table', icon: '⚖️', thumbnail: 'Three plan columns with checked feature lists', build: () => buildComparison(locale) },
    { label: 'Blog Grid', icon: '📰', thumbnail: 'Three-up article cards with image, badge, excerpt', build: () => buildBlogGrid(locale) },
    { label: 'FAQ (Accordion)', icon: '🪗', thumbnail: 'Collapsible question/answer accordion', build: () => buildFAQAccordion(locale) },
    { label: 'Bento Grid', icon: '🧩', thumbnail: 'Asymmetric grid: one big cell + three smaller ones', build: () => buildBentoGrid(locale) },
    { label: 'Feature Tabs', icon: '🗂️', thumbnail: 'Tabbed feature showcase — image + text per tab', build: () => buildFeatureTabs(locale) },
    { label: 'Image Gallery', icon: '🖼️', thumbnail: 'Autoplaying full-bleed image carousel', build: () => buildImageGallery(locale) },
    { label: 'Logo Carousel', icon: '🏳️', thumbnail: 'Autoplaying rotating rows of trusted-by logos', build: () => buildLogoCarousel(locale) },
    { label: 'Testimonial Carousel', icon: '💬', thumbnail: 'Autoplaying rotating customer quote cards', build: () => buildTestimonialCarousel(locale) },
  ]

  if (locale === 'en') return base
  return base.map(tpl => {
    const fa = TEMPLATE_LABELS_FA[tpl.label]
    return fa ? { ...tpl, label: fa.label, thumbnail: fa.thumbnail } : tpl
  })
}

// Backward-compatible plain export for any call site not yet updated to
// call getTemplates(locale) directly — always English. Prefer
// getTemplates(locale) in new code (see DropSlot.tsx).
export const TEMPLATES: Template[] = getTemplates('en')