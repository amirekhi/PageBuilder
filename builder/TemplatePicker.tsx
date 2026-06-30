'use client'

import React, { useState } from 'react'
import { TEMPLATES } from './templates'
import { useBuilderStore } from './store'
import { NodeMap } from './types'

// ─── Hook: insert a template's nodes under root ───────────────────────────────

function useInsertTemplate() {
  const store = useBuilderStore()

  return function insertTemplate(index: number) {
    const template = TEMPLATES[index]
    if (!template) return

    const { nodes: builtNodes, rootChildId } = template.build()

    // We need to graft builtNodes into the global store.
    // Use a raw set so we can batch everything in one immer pass.
    useBuilderStore.setState(prev => {
      // Deep-clone prev nodes to avoid mutation
      const next: NodeMap = JSON.parse(JSON.stringify(prev.nodes))

      // Push history first
      const snap = JSON.parse(JSON.stringify(prev.nodes))
      const newPast = [snap, ...prev.past].slice(0, 50)

      // Merge template nodes
      Object.values(builtNodes).forEach(n => {
        next[n.id] = { ...n }
      })

      // Attach root section to canvas root
      const rootNode = next[prev.rootId]
      const insertAt = rootNode.children.length
      rootNode.children.splice(insertAt, 0, rootChildId)
      next[rootChildId].parentId = prev.rootId

      return {
        nodes:      next,
        past:       newPast,
        future:     [],
        selectedId: rootChildId,
      }
    })
  }
}

// ─── TemplatePicker (full panel, used in sidebar) ────────────────────────────

export function TemplatePicker() {
  const insert = useInsertTemplate()

  return (
    <div className="p-4 space-y-3">
      <p className="text-xs text-neutral-500 leading-relaxed">
        Insert a pre-built section at the bottom of your page. You can rearrange and customise everything after.
      </p>
      <div className="space-y-2">
        {TEMPLATES.map((t, i) => (
          <button
            key={t.label}
            onClick={() => insert(i)}
            className="w-full text-left rounded-xl border border-neutral-200 hover:border-violet-300 hover:bg-violet-50 transition-colors p-3 group"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl w-8 text-center shrink-0">{t.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-800 group-hover:text-violet-700 leading-tight">{t.label}</p>
                <p className="text-[11px] text-neutral-400 mt-0.5 truncate">{t.thumbnail}</p>
              </div>
              <span className="ml-auto text-neutral-300 group-hover:text-violet-400 text-base shrink-0">＋</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── EmptyCanvasPrompt (shown when root has no children) ─────────────────────

export function EmptyCanvasPrompt() {
  const [expanded, setExpanded] = useState(false)
  const insert = useInsertTemplate()
  const rootChildren = useBuilderStore(s => s.nodes[s.rootId]?.children ?? [])

  if (rootChildren.length > 0) return null

  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center select-none">
      {/* Dashed bounding box */}
      <div className="w-full max-w-md border-2 border-dashed border-neutral-200 rounded-2xl p-10 space-y-5">
        <div className="text-4xl">🏗️</div>
        <div>
          <p className="text-base font-semibold text-neutral-700">Your canvas is empty</p>
          <p className="text-sm text-neutral-400 mt-1">Start with a template or add blocks from the sidebar.</p>
        </div>

        {/* Template grid */}
        {expanded ? (
          <div className="space-y-2 text-left w-full">
            {TEMPLATES.map((t, i) => (
              <button
                key={t.label}
                onClick={() => { insert(i); setExpanded(false) }}
                className="w-full text-left rounded-xl border border-neutral-200 hover:border-violet-300 hover:bg-violet-50 transition-colors p-3 group flex items-center gap-3"
              >
                <span className="text-xl shrink-0">{t.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-700 group-hover:text-violet-700 leading-tight">{t.label}</p>
                  <p className="text-[11px] text-neutral-400 truncate">{t.thumbnail}</p>
                </div>
              </button>
            ))}
            <button onClick={() => setExpanded(false)} className="w-full text-xs text-neutral-400 hover:text-neutral-600 py-1">
              Dismiss
            </button>
          </div>
        ) : (
          <button
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <span>＋</span> Choose a template
          </button>
        )}
      </div>
    </div>
  )
}