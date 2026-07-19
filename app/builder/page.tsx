'use client'

import { useBuilderStore } from '@/builder/store'
import { EditorRenderer, PreviewRenderer } from '@/builder/Renderers'
import { ControlPanel } from '@/builder/ControlPanel'
import { TopBar } from '@/builder/TopBar'
import { MediaPickerModal } from '@/builder/MediaPickerModal'
import { ImageEditorModal } from '@/builder/ImageEditorModal'
import { MobileBlockModal } from '@/builder/MobileBlockModal'
import { useIsViewportTooNarrow } from '@/builder/useViewportGate'

export default function BuilderPage() {
  const mode   = useBuilderStore(s => s.mode)
  const nodes  = useBuilderStore(s => s.nodes)
  const rootId = useBuilderStore(s => s.rootId)
  const tooNarrow = useIsViewportTooNarrow()

  if (tooNarrow) return <MobileBlockModal />

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
      <MediaPickerModal />
      <ImageEditorModal />
    </div>
  )
}