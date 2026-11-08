'use client'

// Everything the AI writes passes through here before it reaches the store.
// Text `content` is rendered with dangerouslySetInnerHTML (TextPreview /
// HeadingPreview) and written RAW into exported HTML, so HTML must be
// sanitized; URLs must be constrained so a prompt-injected page can't smuggle
// in javascript: links or arbitrary data: payloads.

import DOMPurify from 'dompurify'
import { COLOR_NAMES, ALLOWED_IMAGES, imageUrl } from './catalog'

const INLINE_HTML = {
  ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'u', 's', 'a', 'br', 'span', 'mark', 'code'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
}

export function cleanHtml(v: unknown, max = 2000): string {
  if (typeof v !== 'string') return ''
  return String(DOMPurify.sanitize(v.slice(0, max), INLINE_HTML)).trim()
}

// Plain text: strips tags and control characters. React escapes it on render
// and the HTML exporter runs esc() on it, so no further encoding is needed.
export function cleanText(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max)
}

export function cleanHref(v: unknown): string {
  if (typeof v !== 'string') return '#'
  const href = v.trim().slice(0, 500)
  if (!href) return '#'
  if (href.startsWith('#') || href.startsWith('/')) return href
  if (/^(https?:\/\/|mailto:|tel:)/i.test(href)) return href
  return '#'
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

// '' (clear) is a legal result. Unknown Unsplash ids are replaced with a known
// good photo, chosen deterministically so the same bad URL always maps to the
// same replacement.
export function cleanImage(v: unknown): string {
  if (typeof v !== 'string') return ''
  const url = v.trim().slice(0, 600)
  if (!url) return ''
  if (url.startsWith('/media/')) return url
  if (!/^https:\/\//i.test(url)) return ''
  try {
    const u = new URL(url)
    if (u.hostname === 'images.unsplash.com') {
      const m = u.pathname.match(/photo-([0-9a-zA-Z-]+)/)
      const known = m && ALLOWED_IMAGES.some(i => i.id === m[1])
      return known ? url : imageUrl(ALLOWED_IMAGES[hash(url) % ALLOWED_IMAGES.length].id)
    }
    return url
  } catch {
    return ''
  }
}

export function cleanVideo(v: unknown): string {
  if (typeof v !== 'string') return ''
  const url = v.trim().slice(0, 300)
  return /^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\//i.test(url) ? url : ''
}

export function cleanFieldName(v: unknown): string {
  if (typeof v !== 'string') return ''
  return v.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)
}

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export function cleanColor(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const c = v.trim()
  if ((COLOR_NAMES as readonly string[]).includes(c)) return c
  return HEX_RE.test(c) ? c : undefined
}

export function cleanGradient(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const g = v.trim()
  if (g.length > 200) return undefined
  return /^linear-gradient\([#a-zA-Z0-9\s,.%()-]+\)$/.test(g) ? g : undefined
}
