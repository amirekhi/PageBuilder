'use client'
import { useMemo } from 'react'
import { useBuilderStore } from './store'
import { compileCustomCss } from './customCss'

// Mounted once in BOTH EditorRenderer and PreviewRenderer (see Renderer.tsx)
// — same principle as AnimationStyleSheet: a single reactive <style> tag
// collecting every node's compiled custom CSS plus the page-level global
// CSS, so typing in a Custom CSS field updates the live view immediately in
// whichever mode is currently mounted.
export function CustomCssStyleSheet() {
  const nodes = useBuilderStore(s => s.nodes)
  const globalCss = useBuilderStore(s => s.globalCustomCss)

  const css = useMemo(() => {
    const parts: string[] = []
    if (globalCss?.trim()) parts.push(globalCss)
    for (const id in nodes) {
      const compiled = compileCustomCss(id, nodes[id].props.customCss as string | undefined)
      if (compiled) parts.push(compiled)
    }
    return parts.join('\n\n')
  }, [nodes, globalCss])

  if (!css) return null
  // eslint-disable-next-line react/no-danger
  return <style dangerouslySetInnerHTML={{ __html: css }} />
}