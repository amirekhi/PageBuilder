'use client'

import React from 'react'
import { useBuilderStore } from './store'
import { useT } from './i18n'

// Drop this into TopBar.tsx's button row (e.g. next to the Desktop/Tablet/
// Mobile switcher) — import { LanguageToggle } from './LanguageToggle' and
// render <LanguageToggle />. Shipped as its own standalone component rather
// than edited directly into TopBar.tsx, since that file wasn't available to
// edit against directly.
//
// Toggling calls setLocale, which is the ONE switch that cascades
// everything else, all driven off the same store field:
//   - direction: dir="rtl"/"ltr" applied to both the Editor canvas and
//     every Preview root (Renderer.tsx), plus the Tiptap rich-text editor's
//     own contenteditable element (richText.ts) — so typing/caret behavior
//     is correct for Farsi too.
//   - the builder's own UI strings — every component using useT() from
//     i18n.ts (currently: panelComponents.tsx's shared Style/Animation/
//     Theme/SEO/ElementId panels, ControlPanel.tsx's tab bar and Layers/
//     Style/Content tabs, DropSlot.tsx's BlockPicker, TemplatePicker.tsx —
//     see each file for exactly which strings).
//   - node type display names in BlockPicker/LayersTab, via nodeLabel().
//   - which language's content pack the Template picker's five
//     Farsi-enabled templates (Hero, CTA Banner, Testimonial, Pricing,
//     FAQ) render in, via templates.ts's getTemplates(locale).
export function LanguageToggle() {
  const locale    = useBuilderStore(s => s.locale)
  const setLocale = useBuilderStore(s => s.setLocale)
  const t         = useT()

  return (
    <button
      type="button"
      onClick={() => setLocale(locale === 'fa' ? 'en' : 'fa')}
      title={locale === 'fa' ? 'Switch to English' : 'تغییر به فارسی'}
      className="px-3 py-1.5 rounded-md text-xs font-medium border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800 transition-colors"
    >
      {t('languageToggleLabel')}
    </button>
  )
}