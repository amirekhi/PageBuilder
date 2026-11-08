'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useBuilderStore } from '../store'
import { useDirection } from '../i18n'
import { useAgentStore, type ChatMessage, type AgentErrorKey } from './agentStore'
import { runAgent, stopAgent } from './runAgent'
import { useAgentT, type AgentDictKey } from './agentI18n'

const ERROR_TEXT: Record<AgentErrorKey, AgentDictKey> = {
  notConfigured: 'errNotConfigured',
  rateLimited: 'errRateLimited',
  generic: 'errGeneric',
  empty: 'errEmpty',
  stopped: 'stopped',
}

export function AgentPanel() {
  const t = useAgentT()
  const dir = useDirection()

  const messages = useAgentStore(s => s.messages)
  const status = useAgentStore(s => s.status)
  const progress = useAgentStore(s => s.progress)
  const runSnapshot = useAgentStore(s => s.runSnapshot)
  const clearChat = useAgentStore(s => s.clear)
  const clearSnapshot = useAgentStore(s => s.clearSnapshot)

  const topHistory = useBuilderStore(s => s.past[0])
  const hasContent = useBuilderStore(s => (s.nodes[s.rootId]?.children.length ?? 0) > 0)

  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const running = status === 'running'
  const canUndo = !running && !!runSnapshot && topHistory === runSnapshot

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, running])

  function submit(text: string) {
    const v = text.trim()
    if (!v || running) return
    setDraft('')
    void runAgent(v)
  }

  function undo() {
    useBuilderStore.getState().undo()
    clearSnapshot()
  }

  const suggestions: AgentDictKey[] = hasContent
    ? ['suggestEdit1', 'suggestEdit2', 'suggestEdit3']
    : ['suggest1', 'suggest2', 'suggest3']

  return (
    <div dir={dir} className="h-full flex flex-col" data-tutorial="agent-panel">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-neutral-800">{t('title')}</p>
              <p className="text-[11px] text-neutral-400 leading-relaxed mt-1">{t('intro')}</p>
            </div>
            <div className="space-y-1.5">
              {suggestions.map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => submit(t(k))}
                  className="w-full text-start rounded-lg border border-neutral-200 hover:border-violet-300 hover:bg-violet-50 transition-colors px-3 py-2 text-xs text-neutral-600 hover:text-violet-700"
                >
                  {t(k)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(m => <Bubble key={m.id} m={m} />)
        )}

        {running && (
          <div className="flex items-center gap-2 text-[11px] text-violet-600">
            <span className="w-3 h-3 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            <span>{t('building')}</span>
            {progress > 0 && <span className="text-neutral-400 tabular-nums">{t('buildingCount', progress)}</span>}
          </div>
        )}

        {canUndo && (
          <button
            type="button"
            onClick={undo}
            className="text-[11px] font-medium text-violet-600 hover:text-violet-800 transition-colors"
          >
            ↩ {t('undo')}
          </button>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-neutral-200 p-3 space-y-2 shrink-0 bg-white">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              submit(draft)
            }
          }}
          disabled={running}
          rows={3}
          maxLength={2000}
          placeholder={hasContent ? t('placeholderEdit') : t('placeholderCreate')}
          className="w-full border border-neutral-200 rounded-lg text-sm p-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-violet-400 disabled:bg-neutral-50 disabled:text-neutral-400"
        />
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={clearChat}
            disabled={running || messages.length === 0}
            className="text-[11px] font-medium text-neutral-400 hover:text-neutral-600 disabled:opacity-30 transition-colors"
          >
            {t('clear')}
          </button>
          {running ? (
            <button
              type="button"
              onClick={stopAgent}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              {t('stop')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => submit(draft)}
              disabled={!draft.trim()}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t('send')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Bubble({ m }: { m: ChatMessage }) {
  const t = useAgentT()

  if (m.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[90%] rounded-2xl bg-violet-600 text-white text-sm px-3 py-2 whitespace-pre-wrap break-words">
          {m.text}
        </p>
      </div>
    )
  }

  const errs = m.errors ?? []
  return (
    <div className="flex flex-col items-start gap-1">
      {(m.text || m.errorKey) && (
        <p className={[
          'max-w-[95%] rounded-2xl text-sm px-3 py-2 break-words',
          m.errorKey && m.errorKey !== 'stopped' ? 'bg-red-50 text-red-700' : 'bg-neutral-100 text-neutral-700',
        ].join(' ')}>
          {m.text || (m.errorKey ? t(ERROR_TEXT[m.errorKey]) : '')}
        </p>
      )}
      {!!m.applied && (
        <p className="text-[10px] text-neutral-400 px-1">
          {t('applied', m.applied)}{errs.length > 0 ? ` · ${t('skipped', errs.length)}` : ''}
        </p>
      )}
      {errs.length > 0 && (
        <details className="px-1 text-[10px] text-neutral-400 max-w-full">
          <summary className="cursor-pointer select-none">{t('skipped', errs.length)}</summary>
          <ul className="mt-1 space-y-0.5 font-mono" dir="ltr">
            {errs.slice(0, 20).map((e, i) => <li key={i} className="break-words">{e}</li>)}
          </ul>
        </details>
      )}
    </div>
  )
}
