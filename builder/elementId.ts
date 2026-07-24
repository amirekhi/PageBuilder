import { PageNode } from './types'

// A user-assignable HTML `id` attribute — completely separate from the
// automatic `cc-<nodeId>` class Custom CSS/hover styles use internally
// (see customCss.ts). That class is an internal implementation detail for
// scoping generated CSS, not something meant to be chosen or typed by a
// user. This is the "real" id: meant for in-page anchor links (a Button's
// href set to "#pricing" needs some element on the page to actually carry
// id="pricing"), and as a stable hook for anyone attaching their own
// external JS/analytics to a specific block later.
export function elementId(node: PageNode): string | undefined {
  const raw = node.props.htmlId as string | undefined
  return raw && raw.trim() ? raw.trim() : undefined
}

// Sanitizes the Element ID field as the user types — strips anything that
// isn't a safe HTML id character and collapses whitespace to hyphens, so
// what's stored is always immediately usable both as a real DOM id
// attribute and as a "#id" href on some OTHER block, with no need for the
// user to know HTML id rules themselves.
export function sanitizeElementId(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '')
}