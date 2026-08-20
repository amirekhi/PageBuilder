'use client'

import React from 'react'
import { useBuilderStore, type AutosaveStatus } from './store'
import { useT } from './i18n'

// Small passive status pill — drop into TopBar next to the Save menu (see
// the TopBar.tsx patch note). Purely informational; it never blocks or
// prompts anything itself, unlike RestoreBanner.
export function AutosaveIndicator() {
  const status = useBuilderStore(s => s.autosaveStatus)
  const t = useT()

  if (status === 'idle') return null

  const CONFIG: Record<Exclude<AutosaveStatus, 'idle'>, { icon: string; labelKey: Parameters<typeof t>[0]; className: string }> = {
    pending: { icon: '•', labelKey: 'autosavePending', className: 'text-neutral-400' },
    saving:  { icon: '↻', labelKey: 'autosaveSaving',  className: 'text-neutral-400' },
    saved:   { icon: '✓', labelKey: 'autosaveSaved',   className: 'text-green-600' },
    error:   { icon: '⚠', labelKey: 'autosaveError',   className: 'text-red-500' },
  }
  const cfg = CONFIG[status]

  return (
    <span
      title={t('autosaveTitle')}
      className={`hidden md:flex items-center gap-1 text-[11px] font-medium select-none shrink-0 ${cfg.className}`}
    >
      <span className={status === 'saving' ? 'inline-block animate-spin' : 'inline-block'} aria-hidden>{cfg.icon}</span>
      {t(cfg.labelKey)}
    </span>
  )
}