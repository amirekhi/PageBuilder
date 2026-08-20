'use client'

import React from 'react'
import { useAutosave } from './autosave'
import { RestoreBanner } from './RestoreBanner'

// Mount once, anywhere near the app root (see the page.tsx patch note) —
// same drop-in shape as Tutorial.tsx: this both RUNS the autosave
// subscription (useAutosave — see autosave.ts) and renders the one piece
// of UI that goes with it (RestoreBanner, offered once on boot).
export function AutoSaveComp() {
  useAutosave()
  return <RestoreBanner />
}