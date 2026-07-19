'use client'
import { useMemo } from 'react'
import { useBuilderStore } from './store'
import { compileCustomCss, compileHoverCss } from './customCss'

export function CustomCssStyleSheet() {
  const nodes = useBuilderStore(s => s.nodes)
  const globalCss = useBuilderStore(s => s.globalCustomCss)

  const css = useMemo(() => {
    const parts: string[] = []
    if (globalCss?.trim()) parts.push(globalCss)
    for (const id in nodes) {
      const node = nodes[id]
      const compiled = compileCustomCss(id, node.props.customCss as string | undefined)
      if (compiled) parts.push(compiled)
      const hoverCompiled = compileHoverCss(id, node.props.styleHover as any)
      if (hoverCompiled) parts.push(hoverCompiled)
    }
    return parts.join('\n\n')
  }, [nodes, globalCss])

  if (!css) return null
  // eslint-disable-next-line react/no-danger
  return <style dangerouslySetInnerHTML={{ __html: css }} />
}