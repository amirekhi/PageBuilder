'use client'

import { useBuilderStore } from '@/builder/store'
import { EditorRenderer, PreviewRenderer } from '@/builder/Renderers'
import { ControlPanel } from '@/builder/ControlPanel'
import { TopBar } from '@/builder/TopBar'
import { MediaPickerModal } from '@/builder/MediaPickerModal'

export default function BuilderPage() {
  const mode   = useBuilderStore(s => s.mode)
  const nodes  = useBuilderStore(s => s.nodes)
  const rootId = useBuilderStore(s => s.rootId)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f9fafb' }}>
      <TopBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {mode === 'edit' ? (
            <EditorRenderer />
          ) : (
            <PreviewRenderer nodes={nodes} rootId={rootId} />
          )}
        </main>
        {mode === 'edit' && <ControlPanel />}
      </div>

      {/* Mounted once, controlled entirely via store state */}
      <MediaPickerModal />
    </div>
  )
}