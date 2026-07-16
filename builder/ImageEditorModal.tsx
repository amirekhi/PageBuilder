'use client'

import dynamic from 'next/dynamic'

// TOAST UI Image Editor is built on Fabric.js, which — like Filerobot's
// konva dependency — has an optional Node-side `canvas` binding for
// server environments. A plain `await import()` inside a useEffect isn't
// enough to keep that out of the server-rendered bundle (Turbopack still
// statically resolves it for this Client Component's SSR pass), so this
// thin wrapper exists purely to apply `ssr: false` to the real component.
const ImageEditorModalClient = dynamic(
  () => import('./ImageEditorModalClient').then(m => m.ImageEditorModalClient),
  { ssr: false },
)

export function ImageEditorModal() {
  return <ImageEditorModalClient />
}