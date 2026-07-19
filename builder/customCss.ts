import { PageNode } from './types'
import { resolveColor, SHADOW_CSS } from './styleMapper'

// The class every node with custom CSS OR hover styles gets, so both the
// user's {{WRAPPER}} token in Custom CSS and the auto-generated hover rule
// (see compileHoverCss below) resolve to something that ONLY ever matches
// this one block, never any other node using the same node TYPE elsewhere
// on the page. Deterministic from the node's own id, so it survives
// re-renders without needing to be stored anywhere separately.
export function wrapperClassFor(nodeId: string): string {
  return `cc-${nodeId}`
}

// Deliberately a SMALL, curated subset — not the full StyleProps. Hover
// effects are almost always about interactive FEEDBACK (color/opacity/
// shadow), not layout. Width/height/padding/margin/font-size are excluded
// on purpose: those cause visible layout jank on hover (things jump), and
// anyone who genuinely wants that has the full Custom CSS field already —
// this is for the common 90% case with real structured UI instead of
// requiring hand-written CSS for something this simple.
export interface HoverStyleProps {
  bgColor?:     string
  bgGradient?:  string // CSS linear-gradient(...) string, same format as StyleProps.bgGradient
  textColor?:   string
  borderColor?: string
  opacity?:     number // 0-100, same scale as the base StyleProps.opacity
  shadow?:      'none'|'sm'|'md'|'lg'|'xl'|'2xl'
}

function hasHoverStyles(node: PageNode): boolean {
  const hover = node.props.styleHover as HoverStyleProps | undefined
  return !!hover && Object.values(hover).some(v => v !== undefined)
}

// Returns the class to actually add to a node's rendered className, or ''
// if the node has neither custom CSS nor hover styles — so call sites can
// safely do `buildClassName(s, [existingExtra, customCssClass(node)].filter(Boolean).join(' '))`
// with zero cost for the (vast majority of) nodes that never use either.
// Widened to also fire for hover styles (not just customCss) so the SAME
// wrapper class serves both features — a node with hover styles set but no
// Custom CSS text still needs the class for its auto-generated hover rule
// (compileHoverCss below) to have something to attach to.
export function customCssClass(node: PageNode): string {
  const hasCustom = !!(node.props.customCss as string)
  return (hasCustom || hasHoverStyles(node)) ? wrapperClassFor(node.id) : ''
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

// Compiles a node's structured hover styles into a real `.cc-<id>:hover { }`
// rule — reuses the exact same color/shadow resolution styleMapper already
// uses for the base (non-hover) styles, so a hover color picked from the
// same preset swatches renders identically to picking that color normally.
//
// IMPORTANT: every declaration here needs !important. The base (Normal)
// value for these same properties is applied as an INLINE style on the
// element (via buildInlineStyle in styleMapper), and inline styles always
// beat class-based rules in the cascade regardless of selector specificity
// — a plain `.cc-id:hover { background-color: ... }` can never override
// `style="background-color: ..."` on the same element. Without
// !important, setting a Normal background color permanently blocks the
// hover background color from ever showing. This is the ONLY rule ever
// written for this selector, so !important here is safe and doesn't fight
// anything else.
export function compileHoverCss(nodeId: string, hover: HoverStyleProps | undefined): string {
  if (!hover) return ''
  const decls: string[] = []

  const bg = resolveColor(hover.bgColor)
  if (bg) decls.push(`background-color: ${bg} !important`)
  if (hover.bgGradient) decls.push(`background-image: ${hover.bgGradient} !important`)
  const fg = resolveColor(hover.textColor)
  if (fg) decls.push(`color: ${fg} !important`)
  const bd = resolveColor(hover.borderColor)
  if (bd) decls.push(`border-color: ${bd} !important`)
  if (hover.opacity !== undefined) decls.push(`opacity: ${hover.opacity / 100} !important`)
  if (hover.shadow && hover.shadow !== 'none') decls.push(`box-shadow: ${SHADOW_CSS[hover.shadow]} !important`)

  if (decls.length === 0) return ''
  return `.${wrapperClassFor(nodeId)}:hover {\n  ${decls.join(';\n  ')};\n}`
}

// Merges into a node's base inline style whenever it has ANY hover styles
// set, so the hover transition actually animates smoothly instead of
// snapping instantly — a plain `transition: all` is deliberately avoided
// (it would also animate layout properties if anything else ever changes
// them, causing unrelated jank); this lists only the 5 properties hover
// can actually touch.
export function buildHoverTransitionStyle(node: PageNode): React.CSSProperties {
  if (!hasHoverStyles(node)) return {}
  return {
    transition: 'background-color 150ms ease, color 150ms ease, border-color 150ms ease, opacity 150ms ease, box-shadow 150ms ease',
  }
}