'use client'

import { useBuilderStore } from '../store'
import { SECTION_BUILDERS } from '../templates'
import { ensurePersianFontsLoaded } from '../richText'
import { useAgentStore, type AgentErrorKey } from './agentStore'
import { applyOps, type AgentOp, type ApplyContext } from './ops'
import { buildOutline, buildTemplateSlots } from './outline'

const HISTORY_LIMIT = 50
const FLUSH_MS = 120

const ERROR_CODES: Record<string, AgentErrorKey> = {
  not_configured: 'notConfigured',
  rate_limited: 'rateLimited',
}

export function stopAgent() {
  useAgentStore.getState().stop()
}

export async function runAgent(promptRaw: string) {
  const agent = useAgentStore.getState()
  const prompt = promptRaw.trim()
  if (!prompt || agent.status === 'running') return

  const store = useBuilderStore.getState()
  const { locale, rootId } = store
  const selectedId = store.selectedId

  // Chat history sent to the model (before this turn is appended).
  const history = agent.messages
    .filter(m => m.role === 'user' || m.text || m.applied)
    .map(m => ({
      role: m.role,
      text: m.role === 'user' ? m.text : (m.text || `(applied ${m.applied ?? 0} changes)`),
    }))

  const outline = buildOutline(store.nodes, rootId, selectedId)
  const templateSlots = buildTemplateSlots(locale)

  const ctrl = new AbortController()
  agent.beginRun(prompt, ctrl)
  // Deselect first: commits any in-progress rich-text edit and avoids the
  // agent deleting a node the user is typing into.
  store.selectNode(null)
  if (locale === 'fa') ensurePersianFontsLoaded()

  const ctx: ApplyContext = {
    locale,
    buildTemplate: key => {
      const build = (SECTION_BUILDERS as Record<string, (l: typeof locale) => ReturnType<typeof SECTION_BUILDERS.hero>>)[key]
      return build ? build(locale) : null
    },
  }

  let refs: Record<string, string> = {}
  let pending: AgentOp[] = []
  let pushedHistory = false
  let applied = 0
  const errors: string[] = []
  let summary = ''
  let errorKey: AgentErrorKey | undefined
  let lastFlush = 0

  // One undo step per run: the FIRST batch that changes anything pushes a
  // snapshot; later batches just replace `nodes`.
  function flush() {
    if (!pending.length) return
    const batch = pending
    pending = []
    lastFlush = Date.now()

    const s = useBuilderStore.getState()
    const res = applyOps(s.nodes, s.rootId, batch, ctx, refs)
    refs = res.refs
    applied += res.applied
    errors.push(...res.errors)

    const patch: Partial<typeof s> = { nodes: res.nodes }
    if (!pushedHistory && res.applied > 0) {
      const snapshot = JSON.parse(JSON.stringify(s.nodes))
      patch.past = [snapshot, ...s.past].slice(0, HISTORY_LIMIT)
      patch.future = []
      pushedHistory = true
      useAgentStore.getState().setRunSnapshot(snapshot)
    }
    if (s.selectedId && !res.nodes[s.selectedId]) patch.selectedId = null
    useBuilderStore.setState(patch)
    if (res.seo) useBuilderStore.getState().updateSeo(res.seo)
    useAgentStore.getState().setProgress(applied)
  }

  function handleLine(line: string) {
    if (!line.trim()) return
    let obj: { op?: string; text?: string; code?: string }
    try { obj = JSON.parse(line) } catch { return }
    switch (obj.op) {
      case 'say': summary = String(obj.text ?? '').slice(0, 400); break
      case 'error': errorKey = ERROR_CODES[obj.code ?? ''] ?? 'generic'; break
      case 'done': break
      default:
        pending.push(obj as AgentOp)
    }
  }

  try {
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, history, outline, templateSlots, locale }),
      signal: ctrl.signal,
    })

    if (!res.ok || !res.body) {
      let code = ''
      try { code = (await res.json()).error } catch { /* ignore */ }
      useAgentStore.getState().finishRun({ errorKey: ERROR_CODES[code] ?? 'generic' })
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      lines.forEach(handleLine)
      if (Date.now() - lastFlush >= FLUSH_MS) flush()
    }
    buf += decoder.decode()
    if (buf.trim()) handleLine(buf)
    flush()

    if (errorKey && applied === 0) {
      useAgentStore.getState().finishRun({ errorKey, errors })
    } else if (applied === 0 && !summary) {
      useAgentStore.getState().finishRun({ errorKey: 'empty', errors })
    } else {
      useAgentStore.getState().finishRun({ text: summary, applied, errors, errorKey })
    }
  } catch (e) {
    flush() // keep whatever streamed in before the interruption
    const aborted = (e as Error)?.name === 'AbortError'
    useAgentStore.getState().finishRun({
      text: summary, applied, errors,
      errorKey: aborted ? 'stopped' : 'generic',
    })
  }
}
