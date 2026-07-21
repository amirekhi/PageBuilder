export type LinkType = 'relative' | 'absolute'

// Turns a raw, user-typed href plus the chosen link TYPE into the actual
// string that belongs in a real href attribute. Absolute links get
// `https://` prepended automatically if the user left off a protocol (so
// typing just "example.com" still produces a working, clickable link
// instead of a browser-relative dead link like "/example.com"). Relative
// links (in-page anchors like "#pricing", or same-site paths like
// "/about") are used completely as typed — auto-prefixing anything there
// would break exactly the two most common relative-link use cases.
export function resolveHref(rawHref: string | undefined, linkType: LinkType = 'relative'): string {
  const href = (rawHref ?? '').trim()
  if (!href) return '#'
  if (
    linkType === 'absolute' &&
    !/^https?:\/\//i.test(href) &&
    !href.startsWith('mailto:') &&
    !href.startsWith('tel:')
  ) {
    return `https://${href}`
  }
  return href
}