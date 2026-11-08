'use client'

import { create } from 'zustand'
import type { NodeMap } from '../types'

export type AgentErrorKey = 'notConfigured' | 'rateLimited' | 'generic' | 'empty' | 'stopped'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  applied?: number
  errors?: string[]
  errorKey?: AgentErrorKey
}

interface AgentState {
  messages: ChatMessage[]
  status: 'idle' | 'running'
  progress: number
  abort: AbortController | null
  // The history snapshot the last run pushed. AgentPanel only offers "Undo AI
  // changes" while this is still the top of the undo stack, i.e. the user
  // hasn't edited anything since — otherwise undo would revert THEIR edit.
  runSnapshot: NodeMap | null

  beginRun: (prompt: string, abort: AbortController) => void
  setProgress: (n: number) => void
  setRunSnapshot: (s: NodeMap | null) => void
  finishRun: (r: { text?: string; applied?: number; errors?: string[]; errorKey?: AgentErrorKey }) => void
  stop: () => void
  clearSnapshot: () => void
  clear: () => void
}

const mid = () => `m_${Math.random().toString(36).slice(2, 9)}`

export const useAgentStore = create<AgentState>((set, get) => ({
  messages: [],
  status: 'idle',
  progress: 0,
  abort: null,
  runSnapshot: null,

  beginRun: (prompt, abort) => set(s => ({
    status: 'running', progress: 0, abort, runSnapshot: null,
    messages: [...s.messages, { id: mid(), role: 'user', text: prompt }],
  })),
  setProgress: n => set({ progress: n }),
  setRunSnapshot: snap => set({ runSnapshot: snap }),
  finishRun: r => set(s => ({
    status: 'idle', abort: null,
    messages: [...s.messages, {
      id: mid(), role: 'assistant', text: r.text ?? '',
      applied: r.applied, errors: r.errors, errorKey: r.errorKey,
    }],
  })),
  stop: () => { get().abort?.abort() },
  clearSnapshot: () => set({ runSnapshot: null }),
  clear: () => { if (get().status === 'idle') set({ messages: [], runSnapshot: null, progress: 0 }) },
}))
