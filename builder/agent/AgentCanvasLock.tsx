'use client'

import React from 'react'
import { useAgentStore } from './agentStore'
import { stopAgent } from './runAgent'
import { useAgentT } from './agentI18n'

// Mount once in page.tsx (edit mode only). While the agent is streaming edits
// it blocks pointer input over the canvas so the user can't select/drag/type
// into nodes that are being rewritten underneath them, and shows a Stop pill.
// Geometry: below the 48px TopBar, left of the 288px (w-72) ControlPanel.
export function AgentCanvasLock() {
  const status = useAgentStore(s => s.status)
  const progress = useAgentStore(s => s.progress)
  const t = useAgentT()

  if (status !== 'running') return null

  return (
    <div
      className="fixed z-40 flex items-start justify-center"
      style={{ top: 48, left: 0, bottom: 0, right: 288, background: 'rgba(255,255,255,0.35)', cursor: 'progress' }}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="mt-4 flex items-center gap-3 bg-white border border-violet-200 shadow-xl rounded-full ps-4 pe-2 py-1.5 text-xs">
        <span className="w-3 h-3 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        <span className="font-medium text-neutral-700">{t('building')}</span>
        {progress > 0 && <span className="text-neutral-400 tabular-nums">{t('buildingCount', progress)}</span>}
        <button
          type="button"
          onClick={stopAgent}
          className="px-2.5 py-1 rounded-full text-[11px] font-medium text-violet-600 hover:bg-violet-50 transition-colors"
        >
          {t('stop')}
        </button>
      </div>
    </div>
  )
}
