import { NodeMap, PageNode, NodeType } from './types'
import {
  StyleProps, buildClassName, buildInlineStyle, buildOverlayStyle,
  buildSectionOuterStyle, buildSectionInnerStyle, setGlobalColorPalette,
} from './styleMapper'
import { compileCustomCss, compileHoverCss, wrapperClassFor, buildHoverTransitionStyle } from './customCss'
import type { HoverStyleProps } from './customCss'
import { resolveStyleForBreakpoint, resolveAnimationForBreakpoint } from './responsive'
import { AnimationProps, EFFECT_KEYFRAME, STARTS_HIDDEN, ANIMATION_KEYFRAMES } from './animations'
import { buildPersianGoogleFontsHref } from './richText'
import { resolveContentForBreakpoint } from './richTextResponsive'
import { hasCustomJs, escapeScriptClose } from './customJs'
import type { GlobalColor, GlobalTypographyStyle, SeoSettings } from './store'
import type { CSSProperties } from 'react'

// ─── LocalStorage ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'page-builder:autosave'

export interface SavedPage {
  nodes:   NodeMap
  rootId:  string
  savedAt: string
  version: 1 | 2
  // Added in version 2 — all optional so a version-1 save/JSON file (from
  // before global colors/typography/SEO existed) still imports fine; the
  // caller (TopBar.tsx) falls back to whatever the store already has for
  // any field that's missing. Genuinely needed, not just nice-to-have:
  // nodes can now store `global:<id>` color references (see
  // isGlobalColorRef in styleMapper.ts), so a save/export that omitted the
  // palette itself would silently break every bound color on reload.
  globalColors?:     GlobalColor[]
  globalTypography?: GlobalTypographyStyle[]
  globalCustomCss?:  string
  // Custom JS — same page-wide, non-undo-tracked treatment as
  // globalCustomCss right above it (see customJs.ts and store.ts).
  globalCustomJs?:   string
  seo?:              SeoSettings
}

export interface SavedPageExtras {
  globalColors?:     GlobalColor[]
  globalTypography?: GlobalTypographyStyle[]
  globalCustomCss?:  string
  globalCustomJs?:   string
  seo?:              SeoSettings
}

export function saveToLocalStorage(nodes: NodeMap, rootId: string, extra: SavedPageExtras = {}): boolean {
  if (typeof window === 'undefined') return false
  try {
    const payload: SavedPage = { nodes, rootId, savedAt: new Date().toISOString(), version: 2, ...extra }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    return true
  } catch { return false }
}

export function loadFromLocalStorage(): SavedPage | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedPage
    if (!parsed.nodes || !parsed.rootId) return null
    return parsed
  } catch { return null }
}

export function hasLocalStorageSave(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(STORAGE_KEY) !== null
}

export function clearLocalStorageSave(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}

// ─── JSON export / import ─────────────────────────────────────────────────────

export function downloadJSON(nodes: NodeMap, rootId: string, filename = 'page.json', extra: SavedPageExtras = {}): void {
  const payload: SavedPage = { nodes, rootId, savedAt: new Date().toISOString(), version: 2, ...extra }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  triggerDownload(blob, filename)
}

export interface ImportResult {
  success: boolean
  nodes?:  NodeMap
  rootId?: string
  globalColors?:     GlobalColor[]
  globalTypography?: GlobalTypographyStyle[]
  globalCustomCss?:  string
  globalCustomJs?:   string
  seo?:              SeoSettings
  error?:  string
}

export function parseImportedJSON(text: string): ImportResult {
  try {
    const parsed = JSON.parse(text) as Partial<SavedPage>
    if (!parsed.nodes || typeof parsed.nodes !== 'object')
      return { success: false, error: 'File is missing a valid "nodes" object.' }
    if (!parsed.rootId || typeof parsed.rootId !== 'string')
      return { success: false, error: 'File is missing a valid "rootId".' }
    if (!parsed.nodes[parsed.rootId])
      return { success: false, error: 'rootId does not point to an existing node.' }
    return {
      success: true, nodes: parsed.nodes, rootId: parsed.rootId,
      globalColors: parsed.globalColors, globalTypography: parsed.globalTypography,
      globalCustomCss: parsed.globalCustomCss, globalCustomJs: parsed.globalCustomJs, seo: parsed.seo,
    }
  } catch {
    return { success: false, error: 'This file is not valid JSON.' }
  }
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsText(file)
  })
}

// ─── HTML export ──────────────────────────────────────────────────────────────
// Reuses the live style/animation pipeline instead of hand-duplicating it —
// every color/spacing/typography/border/effect/visibility value is produced
// by the SAME buildInlineStyle / buildSectionOuterStyle / buildSectionInnerStyle
// functions styleMapper.ts already exports for the live editor and Preview.
// This file only adds the plumbing needed to turn "one resolved StyleProps
// object" into "real CSS a static file can render," three times per node
// (Desktop/Tablet/Mobile), instead of relying on React state to pick which
// one applies.
//
// STRATEGY: every node gets a stable class (wrapperClassFor(node.id), the
// same class Custom CSS / hover already use) with NO responsive-CSS
// properties applied as an inline style attribute — only real CSS rules:
//   .cc-<id> { ...desktop declarations... }
//   @media (max-width:768px) { .cc-<id> { ...tablet declarations... } }
//   @media (max-width:390px) { .cc-<id> { ...mobile declarations... } }
// Each media query carries the FULL resolved declaration set for that
// breakpoint (not a diff) — simpler and just as correct, since equal-
// specificity same-selector rules are resolved by source order, and mobile
// is emitted after tablet so it correctly wins at very narrow widths where
// both queries match.
//
// INTERACTIVE BLOCKS (Tabs, Carousel, Accordion, Form): Preview drives these
// with React state (activeIndex / openIdx / submit status). The exported
// file has no React, so each gets a small, self-contained vanilla-JS
// behavior in INTERACTIVE_SCRIPT at the bottom of this file — one shared
// script, feature-detecting which blocks are actually present via their
// data-pb-* marker attributes, so pages with none of these cost nothing
// extra.
//
// buildClassName's literal Tailwind utility output (w-full, object-cover,
// italic, etc.) is the one thing still DESKTOP-only — reflecting the
// Desktop-resolved value at every width. These are a small, mostly
// cosmetic set (see styleMapper.ts's buildClassName), and giving them full
// responsive treatment would mean shipping literal `md:w-full` etc.
// Tailwind variants tuned to THIS app's own custom breakpoints (768/390)
// rather than Tailwind's defaults — a reasonable follow-up if it turns out
// to matter, flagged here rather than silently assumed.

function esc(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cls(...parts: (string | undefined | false)[]): string {
  return parts.filter(Boolean).join(' ').trim()
}

// CSS properties React lets you pass as a bare number WITHOUT appending
// 'px' (React's own unitless-property list, trimmed to whatever
// buildInlineStyle/buildSectionOuterStyle/buildSectionInnerStyle actually
// ever emit as numbers: opacity, fontWeight, lineHeight, flexGrow,
// flexShrink). Everything else numeric gets 'px' appended, matching what
// the browser would already be doing implicitly when React assigns these
// via the DOM style object — reactStyleToCssText below just makes that
// implicit behavior explicit real CSS text.
const UNITLESS_CSS_PROPS = new Set(['opacity', 'fontWeight', 'lineHeight', 'flexGrow', 'flexShrink', 'zIndex', 'order'])

function kebabCase(prop: string): string {
  return prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)
}

function reactStyleToCssText(style: CSSProperties): string {
  const decls: string[] = []
  for (const key in style) {
    const value = (style as Record<string, unknown>)[key]
    if (value === undefined || value === null || value === '') continue
    const cssKey = kebabCase(key)
    if (typeof value === 'number' && !UNITLESS_CSS_PROPS.has(key)) {
      decls.push(`${cssKey}:${value}px`)
    } else {
      decls.push(`${cssKey}:${value}`)
    }
  }
  return decls.join(';')
}

function emitResponsiveRule(selector: string, desktop: CSSProperties, tablet: CSSProperties, mobile: CSSProperties): string {
  const parts: string[] = []
  const d = reactStyleToCssText(desktop)
  if (d) parts.push(`${selector}{${d}}`)
  const t = reactStyleToCssText(tablet)
  if (t) parts.push(`@media (max-width:768px){${selector}{${t}}}`)
  const m = reactStyleToCssText(mobile)
  if (m) parts.push(`@media (max-width:390px){${selector}{${m}}}`)
  return parts.join('\n')
}

// Hover-capable nodes get a smooth CSS transition in Preview (see
// buildHoverTransitionStyle in customCss.ts, merged into the live style
// object) — this was previously never emitted into the exported CSS at
// all, so hover color/opacity/shadow changes SNAPPED instantly in the
// exported file instead of fading like they do in Preview. Not
// breakpoint-dependent (the transition itself doesn't vary by width), so
// it's a single plain rule, not a media-query set.
function buildTransitionCss(nodeId: string, node: PageNode): string {
  const text = reactStyleToCssText(buildHoverTransitionStyle(node))
  if (!text) return ''
  return `.${wrapperClassFor(nodeId)}{${text}}`
}

// ─── Animations ─────────────────────────────────────────────────────────────
// Per-breakpoint effect/duration/delay/easing, same resolveAnimationForBreakpoint
// responsive.ts already exports. `trigger`/`once` themselves are read from
// the DESKTOP resolution only — letting those two vary per breakpoint too
// would need meaningfully more runtime JS (separate observers per
// breakpoint, torn down/rebuilt on resize) for a case that's rare in
// practice (WHEN to play rarely differs by device; WHAT plays does). Noting
// this here rather than silently assuming it doesn't matter.
//
// Mechanism: a shared `pb-play` class, added by a small IntersectionObserver
// in INTERACTIVE_SCRIPT (mirroring animations.ts's own useInView/
// useAnimationProps logic) or immediately on load for trigger:'onLoad'. CSS
// never plays anything on its own — `.cc-id.pb-play{...}` only matches once
// the script adds that class, exactly mirroring the live "shouldPlay" gate
// in useAnimationProps.

function buildAnimationCssForNode(nodeId: string, node: PageNode): string {
  const c = wrapperClassFor(nodeId)

  function ruleFor(a: AnimationProps): string {
    const effect = a.effect ?? 'none'
    if (effect === 'none') return ''
    const keyframe = EFFECT_KEYFRAME[effect]
    const duration = a.duration ?? 600
    const delay    = a.delay ?? 0
    const easing   = a.easing ?? 'ease-out'
    const hidden   = STARTS_HIDDEN.has(effect) ? `.${c}{opacity:0}` : ''
    const play     = `.${c}.pb-play{animation-name:${keyframe};animation-duration:${duration}ms;animation-delay:${delay}ms;animation-timing-function:${easing};animation-fill-mode:both}`
    return hidden + play
  }

  const d = ruleFor(resolveAnimationForBreakpoint(node, 'desktop'))
  const t = ruleFor(resolveAnimationForBreakpoint(node, 'tablet'))
  const m = ruleFor(resolveAnimationForBreakpoint(node, 'mobile'))

  const parts: string[] = []
  if (d) parts.push(d)
  if (t) parts.push(`@media (max-width:768px){${t}}`)
  if (m) parts.push(`@media (max-width:390px){${m}}`)
  return parts.join('\n')
}

function animAttrs(node: PageNode): string {
  const d = resolveAnimationForBreakpoint(node, 'desktop')
  const t = resolveAnimationForBreakpoint(node, 'tablet')
  const m = resolveAnimationForBreakpoint(node, 'mobile')
  const any = (d.effect ?? 'none') !== 'none' || (t.effect ?? 'none') !== 'none' || (m.effect ?? 'none') !== 'none'
  if (!any) return ''
  const trigger = d.trigger ?? 'onScroll'
  const once    = d.once ?? true
  return ` data-pb-animate="1" data-pb-trigger="${trigger}" data-pb-once="${once ? '1' : '0'}"`
}

// ─── Combined interactive behavior (Animations + Accordion + Tabs + Carousel + Form) ──
// One shared script, appended once, only when at least one interactive
// marker attribute is actually present in the body (see needsInteractiveScript
// in exportToHtml below) — feature-detects each behavior independently via
// querySelectorAll, so a page with e.g. only Tabs and no Carousel/Accordion/
// Form pays no extra runtime cost for the ones it doesn't use.
//
// Each block below mirrors its React counterpart's actual behavior, not
// just its appearance:
//   - Accordion: exactly one item open at a time (AccordionRender's
//     useState<number|null> semantics), same 240px max-height cap the live
//     component itself uses (see AccordionRender), same rotating "+" icon.
//   - Tabs: instant swap, exactly one pane visible (TabsEditor/TabsPreview),
//     first tab active by default (matches the `useState(0)` default).
//   - Carousel: sliding track via translateX (buildSlidingTrack in
//     Renderer.tsx), prev/next + dot navigation, autoplay as a
//     re-armed one-shot-timeout chain (matching CarouselPreview's own
//     useEffect exactly, including loop/no-loop stopping behavior and
//     pause-on-hover).
//   - Form: AJAX submit via fetch, mirroring FormPreview's own handleSubmit
//     in formNodes.tsx exactly (same FormData serialization, same
//     JSON-vs-multipart choice, same success/error messaging) — see the
//     new block at the bottom of this script.
const INTERACTIVE_SCRIPT = `<script>
(function(){
  // ── Scroll/onLoad animations ──
  document.querySelectorAll('[data-pb-animate]').forEach(function(el){
    var trig = el.getAttribute('data-pb-trigger');
    var once = el.getAttribute('data-pb-once') === '1';
    if (trig === 'onLoad') { el.classList.add('pb-play'); return; }
    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) {
          entry.target.classList.add('pb-play');
          if (once) obs.unobserve(entry.target);
        } else if (!once) {
          entry.target.classList.remove('pb-play');
        }
      });
    }, { threshold: 0.15 });
    obs.observe(el);
  });

  // ── Accordions: one item open at a time ──
  document.querySelectorAll('[data-pb-accordion]').forEach(function(acc){
    var items = acc.querySelectorAll(':scope > .pb-acc-item');
    items.forEach(function(item){
      var btn = item.querySelector(':scope > .pb-acc-btn');
      var content = item.querySelector(':scope > .pb-acc-content');
      var icon = btn.querySelector('.pb-acc-icon');
      btn.addEventListener('click', function(){
        var isOpen = content.style.maxHeight !== '0px';
        items.forEach(function(other){
          other.querySelector(':scope > .pb-acc-content').style.maxHeight = '0px';
          other.querySelector('.pb-acc-icon').classList.remove('rotate-45');
        });
        if (!isOpen) {
          content.style.maxHeight = '240px';
          icon.classList.add('rotate-45');
        }
      });
    });
  });

  // ── Tabs: instant swap, one pane visible ──
  document.querySelectorAll('[data-pb-tabs]').forEach(function(tabs){
    var btns   = tabs.querySelectorAll(':scope > .pb-tab-header > .pb-tab-btn');
    var panels = tabs.querySelectorAll(':scope > .pb-tab-panel');
    btns.forEach(function(btn, i){
      btn.addEventListener('click', function(){
        btns.forEach(function(b, j){
          b.classList.toggle('border-violet-600', j === i);
          b.classList.toggle('text-violet-700', j === i);
          b.classList.toggle('border-transparent', j !== i);
          b.classList.toggle('text-neutral-500', j !== i);
        });
        panels.forEach(function(p, j){ p.style.display = j === i ? 'block' : 'none'; });
      });
    });
  });

  // ── Carousels: sliding track + arrows/dots + autoplay ──
  document.querySelectorAll('[data-pb-carousel]').forEach(function(car){
    var track = car.querySelector(':scope > .pb-car-track');
    if (!track) return;
    var count = parseInt(car.getAttribute('data-count'), 10) || 1;
    var loop = car.getAttribute('data-loop') === '1';
    var autoplay = car.getAttribute('data-autoplay') === '1';
    var intervalMs = Math.max(1000, parseInt(car.getAttribute('data-autoplay-interval'), 10) || 4000);
    var dots = car.querySelectorAll('.pb-car-dot');
    var prevBtn = car.querySelector('.pb-car-prev');
    var nextBtn = car.querySelector('.pb-car-next');
    var active = 0;
    var timer = null;
    var paused = false;

    function render(){
      var widthPct = 100 / count;
      track.style.transform = 'translateX(-' + (widthPct * active) + '%)';
      dots.forEach(function(d, i){
        d.classList.toggle('bg-white', i === active);
        d.classList.toggle('bg-white/50', i !== active);
      });
    }
    function goTo(i){ active = ((i % count) + count) % count; render(); }
    function scheduleNext(){
      if (!autoplay || count <= 1 || paused) return;
      clearTimeout(timer);
      timer = setTimeout(function(){
        var next = active + 1;
        if (next >= count) { if (loop) goTo(0); }
        else { goTo(next); }
        scheduleNext();
      }, intervalMs);
    }
    if (prevBtn) prevBtn.addEventListener('click', function(){ goTo(active - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function(){ goTo(active + 1); });
    dots.forEach(function(d, i){ d.addEventListener('click', function(){ goTo(i); }); });
    car.addEventListener('mouseenter', function(){ paused = true; });
    car.addEventListener('mouseleave', function(){ paused = false; scheduleNext(); });
    scheduleNext();
  });

  // ── Forms: AJAX submit with success/error messaging ──
  // Mirrors FormPreview's handleSubmit in formNodes.tsx exactly: native
  // FormData serialization (no per-field state to keep in sync), a fetch
  // to the configured destination with either a multipart FormData body
  // or a JSON body depending on the author's "Send as JSON" choice, and a
  // success/error message swapped into the .pb-form-status placeholder
  // paragraph every <form> already renders (see the 'form' case in
  // renderNode below).
  document.querySelectorAll('[data-pb-form]').forEach(function(form){
    var action  = form.getAttribute('data-action');
    var method  = form.getAttribute('data-method') || 'POST';
    var asJson  = form.getAttribute('data-json') === '1';
    var successMsg = form.getAttribute('data-success') || 'Thanks!';
    var errorMsg   = form.getAttribute('data-error') || 'Something went wrong.';
    var statusEl = form.querySelector('.pb-form-status');
    form.addEventListener('submit', function(e){
      e.preventDefault();
      if (!action) return;
      var fd = new FormData(form);
      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      fetch(action, {
        method: method,
        headers: asJson ? { 'Content-Type': 'application/json', 'Accept': 'application/json' } : { 'Accept': 'application/json' },
        body: asJson ? JSON.stringify(Object.fromEntries(fd.entries())) : fd
      }).then(function(res){
        if (statusEl) {
          statusEl.style.display = 'block';
          statusEl.textContent = res.ok ? successMsg : errorMsg;
          statusEl.style.color = res.ok ? '#16a34a' : '#dc2626';
        }
        if (res.ok) form.reset();
      }).catch(function(){
        if (statusEl) {
          statusEl.style.display = 'block';
          statusEl.textContent = errorMsg;
          statusEl.style.color = '#dc2626';
        }
      }).finally(function(){
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  });
})();
</script>`

// ─── Custom JS (user-authored, per-node + page-wide) ───────────────────────
// Deliberately a SEPARATE <script> block from INTERACTIVE_SCRIPT above —
// INTERACTIVE_SCRIPT is internal machinery for Tabs/Carousel/Accordion/
// Form/animations, entirely generated by this file; Custom JS is content
// the user actually WROTE, so it's kept in its own clearly-delineated
// block rather than interleaved with generated code, making it easy for
// anyone reading "View Source" on the exported page to find exactly what
// they typed. Same execution model as CustomJsRunner.tsx (Preview) — see
// the doc comment at the top of customJs.ts for the full rundown (per-node
// scripts get `el` bound to their own element via the same cc-<id>
// wrapper class; the page-wide script gets no `el`). escapeScriptClose
// (customJs.ts) prevents a literal "</script" anywhere in the user's code
// from prematurely closing this real <script> tag as far as the HTML
// parser is concerned.
function buildCustomJsScript(nodes: NodeMap, globalCustomJs: string | undefined): string {
  const parts: string[] = []

  if (globalCustomJs?.trim()) {
    parts.push(`try {\n${escapeScriptClose(globalCustomJs)}\n} catch (err) { console.error('[Custom JS] page-wide script error:', err); }`)
  }

  for (const id in nodes) {
    const node = nodes[id]
    if (!hasCustomJs(node)) continue
    const code = escapeScriptClose(node.props.customJs as string)
    const c = wrapperClassFor(id)
    parts.push(`(function(){
  var el = document.querySelector('.${c}');
  if (!el) return;
  try {
    (function(el){
${code}
    }).call(el, el);
  } catch (err) {
    console.error('[Custom JS] error in block ${id}:', err);
  }
})();`)
  }

  if (parts.length === 0) return ''
  return `<script>\n${parts.join('\n\n')}\n</script>`
}

// ─── Responsive rich-text content (Text/Heading) ───────────────────────────
// Text/Heading store their content as a fully independent snapshot per
// breakpoint (see richTextResponsive.ts — content/contentTablet/
// contentMobile, full-STRING replacement rather than a mergeable style
// object — see the doc comment there for why). Every other responsive
// property in this file lives happily in ONE CSS class with different
// @media declaration sets (see emitResponsiveRule above) — but a single
// class can't hold three different pieces of TEXT the way it can hold
// three different declaration sets. So, uniquely among everything else
// exported here: a node with a genuine content override becomes up to
// THREE real DOM elements, one per breakpoint's resolved snapshot, with
// CSS controlling which one is visible at which width. A node with no
// override at all (the overwhelming majority) still renders as exactly
// ONE element — zero extra bytes, byte-identical to before this feature
// existed.

interface ContentTriple { desktop: string; tablet: string; mobile: string; hasOverride: boolean }

function resolveContentTriple(node: PageNode, prop: string): ContentTriple {
  const desktop = resolveContentForBreakpoint(node, prop, 'desktop')
  const tablet  = resolveContentForBreakpoint(node, prop, 'tablet')
  const mobile  = resolveContentForBreakpoint(node, prop, 'mobile')
  return { desktop, tablet, mobile, hasOverride: !(desktop === tablet && tablet === mobile) }
}

// Emits the three-way show/hide CSS for a content-overridden node's wrapper
// class — one BAND per breakpoint, using the exact same 768px/390px
// cutoffs every other responsive rule in this file already uses. This is
// intentionally band-based ("Desktop's copy is visible above 768px, full
// stop") rather than "show if this exact breakpoint has its own override"
// — that keeps exactly one of the three elements visible at any given
// width regardless of which specific breakpoint(s) do or don't have their
// own override (e.g. only a Mobile override set, no Tablet override: the
// Desktop copy still correctly covers the Tablet band via this banding,
// since resolveContentTriple's own fallback chain already folded Tablet's
// resolved value down to Desktop's before we ever get here).
function buildContentVisibilityCss(wrapCls: string): string {
  return [
    `.${wrapCls}-d{display:block}`,
    `@media (max-width:768px){.${wrapCls}-d{display:none}}`,
    `.${wrapCls}-t{display:none}`,
    `@media (max-width:768px){.${wrapCls}-t{display:block}}`,
    `@media (max-width:390px){.${wrapCls}-t{display:none}}`,
    `.${wrapCls}-m{display:none}`,
    `@media (max-width:390px){.${wrapCls}-m{display:block}}`,
  ].join('\n')
}

// ─── Per-node CSS (style + animation + hover-transition + hover + custom CSS) ──

function collectStyleCss(nodes: NodeMap, rootId: string): string {
  const parts: string[] = []

  for (const id in nodes) {
    const node = nodes[id]
    const c = wrapperClassFor(id)

    if (node.type === 'section') {
      // Mirrors useRootAdjustedStyle in nodeComponents.tsx — the root
      // Section's own outer padding/gap is stripped (the page shell
      // already handles outer spacing), same rule at every breakpoint.
      const adjust = (s: StyleProps): StyleProps => id === rootId
        ? { ...s, px: undefined, py: undefined, pt: undefined, pb: undefined, pl: undefined, pr: undefined, gap: undefined }
        : s

      const dS = adjust(resolveStyleForBreakpoint(node, 'desktop'))
      const tS = adjust(resolveStyleForBreakpoint(node, 'tablet'))
      const mS = adjust(resolveStyleForBreakpoint(node, 'mobile'))

      // SectionPreview merges a minHeight:64 fallback on TOP of
      // buildSectionOuterStyle's own output — replicated here per
      // breakpoint, since minHeight itself can cascade too.
      const withMinHeight = (s: StyleProps): CSSProperties => ({
        ...buildSectionOuterStyle(s),
        minHeight: typeof s.minHeight === 'number' ? s.minHeight : 64,
      })
      parts.push(emitResponsiveRule(`.${c}`, withMinHeight(dS), withMinHeight(tS), withMinHeight(mS)))

      const innerCls = `${c}-in`
      parts.push(emitResponsiveRule(`.${innerCls}`, buildSectionInnerStyle(dS), buildSectionInnerStyle(tS), buildSectionInnerStyle(mS)))
    } else if (node.type !== 'avatar' && node.type !== 'spacer') {
      // Avatar/Spacer don't call useNodeStyle/buildInlineStyle in the live
      // renderer at all (they size themselves off node.props directly) —
      // so there's no base style CSS to emit for them here either; they
      // still get animation/hover/custom-CSS rules below same as anything
      // else, just no responsive style block.
      const dS = resolveStyleForBreakpoint(node, 'desktop')
      const tS = resolveStyleForBreakpoint(node, 'tablet')
      const mS = resolveStyleForBreakpoint(node, 'mobile')
      parts.push(emitResponsiveRule(`.${c}`, buildInlineStyle(dS), buildInlineStyle(tS), buildInlineStyle(mS)))
    }

    // Content-override visibility bands — see the doc comment on
    // buildContentVisibilityCss above. Only Text/Heading ever have a
    // `content` prop in the first place; every other node type's
    // resolveContentTriple call would just see three identical empty
    // strings and correctly skip this (hasOverride stays false).
    if (node.type === 'text' || node.type === 'heading') {
      const triple = resolveContentTriple(node, 'content')
      if (triple.hasOverride) parts.push(buildContentVisibilityCss(c))
    }

    const transitionCss = buildTransitionCss(id, node)
    if (transitionCss) parts.push(transitionCss)

    const animCss = buildAnimationCssForNode(id, node)
    if (animCss) parts.push(animCss)

    const hoverCss = compileHoverCss(id, node.props.styleHover as HoverStyleProps | undefined)
    if (hoverCss) parts.push(hoverCss)

    const customCss = compileCustomCss(id, node.props.customCss as string | undefined)
    if (customCss) parts.push(customCss)
  }

  return parts.filter(Boolean).join('\n\n')
}

// ─── HTML body ──────────────────────────────────────────────────────────────
// Every node always gets its wrapperClassFor class on its root element,
// unconditionally — including nodes with no custom CSS/hover/animation at
// all (an unused CSS class costs nothing) — rather than a conditional
// check, since now the class is also how base responsive styling attaches.
// Simpler and can never drift into "class exists in <style> but missing
// from the element" or vice versa.

// Shared input-field styling for exported form fields — kept as one
// literal string constant so every field case below (formInput/
// formTextarea/formSelect) stays visually identical, same instinct as the
// `vc` variant-class lookups already used for button/badge.
const FORM_INPUT_CLASS =
  'w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-violet-400 focus:border-violet-400 transition-colors'

function renderNode(nodeId: string, nodes: NodeMap, rootId: string, depth = 0): string {
  const node = nodes[nodeId]
  if (!node) return ''
  const pad  = '  '.repeat(depth)
  const kids = node.children.map(cid => renderNode(cid, nodes, rootId, depth + 1)).join('\n')
  const wrapCls = wrapperClassFor(nodeId)
  const anim = animAttrs(node)
  // Desktop-resolved style, used ONLY for buildClassName's literal
  // Tailwind-utility output — see the file-header comment for why that
  // part stays desktop-only while everything else is fully responsive.
  const ds = resolveStyleForBreakpoint(node, 'desktop')

  switch (node.type as NodeType) {

    case 'section': {
      const innerCls = `${wrapCls}-in`
      const tS = resolveStyleForBreakpoint(node, 'tablet')
      const mS = resolveStyleForBreakpoint(node, 'mobile')
      const hasBackgroundAny = !!(ds.bgImage || ds.bgGradient || tS.bgImage || tS.bgGradient || mS.bgImage || mS.bgGradient)
      const overlayStyle = buildOverlayStyle(ds.bgOverlay)
      const overlay = overlayStyle
        ? `\n${pad}  <div style="${reactStyleToCssText(overlayStyle)}" aria-hidden="true"></div>`
        : ''
      return `${pad}<section class="${cls(buildClassName(ds, 'w-full relative'), wrapCls)}"${anim}>${overlay}
${pad}  <div class="${cls('w-full', hasBackgroundAny ? 'relative z-10' : '', innerCls)}">
${kids}
${pad}  </div>
${pad}</section>`
    }

    case 'columns':
      return `${pad}<div class="${cls(buildClassName(ds, 'w-full flex flex-row'), wrapCls)}"${anim}>\n${kids}\n${pad}</div>`

    case 'column':
      return `${pad}<div class="${cls(buildClassName(ds, 'flex-1 min-w-0'), wrapCls)}"${anim}>\n${kids}\n${pad}</div>`

    case 'grid':
      return `${pad}<div class="${cls(buildClassName(ds, 'w-full'), wrapCls)}"${anim}>\n${kids}\n${pad}</div>`

    case 'text': {
      const triple = resolveContentTriple(node, 'content')
      if (!triple.hasOverride) {
        return `${pad}<p class="${cls(buildClassName(ds, ''), wrapCls)}"${anim}>${triple.desktop}</p>`
      }
      // See the doc comment on buildContentVisibilityCss above — three
      // real elements, CSS decides which one is visible at which width.
      // `anim` is repeated on all three (not just the visible-by-default
      // one) so that whichever copy actually ends up on screen at a given
      // width still gets its own IntersectionObserver/animation attrs —
      // the underlying keyframe CSS is keyed off the shared `wrapCls`
      // class every copy carries, so this doesn't triple-apply the
      // animation, it just makes sure it's wired up regardless of which
      // element the browser is currently showing.
      return `${pad}<p class="${cls(buildClassName(ds, ''), wrapCls, `${wrapCls}-d`)}"${anim}>${triple.desktop}</p>
${pad}<p class="${cls(buildClassName(ds, ''), wrapCls, `${wrapCls}-t`)}"${anim}>${triple.tablet}</p>
${pad}<p class="${cls(buildClassName(ds, ''), wrapCls, `${wrapCls}-m`)}"${anim}>${triple.mobile}</p>`
    }

    case 'heading': {
      const tag = (node.props.tag as string) || 'h2'
      const triple = resolveContentTriple(node, 'content')
      if (!triple.hasOverride) {
        return `${pad}<${tag} class="${cls(buildClassName(ds, ''), wrapCls)}"${anim}>${triple.desktop}</${tag}>`
      }
      return `${pad}<${tag} class="${cls(buildClassName(ds, ''), wrapCls, `${wrapCls}-d`)}"${anim}>${triple.desktop}</${tag}>
${pad}<${tag} class="${cls(buildClassName(ds, ''), wrapCls, `${wrapCls}-t`)}"${anim}>${triple.tablet}</${tag}>
${pad}<${tag} class="${cls(buildClassName(ds, ''), wrapCls, `${wrapCls}-m`)}"${anim}>${triple.mobile}</${tag}>`
    }

    case 'image': {
      const src = (node.props.src as string) ?? ''
      const alt = (node.props.alt as string) ?? ''
      const hasFixed = typeof ds.width === 'number'
      const base = hasFixed ? 'block' : 'max-w-full block'
      return `${pad}<img src="${esc(src)}" alt="${esc(alt)}" class="${cls(buildClassName(ds, base), wrapCls)}"${anim} />`
    }

    case 'button': {
      const label   = (node.props.label as string) ?? 'Button'
      const href    = (node.props.href as string) ?? '#'
      const variant = (node.props.variant as string) ?? 'solid'
      const vc =
        variant === 'outline' ? 'border-2 border-violet-600 text-violet-600 hover:bg-violet-50' :
        variant === 'ghost'   ? 'text-violet-600 hover:bg-violet-50' :
        'bg-violet-600 text-white hover:bg-violet-700'
      const openInNewTab = !!node.props.openInNewTab
      const targetAttrs = openInNewTab ? ` target="_blank" rel="noopener noreferrer"` : ''
      return `${pad}<a href="${esc(href)}"${targetAttrs} class="${cls(`inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-medium transition-colors text-sm ${vc}`, wrapCls)}"${anim}>${esc(label)}</a>`
    }

    case 'spacer':
      return `${pad}<div class="${wrapCls}"${anim} style="height:${(node.props.height as number) ?? 40}px"></div>`

    case 'divider':
      return `${pad}<hr class="${cls(buildClassName(ds, 'w-full'), wrapCls)}"${anim} />`

    case 'badge': {
      const label   = (node.props.label as string) ?? 'Badge'
      const variant = (node.props.variant as string) ?? 'soft'
      const vc =
        variant === 'solid'   ? 'bg-violet-600 text-white' :
        variant === 'outline' ? 'border border-violet-300 text-violet-700' :
        'bg-violet-100 text-violet-700'
      return `${pad}<span class="${cls(`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${vc}`, wrapCls)}"${anim}>${esc(label)}</span>`
    }

    case 'list': {
      const items      = (node.props.items as string[]) ?? []
      const markerType = (node.props.markerType as string) ?? 'bullet'
      const markers: Record<string, string> = { bullet: '•', check: '✓', arrow: '→' }
      const lis = items.map((text, i) => {
        const marker = markerType === 'number' ? `${i + 1}.` : (markers[markerType] ?? '•')
        return `${pad}  <li class="flex items-start gap-2.5"><span class="shrink-0 text-violet-600 font-medium leading-6">${marker}</span><span class="leading-6">${esc(text)}</span></li>`
      }).join('\n')
      return `${pad}<ul class="${cls(buildClassName(ds, 'space-y-2 list-none'), wrapCls)}"${anim}>\n${lis}\n${pad}</ul>`
    }

    case 'avatar': {
      const src      = (node.props.src as string) ?? ''
      const initials = (node.props.initials as string) ?? '?'
      const size     = (node.props.size as number) ?? 56
      if (src) {
        return `${pad}<img src="${esc(src)}" alt="" class="${cls('rounded-full object-cover shrink-0', wrapCls)}"${anim} style="width:${size}px;height:${size}px" />`
      }
      return `${pad}<div class="${cls('rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-semibold shrink-0 select-none', wrapCls)}"${anim} style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.36)}px">${esc(initials)}</div>`
    }

    case 'quote': {
      const quote  = (node.props.quote as string) ?? ''
      const name   = (node.props.name as string) ?? ''
      const role   = (node.props.role as string) ?? ''
      const avSrc  = (node.props.avatarSrc as string) ?? ''
      const init   = name?.[0] ?? '?'
      const avatar = avSrc
        ? `<img src="${esc(avSrc)}" alt="" class="w-10 h-10 rounded-full object-cover shrink-0" />`
        : `<div class="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-semibold shrink-0">${esc(init)}</div>`
      return `${pad}<div class="${cls(buildClassName(ds, 'flex flex-col gap-4'), wrapCls)}"${anim}>
${pad}  <p class="text-lg leading-relaxed text-neutral-700">"${esc(quote)}"</p>
${pad}  <div class="flex items-center gap-3">
${pad}    ${avatar}
${pad}    <div class="min-w-0"><p class="text-sm font-semibold text-neutral-800 truncate">${esc(name)}</p><p class="text-xs text-neutral-400 truncate">${esc(role)}</p></div>
${pad}  </div>
${pad}</div>`
    }

    case 'video': {
      const raw = (node.props.url as string) ?? ''
      // Same 16/9 fallback VideoRender itself applies when no aspectRatio
      // is set — kept as an explicit inline exception (rather than routed
      // through the generic responsive mechanism) to match that exactly.
      const ratio = (ds.aspectRatio && ds.aspectRatio !== 'auto') ? ds.aspectRatio : '16/9'
      const ytMatch    = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{6,})/)
      const vimeoMatch = raw.match(/vimeo\.com\/(\d+)/)
      const embed =
        ytMatch ? `https://www.youtube.com/embed/${ytMatch[1]}` :
        vimeoMatch ? `https://player.vimeo.com/video/${vimeoMatch[1]}` :
        raw
      if (!embed) {
        return `${pad}<div class="${cls(buildClassName(ds, 'bg-neutral-100 border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center gap-1.5 text-neutral-400 text-sm'), wrapCls)}"${anim} style="aspect-ratio:${ratio};min-height:160px"><span style="font-size:1.25rem">▶</span><span style="font-size:0.75rem;font-weight:500">Paste a YouTube or Vimeo link</span></div>`
      }
      // `allow` attribute matched to VideoRender's own iframe exactly — the
      // exported file previously omitted this entirely, meaning autoplay/
      // encrypted-media/picture-in-picture permissions silently differed
      // from what Preview actually grants the embed.
      return `${pad}<div class="${cls(buildClassName(ds, 'overflow-hidden'), wrapCls)}"${anim} style="aspect-ratio:${ratio}"><iframe src="${esc(embed)}" style="width:100%;height:100%;border:0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
    }

    // ── Accordion ──────────────────────────────────────────────────────
    // Real div/button structure (NOT native <details>/<summary>) so it can
    // exactly match AccordionRender's actual behavior: exactly ONE item
    // open at a time (native <details> elements are independently
    // toggleable — several could be open simultaneously, which is NOT what
    // the live component does), the same 240px max-height cap
    // AccordionRender itself uses, and the rotating "+" icon. Interactivity
    // lives in INTERACTIVE_SCRIPT's accordion block. First item open by
    // default, matching AccordionRender's `useState<number|null>(0)`.
    case 'accordion': {
      const items = (node.props.items as { q: string; a: string }[]) ?? []
      const rows = items.map((item, i) => `${pad}  <div class="pb-acc-item">
${pad}    <button type="button" class="pb-acc-btn w-full flex items-center justify-between gap-4 py-4 text-left">
${pad}      <span class="text-sm font-medium text-neutral-800">${esc(item.q)}</span>
${pad}      <span class="pb-acc-icon shrink-0 text-neutral-400 transition-transform duration-150${i === 0 ? ' rotate-45' : ''}">+</span>
${pad}    </button>
${pad}    <div class="pb-acc-content overflow-hidden transition-all duration-200" style="max-height:${i === 0 ? '240px' : '0px'}">
${pad}      <p class="pb-4 text-sm text-neutral-500 leading-relaxed pr-8">${esc(item.a)}</p>
${pad}    </div>
${pad}  </div>`).join('\n')
      return `${pad}<div class="${cls(buildClassName(ds, 'w-full divide-y divide-neutral-200 border-t border-b border-neutral-200'), wrapCls)}"${anim} data-pb-accordion="1">
${rows}
${pad}</div>`
    }

    // ── Tabs ────────────────────────────────────────────────────────────
    // Header row of real <button>s (labels read straight off each tabpane's
    // `label` prop, same fallback TabHeaderRow itself uses) + one panel div
    // per tabpane, all but the first hidden via inline display:none — an
    // instant swap, matching TabsEditor/TabsPreview exactly (no
    // fade/slide). Switching is wired up in INTERACTIVE_SCRIPT's tabs
    // block via :scope-scoped queries, so nested Tabs-inside-Tabs (however
    // unlikely) can't cross-wire each other's buttons/panels.
    case 'tabs': {
      const paneIds = node.children
      if (paneIds.length === 0) return ''
      const headerBtns = paneIds.map((pid, i) => {
        const pane = nodes[pid]
        const label = (pane?.props.label as string) || `Tab ${i + 1}`
        const activeCls = i === 0 ? 'border-violet-600 text-violet-700' : 'border-transparent text-neutral-500 hover:text-neutral-700'
        return `${pad}    <button type="button" class="pb-tab-btn px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer ${activeCls}">${esc(label)}</button>`
      }).join('\n')
      const panels = paneIds.map((pid, i) => {
        const inner = renderNode(pid, nodes, rootId, depth + 2)
        return `${pad}  <div class="pb-tab-panel" style="display:${i === 0 ? 'block' : 'none'}">
${inner}
${pad}  </div>`
      }).join('\n')
      return `${pad}<div class="${cls(buildClassName(ds, 'w-full'), wrapCls)}"${anim} data-pb-tabs="1">
${pad}  <div class="pb-tab-header flex border-b border-neutral-200 mb-4 gap-1 overflow-x-auto">
${headerBtns}
${pad}  </div>
${panels}
${pad}</div>`
    }

    case 'tabpane':
      return `${pad}<div class="${cls(buildClassName(ds, 'w-full'), wrapCls)}"${anim}>\n${kids}\n${pad}</div>`

    // ── Carousel ────────────────────────────────────────────────────────
    // Same sliding-track technique as buildSlidingTrack in Renderer.tsx:
    // the track is `count * 100%` wide with each slide at `100/count`
    // percent, translateX'd by index — every percentage resolves against a
    // concrete number instead of the circular flex-percentage trap a naive
    // per-slide 100% width would hit. Arrows/dots render only when
    // showArrows/showDots are on AND there's more than one slide, matching
    // CarouselArrows/CarouselDots exactly. Autoplay/loop/pause-on-hover are
    // read off node.props into data attributes and driven by
    // INTERACTIVE_SCRIPT's carousel block, which mirrors CarouselPreview's
    // own re-armed-one-shot-timeout effect (not a single setInterval) so
    // loop/no-loop stopping behavior matches exactly.
    case 'carousel': {
      const slideIds = node.children
      const count = slideIds.length
      if (count === 0) return ''
      const widthPct   = 100 / count
      const showArrows = node.props.showArrows !== false
      const showDots   = node.props.showDots !== false
      const autoplay   = !!node.props.autoplay
      const interval   = (node.props.autoplayInterval as number) ?? 4000
      const loop       = node.props.loop !== false

      const slidesHtml = slideIds.map(sid => {
        const inner = renderNode(sid, nodes, rootId, depth + 2)
        return `${pad}    <div style="width:${widthPct}%;flex-shrink:0;min-width:0">
${inner}
${pad}    </div>`
      }).join('\n')

      const arrowsHtml = (showArrows && count > 1) ? `
${pad}  <button type="button" class="pb-car-prev absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center text-neutral-700 text-sm transition-colors" aria-label="Previous slide">‹</button>
${pad}  <button type="button" class="pb-car-next absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center text-neutral-700 text-sm transition-colors" aria-label="Next slide">›</button>` : ''

      const dotsHtml = (showDots && count > 1) ? `
${pad}  <div class="pb-car-dots absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
${slideIds.map((_, i) => `${pad}    <button type="button" class="pb-car-dot w-2 h-2 rounded-full transition-colors ${i === 0 ? 'bg-white' : 'bg-white/50 hover:bg-white/80'}" aria-label="Go to slide ${i + 1}"></button>`).join('\n')}
${pad}  </div>` : ''

      return `${pad}<div class="${cls(buildClassName(ds, 'w-full relative overflow-hidden'), wrapCls)}"${anim} data-pb-carousel="1" data-count="${count}" data-autoplay="${autoplay ? '1' : '0'}" data-autoplay-interval="${interval}" data-loop="${loop ? '1' : '0'}">
${pad}  <div class="pb-car-track flex" style="width:${count * 100}%;transform:translateX(0%);transition:transform 450ms ease">
${slidesHtml}
${pad}  </div>${arrowsHtml}${dotsHtml}
${pad}</div>`
    }

    case 'slide':
      return `${pad}<div class="${cls(buildClassName(ds, 'w-full'), wrapCls)}"${anim}>\n${kids}\n${pad}</div>`

    // ── Form ────────────────────────────────────────────────────────────
    // A real <form> with the destination/method/JSON-vs-multipart choice
    // and the success/error message text baked into data-* attributes,
    // read by INTERACTIVE_SCRIPT's forms block at runtime (see the doc
    // comment there) — mirrors FormPreview's handleSubmit in
    // formNodes.tsx exactly, just as plain JS instead of a React handler.
    // The trailing <p class="pb-form-status"> is the single place the
    // script swaps in the success/error text; hidden by default via an
    // inline style so it costs nothing visually until a submission
    // actually resolves.
    case 'form': {
      const action         = (node.props.action as string) || ''
      const method         = ((node.props.method as string) || 'POST').toUpperCase()
      const asJson         = node.props.submitAsJson ? '1' : '0'
      const successMessage = (node.props.successMessage as string) || 'Thanks! Your submission has been received.'
      const errorMessage   = (node.props.errorMessage as string) || 'Something went wrong — please try again.'
      return `${pad}<form class="${cls(buildClassName(ds, 'w-full'), wrapCls)}"${anim} novalidate data-pb-form="1" data-action="${esc(action)}" data-method="${esc(method)}" data-json="${asJson}" data-success="${esc(successMessage)}" data-error="${esc(errorMessage)}">
${kids}
${pad}  <p class="pb-form-status text-sm mt-2" style="display:none"></p>
${pad}</form>`
    }

    // ── Form fields ─────────────────────────────────────────────────────
    // Each renders a real, natively-named form control so the browser's
    // own FormData serialization (read by INTERACTIVE_SCRIPT's forms
    // block) picks it up with zero extra wiring — same "let the platform
    // do it" instinct FormInputPreview/etc. already use in formNodes.tsx.
    case 'formInput': {
      const fieldName = esc((node.props.fieldName as string) || 'field')
      const label     = (node.props.label as string) || ''
      const inputType = (node.props.inputType as string) || 'text'
      const required  = node.props.required ? ' required' : ''
      return `${pad}<label class="${cls('flex flex-col gap-1.5', wrapCls)}"${anim}>
${label ? `${pad}  <span class="text-sm font-medium text-neutral-700">${esc(label)}${node.props.required ? ' <span class="text-red-500">*</span>' : ''}</span>` : ''}
${pad}  <input type="${esc(inputType)}" name="${fieldName}" placeholder="${esc((node.props.placeholder as string) || '')}"${required} class="${FORM_INPUT_CLASS}" />
${pad}</label>`
    }

    case 'formTextarea': {
      const fieldName = esc((node.props.fieldName as string) || 'message')
      const label     = (node.props.label as string) || ''
      const rows      = (node.props.rows as number) ?? 4
      const required  = node.props.required ? ' required' : ''
      return `${pad}<label class="${cls('flex flex-col gap-1.5', wrapCls)}"${anim}>
${label ? `${pad}  <span class="text-sm font-medium text-neutral-700">${esc(label)}${node.props.required ? ' <span class="text-red-500">*</span>' : ''}</span>` : ''}
${pad}  <textarea name="${fieldName}" rows="${rows}" placeholder="${esc((node.props.placeholder as string) || '')}"${required} class="${FORM_INPUT_CLASS} resize-y"></textarea>
${pad}</label>`
    }

    case 'formSelect': {
      const fieldName = esc((node.props.fieldName as string) || 'field')
      const label     = (node.props.label as string) || ''
      const options   = (node.props.options as string[]) ?? ['Option 1', 'Option 2']
      const required  = node.props.required ? ' required' : ''
      const opts = options.map(o => `${pad}    <option value="${esc(o)}">${esc(o)}</option>`).join('\n')
      return `${pad}<label class="${cls('flex flex-col gap-1.5', wrapCls)}"${anim}>
${label ? `${pad}  <span class="text-sm font-medium text-neutral-700">${esc(label)}${node.props.required ? ' <span class="text-red-500">*</span>' : ''}</span>` : ''}
${pad}  <select name="${fieldName}"${required} class="${FORM_INPUT_CLASS}">
${opts}
${pad}  </select>
${pad}</label>`
    }

    case 'formCheckbox': {
      const fieldName = esc((node.props.fieldName as string) || 'field')
      const label     = (node.props.label as string) || 'Checkbox label'
      const required  = node.props.required ? ' required' : ''
      return `${pad}<label class="${cls('flex items-center gap-2', wrapCls)}"${anim}>
${pad}  <input type="checkbox" name="${fieldName}" value="on" class="w-4 h-4 accent-violet-600"${required} />
${pad}  <span class="text-sm text-neutral-700">${esc(label)}${node.props.required ? ' <span class="text-red-500">*</span>' : ''}</span>
${pad}</label>`
    }

    case 'formSubmit': {
      const label   = (node.props.label as string) || 'Submit'
      const variant = (node.props.variant as string) || 'solid'
      const vc =
        variant === 'outline' ? 'border-2 border-violet-600 text-violet-600 hover:bg-violet-50' :
        variant === 'ghost'   ? 'text-violet-600 hover:bg-violet-50' :
        'bg-violet-600 text-white hover:bg-violet-700'
      return `${pad}<button type="submit" class="${cls(`inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-medium transition-colors text-sm ${vc}`, wrapCls)}"${anim}>${esc(label)}</button>`
    }

    default:
      return ''
  }
}

// ─── SEO → real <head> tags ─────────────────────────────────────────────────

function buildSeoHead(seo: SeoSettings): string {
  const lines: string[] = []
  if (seo.description) lines.push(`<meta name="description" content="${esc(seo.description)}" />`)
  if (seo.keywords)    lines.push(`<meta name="keywords" content="${esc(seo.keywords)}" />`)
  if (seo.noIndex)     lines.push(`<meta name="robots" content="noindex, nofollow" />`)
  if (seo.canonicalUrl) lines.push(`<link rel="canonical" href="${esc(seo.canonicalUrl)}" />`)
  if (seo.favicon)      lines.push(`<link rel="icon" href="${esc(seo.favicon)}" />`)

  const ogTitle = seo.ogTitle || seo.title
  const ogDesc  = seo.ogDescription || seo.description
  lines.push(`<meta property="og:type" content="website" />`)
  if (ogTitle) lines.push(`<meta property="og:title" content="${esc(ogTitle)}" />`)
  if (ogDesc)  lines.push(`<meta property="og:description" content="${esc(ogDesc)}" />`)
  if (seo.ogImage) lines.push(`<meta property="og:image" content="${esc(seo.ogImage)}" />`)
  if (ogTitle) lines.push(`<meta name="twitter:card" content="summary_large_image" />`)

  return lines.join('\n  ')
}

// ─── Assemble ─────────────────────────────────────────────────────────────

export interface ExportOptions {
  title?:           string
  globalCustomCss?: string
  // See customJs.ts — embedded as its own <script> block, separate from
  // INTERACTIVE_SCRIPT (which is internal machinery for Tabs/Carousel/
  // Accordion/Form; Custom JS is user-authored content, kept in its own
  // clearly-delineated block instead — see buildCustomJsScript below).
  globalCustomJs?:  string
  globalColors?:    GlobalColor[]
  seo?:             SeoSettings
  // Locale the page was authored in — drives `<html lang dir>` so a Farsi
  // page exports RTL instead of always exporting as LTR English regardless
  // of the builder's own language setting. Optional/defaulted to 'en' so
  // any existing caller that hasn't been updated to pass this still works
  // exactly as before.
  locale?:          'en' | 'fa'
}

export function exportToHtml(nodes: NodeMap, rootId: string, opts: ExportOptions = {}): string {
  // Global colors are resolved to real hex HERE, at export time, via the
  // same module-level cache Renderer.tsx feeds live (see
  // setGlobalColorPalette in styleMapper.ts) — the exported file has no
  // store to read from later, so every `global:<id>` reference needs to be
  // baked into a literal value now, once, up front.
  setGlobalColorPalette(opts.globalColors ?? [])

  const body     = renderNode(rootId, nodes, rootId, 1)
  const styleCss = collectStyleCss(nodes, rootId)
  const globalCss = opts.globalCustomCss?.trim() ?? ''
  const needsInteractiveScript = /data-pb-(animate|accordion|tabs|carousel|form)/.test(body)
  // See buildCustomJsScript's own doc comment above — a page with no
  // Custom JS anywhere (the common case) gets an empty string here and
  // pays nothing extra in the output.
  const customJsScript = buildCustomJsScript(nodes, opts.globalCustomJs)

  // BUG FIX: the exported CSS references `animation-name: pb-fade-in-up`
  // etc. (see buildAnimationCssForNode above) and the JS toggles a
  // `pb-play` class to trigger it — but neither of those means anything
  // without the actual `@keyframes pb-fade-in-up { ... }` DEFINITIONS
  // somewhere in the document. Those live in ANIMATION_KEYFRAMES
  // (animations.ts) — the same constant AnimationStyleSheet injects for
  // the live Editor/Preview via a plain <style> tag — and were previously
  // never included in the exported HTML at all. A browser given an
  // animation-name with no matching @keyframes anywhere just silently
  // no-ops the animation: no error, nothing in the console, the element
  // simply never transitions. Combined with STARTS_HIDDEN's opacity:0
  // (applied up front so there's no flash-of-visible-content before the
  // animation plays), the element was left stuck invisible FOREVER —
  // "the element is not shown" is exactly what a permanently-inert
  // animation-name looks like, not merely "doesn't animate".
  // Only included when at least one node actually uses an animation
  // (same detection needsInteractiveScript already does, narrowed to just
  // the animate marker) — a page with no animations pays nothing extra.
  const needsAnimationKeyframes = /data-pb-animate/.test(body)
  const styleBlock = [globalCss, needsAnimationKeyframes ? ANIMATION_KEYFRAMES : '', styleCss].filter(Boolean).join('\n\n')

  // BUG FIX: the exported CSS references `animation-name: pb-fade-in-up`
  // etc. (see buildAnimationCssForNode above) and the JS toggles a
  // `pb-play` class to trigger it — but neither of those means anything
  // without the actual `@keyframes pb-fade-in-up { ... }` DEFINITIONS
  // somewhere in the document. Those live in ANIMATION_KEYFRAMES
  // (animations.ts) — the same constant AnimationStyleSheet injects for
  // the live Editor/Preview via a plain <style> tag — and were previously
  // never included in the exported HTML at all. A browser given an
  // animation-name with no matching @keyframes anywhere just silently
  // no-ops the animation: no error, nothing in the console, the element
  // simply never transitions. Combined with STARTS_HIDDEN's opacity:0
  // (applied up front so there's no flash-of-visible-content before the
  // animation plays), the element was left stuck invisible FOREVER —
  // "the element is not shown" is exactly what a permanently-inert
  // animation-name looks like, not merely "doesn't animate".
  // Only included when at least one node actually uses an animation
  // (same detection needsInteractiveScript already does, narrowed to just
  // the animate marker) — a page with no animations pays nothing extra.
  const needsAnimationKeyframes = /data-pb-animate/.test(body)
  const styleBlock = [globalCss, needsAnimationKeyframes ? ANIMATION_KEYFRAMES : '', styleCss].filter(Boolean).join('\n\n')

  const locale = opts.locale ?? 'en'
  const dir    = locale === 'fa' ? 'rtl' : 'ltr'

  // Persian typography: the exported page needs the SAME Google Fonts the
  // live editor/Preview loaded on demand via ensurePersianFontsLoaded (see
  // richText.ts) — a standalone HTML file has no store/effect of its own
  // to trigger that lazily, so it's baked into <head> up front instead,
  // gated on the page's own locale exactly like `dir`/`lang` above. An
  // English-language export never pays for fonts it never uses. The two
  // <link rel="preconnect"> tags are the standard Google Fonts performance
  // hint (opens the connection to fonts.gstatic.com early, before the
  // stylesheet response even tells the browser it needs to).
  const persianFontsHead = locale === 'fa'
    ? `<link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="${buildPersianGoogleFontsHref()}" />`
    : ''

  const seo = opts.seo ?? {}
  const pageTitle = seo.title || opts.title || 'Exported Page'
  const seoHead = buildSeoHead(seo)

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(pageTitle)}</title>
  ${seoHead}
  ${persianFontsHead}
  <!--
    Layout/fit utility classes (w-full, object-cover, etc.) load via the
    Tailwind CDN. Every color, spacing, typography, border, effect,
    visibility, and responsive (Tablet/Mobile) value below is real CSS
    generated from the same style-resolution functions the live editor and
    Preview use (see styleMapper.ts / responsive.ts) — this file mirrors
    Preview directly instead of duplicating that logic by hand. Tabs,
    Carousel, Accordion, and Form get real interactive HTML/CSS/vanilla-JS
    (see INTERACTIVE_SCRIPT) instead of React, so they behave the same as
    Preview with zero framework runtime.
  -->
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
${styleBlock}
  </style>
</head>
<body>
${body}
${needsInteractiveScript ? INTERACTIVE_SCRIPT : ''}
${customJsScript}
</body>
</html>`
}

export function downloadHtml(nodes: NodeMap, rootId: string, filename = 'page.html', opts: ExportOptions = {}): void {
  const blob = new Blob([exportToHtml(nodes, rootId, opts)], { type: 'text/html' })
  triggerDownload(blob, filename)
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}