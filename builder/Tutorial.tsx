'use client'

import React, { useEffect } from 'react'
import { useBuilderStore } from './store'
import { LanguageChoiceModal } from './LanguageChoiceModal'
import { TutorialOverlay } from './TutorialOverlay'

// Drop this once, anywhere near the root of the app (e.g. as a sibling of
// <TopBar /> in your top-level layout component) — it portals its own UI
// via fixed positioning, so it doesn't need to sit in any particular spot
// in the tree:
//
//   <TopBar />
//   <Tutorial />
//   <div className="flex-1 flex ...">
//     <EditorRenderer /> / <PreviewRenderer />
//     <ControlPanel />
//   </div>
//
// On mount, checks localStorage once (client-side only, to avoid an SSR
// hydration mismatch — see hydrateTutorialFlag's doc comment in store.ts)
// and, if this browser has never completed or skipped the tour before,
// opens the language-choice modal automatically. Nothing renders here for
// a returning visitor until they click TopBar's "🎓 Tour" button.
export function Tutorial() {
  const hydrateTutorialFlag = useBuilderStore(s => s.hydrateTutorialFlag)

  useEffect(() => {
    hydrateTutorialFlag()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <LanguageChoiceModal />
      <TutorialOverlay />
    </>
  )
}