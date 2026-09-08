'use client'

import React, { useEffect, useState } from 'react'
import { NodeMap, PageNode } from './types'
import { useBuilderStore, type Locale } from './store'
import { SECTION_BUILDERS, type SectionBuilderKey } from './templates'
import { useT, directionForLocale } from './i18n'

function id() {
  return `node_${Math.random().toString(36).slice(2, 8)}`
}

export interface PageTemplate {
  label:     string
  icon:      string
  thumbnail: string
  build:     () => { nodes: NodeMap; rootChildIds: string[] }
}

type SectionBuild = (locale: Locale) => { nodes: NodeMap; rootChildId: string }

// Wraps a SECTION_BUILDERS entry as a SectionBuild — a thin, typed alias so
// PAGE_DEFS below can list section keys and custom builders side by side in
// one array without TS complaining about the (locale?: Locale) vs
// (locale: Locale) signature mismatch.
function sb(key: SectionBuilderKey): SectionBuild {
  return (locale: Locale) => SECTION_BUILDERS[key](locale)
}

// Runs an ordered list of section builders against one locale and merges
// the results into a single page: all nodes combined, and the ordered list
// of section root ids that become this page's direct children under root.
function composePage(locale: Locale, builders: SectionBuild[]): { nodes: NodeMap; rootChildIds: string[] } {
  const nodes: NodeMap = {}
  const rootChildIds: string[] = []
  builders.forEach(build => {
    const { nodes: n, rootChildId } = build(locale)
    Object.assign(nodes, n)
    rootChildIds.push(rootChildId)
  })
  return { nodes, rootChildIds }
}

// ═══════════════════════════════════════════════════════════════════════════
// Custom, page-specific sections — same hand-built PageNode pattern as every
// section in templates.ts, just not generic enough to live there (article
// body copy, a contact form, a projects grid, etc). Kept local to this file.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Simple hero (heading + sub only, no CTA row) — reused by several pages ───

function buildSimpleHero(copy: { heading: string; sub: string }): { nodes: NodeMap; rootChildId: string } {
  const sectionId = id()
  const headingId = id()
  const subId = id()
  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 4, maxWidth: '3xl', centerContent: true, align: 'center', justify: 'center' } },
      children: [headingId, subId],
    },
    [headingId]: {
      id: headingId, type: 'heading', parentId: sectionId,
      props: { tag: 'h1', content: copy.heading, style: { fontSize: '4xl', fontWeight: 'bold', textAlign: 'center' } },
      children: [],
    },
    [subId]: {
      id: subId, type: 'text', parentId: sectionId,
      props: { content: copy.sub, style: { fontSize: 'lg', textAlign: 'center', textColor: 'neutral-500' } },
      children: [],
    },
  }
  return { nodes, rootChildId: sectionId }
}

const MISSION_HERO_COPY = {
  en: { heading: 'We build tools that get out of your way.', sub: 'A small, independent team making page-building software we actually want to use ourselves.' },
  fa: { heading: 'ابزارهایی می‌سازیم که سر راهتان نمی‌ایستند.', sub: 'یک تیم کوچک و مستقل که نرم‌افزار صفحه‌سازی می‌سازد که خودمان هم واقعاً دوست داریم از آن استفاده کنیم.' },
}
function buildMissionHero(locale: Locale) { return buildSimpleHero(MISSION_HERO_COPY[locale] ?? MISSION_HERO_COPY.en) }

const INTRO_HERO_COPY = {
  en: { heading: "Hi, I'm Jordan — I design and build products.", sub: 'A selection of recent work in product design, branding, and front-end development.' },
  fa: { heading: 'سلام، من جردن هستم — محصول طراحی و می‌سازم.', sub: 'گزیده‌ای از کارهای اخیر در طراحی محصول، برندینگ و توسعه فرانت‌اند.' },
}
function buildIntroHero(locale: Locale) { return buildSimpleHero(INTRO_HERO_COPY[locale] ?? INTRO_HERO_COPY.en) }

const PRICING_HERO_COPY = {
  en: { heading: 'Simple pricing, no surprises.', sub: 'Pick a plan that fits your team. Upgrade, downgrade, or cancel any time.' },
  fa: { heading: 'قیمت‌گذاری ساده، بدون غافلگیری.', sub: 'پلنی متناسب با تیم خود انتخاب کنید. هر زمان ارتقا، تنزل یا لغو کنید.' },
}
function buildPricingHero(locale: Locale) { return buildSimpleHero(PRICING_HERO_COPY[locale] ?? PRICING_HERO_COPY.en) }

const CONTACT_HERO_COPY = {
  en: { heading: "Let's talk.", sub: 'Questions, feedback, or just want to say hi? We usually reply within a business day.' },
  fa: { heading: 'بیایید صحبت کنیم.', sub: 'سوال دارید، بازخوردی دارید یا فقط می‌خواهید سلام کنید؟ معمولاً ظرف یک روز کاری پاسخ می‌دهیم.' },
}
function buildContactHero(locale: Locale) { return buildSimpleHero(CONTACT_HERO_COPY[locale] ?? CONTACT_HERO_COPY.en) }

// ─── Article header (title/cover for the Blog / Article page) ─────────────

const ARTICLE_HEADER_COPY = {
  en: { badge: 'Design', title: 'The Anatomy of a Great Landing Page', meta: 'By Jordan Lee  ·  June 12, 2026  ·  6 min read', imgAlt: 'Article cover image' },
  fa: { badge: 'طراحی', title: 'کالبدشکافی یک صفحه فرود عالی', meta: 'نوشته جردن لی  ·  ۱۲ ژوئن ۲۰۲۶  ·  ۶ دقیقه مطالعه', imgAlt: 'تصویر کاور مقاله' },
}

function buildArticleHeader(locale: Locale): { nodes: NodeMap; rootChildId: string } {
  const c = ARTICLE_HEADER_COPY[locale] ?? ARTICLE_HEADER_COPY.en
  const sectionId = id(); const badgeId = id(); const titleId = id(); const metaId = id(); const imgId = id()
  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 14, px: 8, display: 'flex', flexDir: 'col', gap: 4, maxWidth: '3xl', centerContent: true, align: 'center' } },
      children: [badgeId, titleId, metaId, imgId],
    },
    [badgeId]: { id: badgeId, type: 'badge', parentId: sectionId, props: { label: c.badge, variant: 'soft' }, children: [] },
    [titleId]: { id: titleId, type: 'heading', parentId: sectionId, props: { tag: 'h1', content: c.title, style: { fontSize: '4xl', fontWeight: 'bold', textAlign: 'center' } }, children: [] },
    [metaId]:  { id: metaId, type: 'text', parentId: sectionId, props: { content: c.meta, style: { fontSize: 'sm', textAlign: 'center', textColor: 'neutral-400' } }, children: [] },
    [imgId]:   { id: imgId, type: 'image', parentId: sectionId, props: { src: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&q=80', alt: c.imgAlt, style: { width: 'full', rounded: 'xl', aspectRatio: '16/9', objectFit: 'cover' } }, children: [] },
  }
  return { nodes, rootChildId: sectionId }
}

// ─── Article body (long-form copy for the Blog / Article page) ────────────

const ARTICLE_BODY_COPY = {
  en: {
    h1: 'Start with a clear promise',
    p1: 'Every high-converting landing page opens with a single, unambiguous promise — what the visitor gets, and why it matters to them specifically. Vague taglines might look good in a deck, but they rarely survive contact with a real, distracted visitor who decides whether to keep reading in about three seconds.',
    highlight: 'The best landing pages read like a conversation, not a brochure.',
    h2: 'Design for scanning, not reading',
    p2: "Most visitors skim before they commit to reading anything closely. Short paragraphs, clear subheadings, and generous white space aren't decoration — they're what makes a page skimmable in the first place, and a skimmable page is a page people actually get through.",
    p3: 'Once the structure is right, everything else — color, imagery, micro-copy — is polish. Get the promise and the scan-path right first, and the rest becomes much easier to get right too.',
  },
  fa: {
    h1: 'با یک وعده روشن شروع کنید',
    p1: 'هر صفحه فرودی که نرخ تبدیل بالایی دارد، با یک وعده واحد و بدون ابهام شروع می‌شود — بازدیدکننده چه چیزی به‌دست می‌آورد و چرا دقیقاً برای او اهمیت دارد. شعارهای مبهم شاید در یک ارائه خوب به‌نظر برسند، اما به‌ندرت در برابر یک بازدیدکننده واقعی و پرت‌حواس که در حدود سه ثانیه تصمیم می‌گیرد ادامه بدهد یا نه، دوام می‌آورند.',
    highlight: 'بهترین صفحات فرود مثل یک گفت‌وگو خوانده می‌شوند، نه یک بروشور.',
    h2: 'برای مرورِ سریع طراحی کنید، نه خواندن کامل',
    p2: 'بیشتر بازدیدکنندگان قبل از اینکه متعهد به خواندن دقیق شوند، ابتدا صفحه را مرور سریع می‌کنند. پاراگراف‌های کوتاه، زیرعنوان‌های روشن و فضای خالی سخاوتمندانه فقط تزئین نیستند — همان چیزهایی هستند که اصلاً یک صفحه را قابل مرور می‌کنند.',
    p3: 'وقتی ساختار درست باشد، بقیه چیزها — رنگ، تصویر، متن‌های کوچک — فقط پرداخت نهایی است. اول وعده و مسیر مرور را درست کنید، بقیه کار هم بسیار ساده‌تر می‌شود.',
  },
}

function buildArticleBody(locale: Locale): { nodes: NodeMap; rootChildId: string } {
  const c = ARTICLE_BODY_COPY[locale] ?? ARTICLE_BODY_COPY.en
  const sectionId = id()
  const h1Id = id(); const p1Id = id(); const hlId = id()
  const h2Id = id(); const p2Id = id(); const p3Id = id()
  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 10, px: 8, display: 'flex', flexDir: 'col', gap: 5, maxWidth: '3xl', centerContent: true } },
      children: [h1Id, p1Id, hlId, h2Id, p2Id, p3Id],
    },
    [h1Id]: { id: h1Id, type: 'heading', parentId: sectionId, props: { tag: 'h2', content: c.h1, style: { fontSize: '2xl', fontWeight: 'bold' } }, children: [] },
    [p1Id]: { id: p1Id, type: 'text', parentId: sectionId, props: { content: c.p1, style: { fontSize: 'base', textColor: 'neutral-700', leading: 'relaxed' } }, children: [] },
    [hlId]: { id: hlId, type: 'text', parentId: sectionId, props: { content: c.highlight, style: { fontSize: 'xl', italic: true, textColor: 'violet-600', fontWeight: 'medium' } }, children: [] },
    [h2Id]: { id: h2Id, type: 'heading', parentId: sectionId, props: { tag: 'h2', content: c.h2, style: { fontSize: '2xl', fontWeight: 'bold' } }, children: [] },
    [p2Id]: { id: p2Id, type: 'text', parentId: sectionId, props: { content: c.p2, style: { fontSize: 'base', textColor: 'neutral-700', leading: 'relaxed' } }, children: [] },
    [p3Id]: { id: p3Id, type: 'text', parentId: sectionId, props: { content: c.p3, style: { fontSize: 'base', textColor: 'neutral-700', leading: 'relaxed' } }, children: [] },
  }
  return { nodes, rootChildId: sectionId }
}

// ─── Author bio card ────────────────────────────────────────────────────────

const AUTHOR_BIO_COPY = {
  en: { name: 'Jordan Lee', role: 'Head of Growth, Acme Corp', bio: 'Jordan writes about growth, design, and the occasional bad pun. Previously led marketing at two early-stage startups.' },
  fa: { name: 'جردن لی', role: 'مدیر رشد، شرکت آکمی', bio: 'جردن درباره رشد، طراحی و گاهی جوک‌های بد می‌نویسد. پیش‌تر بازاریابی دو استارتاپ نوپا را هدایت کرده است.' },
}

function buildAuthorBio(locale: Locale): { nodes: NodeMap; rootChildId: string } {
  const c = AUTHOR_BIO_COPY[locale] ?? AUTHOR_BIO_COPY.en
  const sectionId = id(); const rowId = id(); const avId = id(); const colId = id()
  const nameId = id(); const roleId = id(); const bioId = id()
  const nodes: NodeMap = {
    [sectionId]: { id: sectionId, type: 'section', parentId: null, props: { style: { py: 10, px: 8, maxWidth: '3xl', centerContent: true } }, children: [rowId] },
    [rowId]: { id: rowId, type: 'columns', parentId: sectionId, props: { style: { display: 'flex', gap: 4, align: 'center', bgColor: 'neutral-50', rounded: 'xl', px: 6, py: 6 } }, children: [avId, colId] },
    [avId]: { id: avId, type: 'avatar', parentId: rowId, props: { src: '', initials: 'JL', size: 56 }, children: [] },
    [colId]: { id: colId, type: 'column', parentId: rowId, props: { style: { px: 0, py: 0, display: 'flex', flexDir: 'col', gap: 1 } }, children: [nameId, roleId, bioId] },
    [nameId]: { id: nameId, type: 'heading', parentId: colId, props: { tag: 'h4', content: c.name, style: { fontSize: 'base', fontWeight: 'semibold' } }, children: [] },
    [roleId]: { id: roleId, type: 'text', parentId: colId, props: { content: c.role, style: { fontSize: 'xs', textColor: 'neutral-400' } }, children: [] },
    [bioId]: { id: bioId, type: 'text', parentId: colId, props: { content: c.bio, style: { fontSize: 'sm', textColor: 'neutral-600' } }, children: [] },
  }
  return { nodes, rootChildId: sectionId }
}

// ─── Story section (About Us) ──────────────────────────────────────────────

const STORY_COPY = {
  en: { eyebrow: '✦ OUR STORY', heading: 'Built by a small team who got tired of clunky builders', body: "We started as three designers and one engineer, frustrated with page builders that fought us at every turn. Three years later, we're a small, profitable, fully remote team — still building the tool we always wanted for ourselves.", imgAlt: 'Our team working' },
  fa: { eyebrow: '✦ داستان ما', heading: 'ساخته‌شده توسط یک تیم کوچک که از ابزارهای دست‌وپاگیر خسته شده بود', body: 'ما با سه طراح و یک مهندس شروع کردیم، خسته از صفحه‌سازهایی که در هر قدم سر راهمان می‌ایستادند. سه سال بعد، یک تیم کوچک، سودده و کاملاً دورکار هستیم — هنوز همان ابزاری را می‌سازیم که همیشه برای خودمان می‌خواستیم.', imgAlt: 'تیم ما در حال کار' },
}

function buildStorySection(locale: Locale): { nodes: NodeMap; rootChildId: string } {
  const c = STORY_COPY[locale] ?? STORY_COPY.en
  const sectionId = id(); const colsId = id(); const col1Id = id(); const col2Id = id()
  const imgId = id(); const eyebrowId = id(); const headId = id(); const bodyId = id()
  const nodes: NodeMap = {
    [sectionId]: { id: sectionId, type: 'section', parentId: null, props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 8, maxWidth: '5xl', centerContent: true } }, children: [colsId] },
    [colsId]: { id: colsId, type: 'columns', parentId: sectionId, props: { style: { display: 'flex', gap: 12, align: 'center' } }, children: [col1Id, col2Id] },
    [col1Id]: { id: col1Id, type: 'column', parentId: colsId, props: { style: { px: 0, py: 0 } }, children: [imgId] },
    [col2Id]: { id: col2Id, type: 'column', parentId: colsId, props: { style: { px: 0, py: 4, display: 'flex', flexDir: 'col', gap: 4 } }, children: [eyebrowId, headId, bodyId] },
    [imgId]: { id: imgId, type: 'image', parentId: col1Id, props: { src: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&q=80', alt: c.imgAlt, style: { width: 'full', rounded: 'xl', aspectRatio: '4/3', objectFit: 'cover' } }, children: [] },
    [eyebrowId]: { id: eyebrowId, type: 'text', parentId: col2Id, props: { content: c.eyebrow, style: { fontSize: 'xs', fontWeight: 'semibold', textColor: 'violet-600' } }, children: [] },
    [headId]: { id: headId, type: 'heading', parentId: col2Id, props: { tag: 'h2', content: c.heading, style: { fontSize: '3xl', fontWeight: 'bold' } }, children: [] },
    [bodyId]: { id: bodyId, type: 'text', parentId: col2Id, props: { content: c.body, style: { fontSize: 'base', textColor: 'neutral-600' } }, children: [] },
  }
  return { nodes, rootChildId: sectionId }
}

// ─── Projects grid (Portfolio) ──────────────────────────────────────────────

const PROJECTS_GRID_COPY = {
  en: {
    heading: 'Selected work',
    projects: [
      { category: 'Branding', title: 'Nord — identity system', desc: 'Full brand identity and design system for a Nordic outdoor gear startup.' },
      { category: 'Web Design', title: 'Fintra — marketing site', desc: 'Landing page and product marketing site for a fintech app.' },
      { category: 'Product', title: 'Loop — habit tracker', desc: 'End-to-end product design for an iOS habit-tracking app.' },
    ],
  },
  fa: {
    heading: 'کارهای منتخب',
    projects: [
      { category: 'برندینگ', title: 'نورد — سیستم هویت بصری', desc: 'هویت بصری کامل و سیستم طراحی برای یک استارتاپ تجهیزات فضای باز اسکاندیناوی.' },
      { category: 'طراحی وب', title: 'فینترا — سایت بازاریابی', desc: 'صفحه فرود و سایت بازاریابی محصول برای یک اپلیکیشن فین‌تک.' },
      { category: 'محصول', title: 'لوپ — ردیاب عادت', desc: 'طراحی محصول سرتاسری برای یک اپلیکیشن iOS ردیابی عادت.' },
    ],
  },
}

function buildProjectsGrid(locale: Locale): { nodes: NodeMap; rootChildId: string } {
  const c = PROJECTS_GRID_COPY[locale] ?? PROJECTS_GRID_COPY.en
  const sectionId = id(); const headId = id(); const colsId = id()

  function makeProject(parent: string, img: string, category: string, title: string, desc: string) {
    const colId = id(); const imgId = id(); const catId = id(); const titleId = id(); const descId = id()
    return {
      colId,
      nodes: {
        [colId]:   { id: colId, type: 'column', parentId: parent, props: { style: { px: 0, py: 0, display: 'flex', flexDir: 'col', gap: 2 } }, children: [imgId, catId, titleId, descId] },
        [imgId]:   { id: imgId, type: 'image', parentId: colId, props: { src: img, alt: title, style: { width: 'full', rounded: 'lg', aspectRatio: '4/3', objectFit: 'cover' } }, children: [] },
        [catId]:   { id: catId, type: 'badge', parentId: colId, props: { label: category, variant: 'soft' }, children: [] },
        [titleId]: { id: titleId, type: 'heading', parentId: colId, props: { tag: 'h3', content: title, style: { fontSize: 'lg', fontWeight: 'semibold' } }, children: [] },
        [descId]:  { id: descId, type: 'text', parentId: colId, props: { content: desc, style: { fontSize: 'sm', textColor: 'neutral-500' } }, children: [] },
      } as Record<string, PageNode>,
    }
  }

  const p1 = makeProject(colsId, 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=600&q=80', c.projects[0].category, c.projects[0].title, c.projects[0].desc)
  const p2 = makeProject(colsId, 'https://images.unsplash.com/photo-1487014679447-9f8336841d58?w=600&q=80', c.projects[1].category, c.projects[1].title, c.projects[1].desc)
  const p3 = makeProject(colsId, 'https://images.unsplash.com/photo-1522199755839-a2bacb67c546?w=600&q=80', c.projects[2].category, c.projects[2].title, c.projects[2].desc)

  const nodes: NodeMap = {
    [sectionId]: { id: sectionId, type: 'section', parentId: null, props: { style: { py: 16, px: 8, display: 'flex', flexDir: 'col', gap: 10, maxWidth: '6xl', centerContent: true } }, children: [headId, colsId] },
    [headId]: { id: headId, type: 'heading', parentId: sectionId, props: { tag: 'h2', content: c.heading, style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' } }, children: [] },
    [colsId]: { id: colsId, type: 'columns', parentId: sectionId, props: { style: { display: 'flex', gap: 8, align: 'start' } }, children: [p1.colId, p2.colId, p3.colId] },
    ...p1.nodes, ...p2.nodes, ...p3.nodes,
  }
  return { nodes, rootChildId: sectionId }
}

// ─── Contact info strip ─────────────────────────────────────────────────────

const CONTACT_INFO_COPY = {
  en: { items: [
    { icon: '✉️', label: 'Email', value: 'hello@acme.com' },
    { icon: '📞', label: 'Phone', value: '+1 (555) 012-3456' },
    { icon: '📍', label: 'Office', value: '123 Market St, San Francisco, CA' },
  ] },
  fa: { items: [
    { icon: '✉️', label: 'ایمیل', value: 'hello@acme.com' },
    { icon: '📞', label: 'تلفن', value: '۰۲۱-۱۲۳۴۵۶۷۸' },
    { icon: '📍', label: 'دفتر', value: 'تهران، خیابان ولیعصر، پلاک ۱۲۳' },
  ] },
}

function buildContactInfo(locale: Locale): { nodes: NodeMap; rootChildId: string } {
  const c = CONTACT_INFO_COPY[locale] ?? CONTACT_INFO_COPY.en
  const sectionId = id(); const colsId = id()

  function makeItem(parent: string, icon: string, label: string, value: string) {
    const colId = id(); const iconId = id(); const labelId = id(); const valueId = id()
    return {
      colId,
      nodes: {
        [colId]:   { id: colId, type: 'column', parentId: parent, props: { style: { px: 4, py: 4, display: 'flex', flexDir: 'col', gap: 1, align: 'center' } }, children: [iconId, labelId, valueId] },
        [iconId]:  { id: iconId, type: 'text', parentId: colId, props: { content: icon, style: { fontSize: '2xl', textAlign: 'center' } }, children: [] },
        [labelId]: { id: labelId, type: 'text', parentId: colId, props: { content: label, style: { fontSize: 'xs', fontWeight: 'semibold', textAlign: 'center', textColor: 'neutral-400' } }, children: [] },
        [valueId]: { id: valueId, type: 'text', parentId: colId, props: { content: value, style: { fontSize: 'sm', textAlign: 'center', textColor: 'neutral-700' } }, children: [] },
      } as Record<string, PageNode>,
    }
  }

  const i1 = makeItem(colsId, c.items[0].icon, c.items[0].label, c.items[0].value)
  const i2 = makeItem(colsId, c.items[1].icon, c.items[1].label, c.items[1].value)
  const i3 = makeItem(colsId, c.items[2].icon, c.items[2].label, c.items[2].value)

  const nodes: NodeMap = {
    [sectionId]: { id: sectionId, type: 'section', parentId: null, props: { style: { py: 8, px: 8, display: 'flex', flexDir: 'col', maxWidth: '5xl', centerContent: true } }, children: [colsId] },
    [colsId]: { id: colsId, type: 'columns', parentId: sectionId, props: { style: { display: 'flex', gap: 4, justify: 'between' } }, children: [i1.colId, i2.colId, i3.colId] },
    ...i1.nodes, ...i2.nodes, ...i3.nodes,
  }
  return { nodes, rootChildId: sectionId }
}

// ─── Contact form (real 'form' node — mirrors registry.tsx's form createExtras) ───

const CONTACT_FORM_COPY = {
  en: { heading: 'Send us a message', sub: "We'll get back to you within one business day.", name: 'Name', namePh: 'Jane Doe', email: 'Email', emailPh: 'jane@example.com', message: 'Message', messagePh: 'How can we help?', submit: 'Send message', success: 'Thanks! Your message has been sent.', error: 'Something went wrong — please try again.' },
  fa: { heading: 'برای ما پیام بفرستید', sub: 'ظرف یک روز کاری با شما تماس می‌گیریم.', name: 'نام', namePh: 'سارا احمدی', email: 'ایمیل', emailPh: 'sara@example.com', message: 'پیام', messagePh: 'چطور می‌توانیم کمک کنیم؟', submit: 'ارسال پیام', success: 'ممنون! پیام شما ارسال شد.', error: 'مشکلی پیش آمد — لطفاً دوباره تلاش کنید.' },
}

function buildContactForm(locale: Locale): { nodes: NodeMap; rootChildId: string } {
  const c = CONTACT_FORM_COPY[locale] ?? CONTACT_FORM_COPY.en
  const sectionId = id(); const headId = id(); const subId = id(); const formId = id()
  const nameId = id(); const emailId = id(); const messageId = id(); const submitId = id()
  const nodes: NodeMap = {
    [sectionId]: { id: sectionId, type: 'section', parentId: null, props: { style: { py: 12, px: 8, display: 'flex', flexDir: 'col', gap: 6, maxWidth: '2xl', centerContent: true } }, children: [headId, subId, formId] },
    [headId]: { id: headId, type: 'heading', parentId: sectionId, props: { tag: 'h2', content: c.heading, style: { fontSize: '2xl', fontWeight: 'bold', textAlign: 'center' } }, children: [] },
    [subId]:  { id: subId, type: 'text', parentId: sectionId, props: { content: c.sub, style: { fontSize: 'sm', textAlign: 'center', textColor: 'neutral-500' } }, children: [] },
    [formId]: {
      id: formId, type: 'form', parentId: sectionId,
      props: { action: '', method: 'POST', submitAsJson: false, successMessage: c.success, errorMessage: c.error, style: { display: 'flex', flexDir: 'col', gap: 4 } },
      children: [nameId, emailId, messageId, submitId],
    },
    [nameId]:    { id: nameId, type: 'formInput', parentId: formId, props: { fieldName: 'name', label: c.name, placeholder: c.namePh, inputType: 'text', required: true, style: {} }, children: [] },
    [emailId]:   { id: emailId, type: 'formInput', parentId: formId, props: { fieldName: 'email', label: c.email, placeholder: c.emailPh, inputType: 'email', required: true, style: {} }, children: [] },
    [messageId]: { id: messageId, type: 'formTextarea', parentId: formId, props: { fieldName: 'message', label: c.message, placeholder: c.messagePh, rows: 4, required: false, style: {} }, children: [] },
    [submitId]:  { id: submitId, type: 'formSubmit', parentId: formId, props: { label: c.submit, variant: 'solid', style: {} }, children: [] },
  }
  return { nodes, rootChildId: sectionId }
}

// ─── Coming Soon hero + email signup ───────────────────────────────────────

const COMING_SOON_COPY = {
  en: { badge: 'Launching soon', heading: 'Something big is on the way.', sub: "We're putting the finishing touches on it. Leave your email and we'll let you know the moment it's live.", emailPh: 'you@example.com', submit: 'Notify me', success: "You're on the list — we'll be in touch.", error: 'Something went wrong — please try again.' },
  fa: { badge: 'به‌زودی', heading: 'یک چیز بزرگ در راه است.', sub: 'داریم آخرین لمس‌ها را می‌زنیم. ایمیل خود را بگذارید تا لحظه‌ی راه‌اندازی به شما خبر بدهیم.', emailPh: 'you@example.com', submit: 'به من خبر بده', success: 'شما در لیست هستید — به‌زودی با شما تماس می‌گیریم.', error: 'مشکلی پیش آمد — لطفاً دوباره تلاش کنید.' },
}

function buildComingSoonHero(locale: Locale): { nodes: NodeMap; rootChildId: string } {
  const c = COMING_SOON_COPY[locale] ?? COMING_SOON_COPY.en
  const sectionId = id(); const badgeId = id(); const headId = id(); const subId = id()
  const formId = id(); const emailId = id(); const submitId = id()
  const nodes: NodeMap = {
    [sectionId]: {
      id: sectionId, type: 'section', parentId: null,
      props: { style: { py: 24, px: 8, display: 'flex', flexDir: 'col', gap: 5, maxWidth: '2xl', centerContent: true, align: 'center', minHeight: 480, justify: 'center' } },
      children: [badgeId, headId, subId, formId],
    },
    [badgeId]: { id: badgeId, type: 'badge', parentId: sectionId, props: { label: c.badge, variant: 'soft' }, children: [] },
    [headId]:  { id: headId, type: 'heading', parentId: sectionId, props: { tag: 'h1', content: c.heading, style: { fontSize: '4xl', fontWeight: 'bold', textAlign: 'center' } }, children: [] },
    [subId]:   { id: subId, type: 'text', parentId: sectionId, props: { content: c.sub, style: { fontSize: 'lg', textAlign: 'center', textColor: 'neutral-500' } }, children: [] },
    [formId]:  {
      id: formId, type: 'form', parentId: sectionId,
      props: { action: '', method: 'POST', submitAsJson: false, successMessage: c.success, errorMessage: c.error, style: { display: 'flex', flexDir: 'row', gap: 2, justify: 'center' } },
      children: [emailId, submitId],
    },
    [emailId]:  { id: emailId, type: 'formInput', parentId: formId, props: { fieldName: 'email', label: '', placeholder: c.emailPh, inputType: 'email', required: true, style: { width: 260 } }, children: [] },
    [submitId]: { id: submitId, type: 'formSubmit', parentId: formId, props: { label: c.submit, variant: 'solid', style: {} }, children: [] },
  }
  return { nodes, rootChildId: sectionId }
}

// ═══════════════════════════════════════════════════════════════════════════
// Page registry
// ═══════════════════════════════════════════════════════════════════════════

interface PageDef {
  key:       string
  label:     string
  icon:      string
  thumbnail: string
  sections:  SectionBuild[]
}

const PAGE_DEFS: PageDef[] = [
  {
    key: 'saas-landing', label: 'SaaS Landing Page', icon: '🚀',
    thumbnail: 'Header, hero, logos, features, stats, testimonials, pricing, FAQ, footer',
    sections: [
      sb('header'), sb('hero'), sb('logoCloud'), sb('threeColFeatures'),
      sb('stats'), sb('testimonialCarousel'), sb('pricing'), sb('faqAccordion'),
      sb('ctaBanner'), sb('footer'),
    ],
  },
  {
    key: 'blog-article', label: 'Blog / Article Page', icon: '📰',
    thumbnail: 'Header, article title + cover, body copy, author bio, related posts, footer',
    sections: [
      sb('header'), buildArticleHeader, buildArticleBody, buildAuthorBio,
      sb('blogGrid'), sb('newsletter'), sb('footer'),
    ],
  },
  {
    key: 'about-us', label: 'About Us Page', icon: '🧭',
    thumbnail: 'Header, mission, our story, stats, team, testimonial, CTA, footer',
    sections: [
      sb('header'), buildMissionHero, buildStorySection, sb('stats'),
      sb('team'), sb('testimonialCarousel'), sb('ctaBanner'), sb('footer'),
    ],
  },
  {
    key: 'portfolio', label: 'Portfolio / Personal Page', icon: '🎨',
    thumbnail: 'Header, intro, selected work, testimonial, CTA, footer',
    sections: [
      sb('header'), buildIntroHero, buildProjectsGrid, sb('testimonial'),
      sb('ctaBanner'), sb('footer'),
    ],
  },
  {
    key: 'pricing-page', label: 'Pricing Page', icon: '💳',
    thumbnail: 'Header, pricing intro, plans, comparison table, FAQ, CTA, footer',
    sections: [
      sb('header'), buildPricingHero, sb('pricing'), sb('comparison'),
      sb('faqAccordion'), sb('ctaBanner'), sb('footer'),
    ],
  },
  {
    key: 'contact', label: 'Contact Page', icon: '✉️',
    thumbnail: 'Header, intro, contact details, contact form, footer',
    sections: [
      sb('header'), buildContactHero, buildContactInfo, buildContactForm, sb('footer'),
    ],
  },
  {
    key: 'coming-soon', label: 'Coming Soon / Waitlist', icon: '⏳',
    thumbnail: 'Header, big headline, email signup, footer',
    sections: [
      sb('header'), buildComingSoonHero, sb('footer'),
    ],
  },
]

const PAGE_LABELS_FA: Record<string, { label: string; thumbnail: string }> = {
  'saas-landing': { label: 'صفحه فرود SaaS', thumbnail: 'هدر، قهرمان، لوگوها، ویژگی‌ها، آمار، نظرات، قیمت‌گذاری، سوالات متداول، فوتر' },
  'blog-article': { label: 'صفحه وبلاگ / مقاله', thumbnail: 'هدر، عنوان و کاور مقاله، متن مقاله، معرفی نویسنده، مطالب مرتبط، فوتر' },
  'about-us':     { label: 'صفحه درباره ما', thumbnail: 'هدر، ماموریت، داستان ما، آمار، تیم، نظر مشتری، فراخوان، فوتر' },
  portfolio:      { label: 'صفحه نمونه‌کار', thumbnail: 'هدر، معرفی، کارهای منتخب، نظر مشتری، فراخوان، فوتر' },
  'pricing-page': { label: 'صفحه قیمت‌گذاری', thumbnail: 'هدر، معرفی قیمت، پلن‌ها، جدول مقایسه، سوالات متداول، فراخوان، فوتر' },
  contact:        { label: 'صفحه تماس', thumbnail: 'هدر، معرفی، اطلاعات تماس، فرم تماس، فوتر' },
  'coming-soon':  { label: 'صفحه به‌زودی / لیست انتظار', thumbnail: 'هدر، تیتر بزرگ، عضویت با ایمیل، فوتر' },
}

export function getPageTemplates(locale: Locale = 'en'): PageTemplate[] {
  return PAGE_DEFS.map(def => {
    const fa = PAGE_LABELS_FA[def.key]
    const useFa = locale === 'fa' && fa
    return {
      label:     useFa ? fa!.label : def.label,
      icon:      def.icon,
      thumbnail: useFa ? fa!.thumbnail : def.thumbnail,
      build:     () => composePage(locale, def.sections),
    }
  })
}

// ─── Insert hook — REPLACES the canvas rather than appending ───────────────
// A page template is a complete, opinionated page, not one more section to
// drop in alongside whatever's already there — so unlike useInsertTemplate
// in TemplatePicker.tsx (which appends a single section under root), this
// clears every existing child off root first, then grafts the new page's
// sections in as root's only children. The root node ITSELF is preserved
// (same id, same type) — only its children array is reset — so nothing
// elsewhere that references rootId by identity breaks.
export function useInsertPageTemplate(pageTemplates: PageTemplate[]) {
  return function insertPageTemplate(index: number) {
    const pageTemplate = pageTemplates[index]
    if (!pageTemplate) return

    const { nodes: builtNodes, rootChildIds } = pageTemplate.build()

    useBuilderStore.setState(prev => {
      const snap = JSON.parse(JSON.stringify(prev.nodes))
      const newPast = [snap, ...prev.past].slice(0, 50)

      const rootNode = prev.nodes[prev.rootId]
      const next: NodeMap = {
        [prev.rootId]: { ...rootNode, children: [] },
      }

      Object.values(builtNodes).forEach(n => { next[n.id] = { ...n } })

      next[prev.rootId].children = [...rootChildIds]
      rootChildIds.forEach(cid => { next[cid].parentId = prev.rootId })

      return {
        nodes:      next,
        past:       newPast,
        future:     [],
        selectedId: null,
      }
    })
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Picker UI
// ═══════════════════════════════════════════════════════════════════════════

function PageCard({ tpl, onClick }: { tpl: PageTemplate; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-start rounded-lg border border-neutral-200 hover:border-violet-300 hover:bg-violet-50 transition-colors p-3 group flex items-start gap-3"
    >
      <span className="text-xl leading-none shrink-0 w-7 text-center">{tpl.icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-800 group-hover:text-violet-700 leading-tight">{tpl.label}</p>
        <p className="text-[11px] text-neutral-400 mt-1 leading-snug">{tpl.thumbnail}</p>
      </div>
    </button>
  )
}

// Reusable list — embedded directly (no confirm step) inside AddContentModal's
// new "Pages" tab, since that modal only ever opens while the canvas is
// already empty (see EmptyCanvasPrompt in TemplatePicker.tsx) — nothing to
// lose there.
export function PageTemplateGrid({
  templates, onInsert,
}: {
  templates: PageTemplate[]
  onInsert: (index: number) => void
}) {
  return (
    <div className="space-y-2">
      {templates.map((tpl, i) => (
        <PageCard key={tpl.label} tpl={tpl} onClick={() => onInsert(i)} />
      ))}
    </div>
  )
}

// Standalone modal for the TopBar entry point. Unlike the Pages tab above,
// this can be opened at ANY time — including with existing content on the
// canvas — so picking a template here needs an explicit "this replaces
// everything" confirmation step first. Skips the confirmation automatically
// if the canvas happens to already be empty.
export function PageTemplatePickerModal({ onClose }: { onClose: () => void }) {
  const locale       = useBuilderStore(s => s.locale)
  const dir          = directionForLocale(locale)
  const templates    = getPageTemplates(locale)
  const insert       = useInsertPageTemplate(templates)
  const t            = useT()
  const rootChildren = useBuilderStore(s => s.nodes[s.rootId]?.children ?? [])
  const isEmpty      = rootChildren.length === 0

  const [pendingIndex, setPendingIndex] = useState<number | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handlePick(i: number) {
    if (isEmpty) { insert(i); onClose(); return }
    setPendingIndex(i)
  }

  function confirmReplace() {
    if (pendingIndex === null) return
    insert(pendingIndex)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" onClick={onClose}>
      <div
        dir={dir}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md max-h-[70vh] bg-white rounded-xl shadow-xl ring-1 ring-black/5 flex flex-col overflow-hidden"
      >
        <div className="px-4 pt-3.5 pb-3 shrink-0 border-b border-neutral-100">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-neutral-800">{t('pageTemplatesTitle')}</p>
            <button
              onClick={onClose}
              aria-label={t('closeAria')}
              className="shrink-0 w-6 h-6 -me-1 rounded-md flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors text-sm"
            >
              ✕
            </button>
          </div>
          {pendingIndex === null && (
            <p className="text-xs text-neutral-400 mt-1">{t('pageTemplatesIntro')}</p>
          )}
        </div>

        {pendingIndex !== null ? (
          <div className="p-5 space-y-4">
            <p className="text-sm text-neutral-700">{t('confirmReplaceBody')}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPendingIndex(null)}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                {t('cancelBtn')}
              </button>
              <button
                onClick={confirmReplace}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                {t('confirmReplaceBtn')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <PageTemplateGrid templates={templates} onInsert={handlePick} />
          </div>
        )}
      </div>
    </div>
  )
}