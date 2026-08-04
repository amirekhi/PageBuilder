'use client'

import { useBuilderStore } from './store'
import type { TutorialDictKey } from './tutorialI18n'

// Each step points at a real element elsewhere in the app via
// `data-tutorial="<target>"` (added directly to that element — see the
// patch notes for Renderer.tsx, TopBar.tsx, and ControlPanel.tsx). Adding a
// new step later is just: add the data-tutorial attribute where you want
// it, add its copy to tutorialI18n.ts, and add one entry here.
export interface TutorialStep {
  id:          string
  // Which element to spotlight. `null` means "no specific element" — the
  // card centers itself on screen instead (used for the welcome/finish
  // bookends, which don't belong to any one control).
  target:      string | null
  titleKey:    TutorialDictKey
  bodyKey:     TutorialDictKey
  // Preferred side of the target to place the tooltip card on.
  // TutorialOverlay still flips this if there isn't room.
  placement:   'top' | 'bottom' | 'left' | 'right' | 'center'
  // Runs right before this step is shown — e.g. switching ControlPanel to
  // the right tab so the thing being explained is actually on screen and
  // not hidden behind whichever tab was last open.
  beforeShow?: () => void
}

function cp(tab: 'layers' | 'style' | 'content' | 'theme' | 'seo') {
  return () => useBuilderStore.getState().setControlPanelTab(tab)
}

function mode(next: 'edit' | 'preview') {
  return () => useBuilderStore.getState().setMode(next)
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome', target: null, placement: 'center',
    titleKey: 'welcomeTitle', bodyKey: 'welcomeBody',
    beforeShow: mode('edit'),
  },
  {
    id: 'canvas', target: 'canvas', placement: 'right',
    titleKey: 'canvasTitle', bodyKey: 'canvasBody',
  },
  {
    id: 'cp-tabs', target: 'cp-tabs', placement: 'left',
    titleKey: 'cpTabsTitle', bodyKey: 'cpTabsBody',
    beforeShow: cp('layers'),
  },
  {
    id: 'cp-layers', target: 'cp-body', placement: 'left',
    titleKey: 'cpLayersTitle', bodyKey: 'cpLayersBody',
    beforeShow: cp('layers'),
  },
  {
    id: 'cp-style', target: 'cp-body', placement: 'left',
    titleKey: 'cpStyleTitle', bodyKey: 'cpStyleBody',
    beforeShow: cp('style'),
  },
  {
    id: 'cp-content', target: 'cp-body', placement: 'left',
    titleKey: 'cpContentTitle', bodyKey: 'cpContentBody',
    beforeShow: cp('content'),
  },
  {
    id: 'theme-seo', target: 'theme-seo-switcher', placement: 'bottom',
    titleKey: 'themeSeoTitle', bodyKey: 'themeSeoBody',
  },
  {
    id: 'undo-redo', target: 'undo-redo', placement: 'bottom',
    titleKey: 'undoRedoTitle', bodyKey: 'undoRedoBody',
  },
  {
    id: 'mode-switch', target: 'mode-switch', placement: 'bottom',
    titleKey: 'modeSwitchTitle', bodyKey: 'modeSwitchBody',
    beforeShow: mode('edit'),
  },
  {
    id: 'breakpoint', target: 'breakpoint-switch', placement: 'bottom',
    titleKey: 'breakpointTitle', bodyKey: 'breakpointBody',
    beforeShow: mode('edit'),
  },
  {
    id: 'save-menu', target: 'save-menu', placement: 'bottom',
    titleKey: 'saveMenuTitle', bodyKey: 'saveMenuBody',
  },
  {
    id: 'publish', target: 'publish-btn', placement: 'bottom',
    titleKey: 'publishTitle', bodyKey: 'publishBody',
  },
  {
    id: 'finish', target: null, placement: 'center',
    titleKey: 'finishTitle', bodyKey: 'finishBody',
  },
]