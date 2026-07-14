import { PageNode } from './types'

// The class every node with custom CSS gets, so the user's {{WRAPPER}}
// token in their CSS resolves to something that ONLY ever matches this one
// block, never any other node using the same node TYPE elsewhere on the
// page. Deterministic from the node's own id, so it survives re-renders
// without needing to be stored anywhere separately.
export function wrapperClassFor(nodeId: string): string {
  return `cc-${nodeId}`
}

// Returns the class to actually add to a node's rendered className, or ''
// if the node has no custom CSS at all — so call sites can safely do
// `buildClassName(s, [existingExtra, customCssClass(node)].filter(Boolean).join(' '))`
// with zero cost for the (vast majority of) nodes that never use this.
export function customCssClass(node: PageNode): string {
  return (node.props.customCss as string) ? wrapperClassFor(node.id) : ''
}

// Compiles one node's raw CSS text into real, scoped CSS by replacing every
// {{WRAPPER}} token with `.cc-<nodeId>`. This is a plain string substitution
// — deliberately NOT a CSS parser/validator. Malformed CSS just fails
// silently in the browser (a rule the browser can't parse is simply
// ignored), the same as it would in any other <style> tag; there's nothing
// here that can execute as script, so this is safe to inject via
// dangerouslySetInnerHTML on a <style> tag.
export function compileCustomCss(nodeId: string, raw: string | undefined): string {
  if (!raw || !raw.trim()) return ''
  const selector = `.${wrapperClassFor(nodeId)}`
  return raw.split('{{WRAPPER}}').join(selector)
}