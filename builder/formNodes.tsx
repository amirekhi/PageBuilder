'use client'

// ═══════════════════════════════════════════════════════════════════════════════
// FORMS
// ═══════════════════════════════════════════════════════════════════════════════
// New file, kept separate from nodeComponents.tsx (which is already very large)
// rather than appended to it. Six new node types, following the exact same
// three-component contract (Editor/Preview/Panel) every existing node type
// already uses — see ARCHITECTURE.md §6.
//
//   form          — container. Holds the destination config (action/method/
//                   success+error messages/submitAsJson) AND lays out its
//                   children exactly like Columns/Section (generic DropSlots,
//                   ordinary isContainer:true — no special Renderer.tsx
//                   handling needed, unlike Tabs/Carousel/Grid).
//   formInput     — a single labeled text-ish field (text/email/tel/number/
//                   date/url via `inputType`).
//   formTextarea  — a single labeled multi-line field.
//   formSelect    — a single labeled dropdown with an editable option list.
//   formCheckbox  — a single labeled checkbox.
//   formSubmit    — a real <button type="submit">, styled like Button, but
//                   with no href — clicking it submits whatever <form> it's
//                   nested inside (ordinary HTML behavior, needs no wiring).
//
// DESIGN DECISION: fields are NOT restricted to living inside a `form` node
// (unlike tabpane/slide, which only make sense inside their exact parent).
// A formInput dropped outside any form simply won't be part of any
// submission — the same kind of "author's responsibility" as a Divider
// inside a container with nothing to divide. This keeps every field type an
// ordinary, freely-draggable BLOCK_GROUPS entry instead of requiring a
// dedicated "+ Add field" affordance the way Tabs/Carousel need "+ Add tab"/
// "+ Add slide" — simpler, and consistent with how Button/Badge already work
// (never restricted to a specific container type).
//
// SUBMISSION MECHANISM: no state per field. Every *Preview field component
// renders a REAL native <input>/<textarea>/<select> with a `name` attribute
// (from the field's `fieldName` prop). FormPreview wraps its children in a
// real <form onSubmit={...}> and reads `new FormData(e.currentTarget)` on
// submit — ordinary browser form serialization does all the work, so there
// is nothing to keep in sync between "what the field renders" and "what
// gets submitted". This mirrors the same "let the platform do it" instinct
// already used elsewhere in this codebase (e.g. Tabs' real <button> header
// instead of hand-rolled click tracking).
//
// The exact same fetch/success/error logic is re-implemented as plain
// vanilla JS in exportImport.ts's INTERACTIVE_SCRIPT (see the accompanying
// exportImport-additions.ts snippet) so a form behaves identically in
// Preview and in the exported static HTML file, with zero framework
// runtime in the exported case — same pattern already used for Accordion/
// Tabs/Carousel.

import React, { useState } from 'react'
import { NodeComponentProps, PanelProps, PageNode } from './types'
import {
  StyleProps, buildClassName, buildInlineStyle,
} from './styleMapper'
import { FieldGroup, SelectField, CheckField, BoxSpacingField, AnimationPanel } from './panelComponents'
import { useNodeStyle, patchNodeStyle } from './responsive'
import { customCssClass, buildHoverTransitionStyle } from './customCss'
import { elementId } from './elementId'
import { useT } from './i18n'

// ─── Shared helpers (mirrors the private helpers of the same name in
// nodeComponents.tsx — kept local here since those aren't exported) ────────

function patchStyle(node: PageNode, onChange: PanelProps['onChange'], partial: Partial<StyleProps>) {
  patchNodeStyle(node, onChange, partial)
}

function withCustomCss(node: PageNode, extra: string): string {
  return [extra, customCssClass(node)].filter(Boolean).join(' ')
}

// Sanitizes a field's `name` attribute as the user types — same instinct as
// sanitizeElementId in elementId.ts, but for something that also has to be a
// safe, unique-enough JSON object key on the receiving end. Letters,
// numbers, underscores, and hyphens only; whitespace collapses to
// underscores (an HTML `name` attribute technically tolerates more, but
// keeping it restricted keeps it trivially safe as a JSON key too, since the
// same value is reused as one when submitAsJson is on).
export function sanitizeFieldName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
}

const inputBaseClass =
  'w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-violet-400 focus:border-violet-400 transition-colors'

const fieldLabelClass = 'text-sm font-medium text-neutral-700'

// ═══════════════════════════════════════════════════════════════════════════════
// FORM (container)
// ═══════════════════════════════════════════════════════════════════════════════

export interface FormSubmitStatus {
  state: 'idle' | 'submitting' | 'success' | 'error'
}

export const FormEditor: React.FC<NodeComponentProps> = ({ node, children }) => {
  const s = useNodeStyle(node)
  const t = useT()
  return (
    // Deliberately a plain <div>, NOT a real <form> — the editor canvas
    // never wants an Enter keypress inside some other field, or a stray
    // click on the (disabled, but still rendered) submit button, to
    // trigger real browser form-submission machinery while authoring.
    // Every *Editor field component below independently renders as
    // `disabled` for the same reason — see the note on FormInputEditor.
    <div
      id={elementId(node)}
      className={buildClassName(s, withCustomCss(node, 'w-full'))}
      style={buildInlineStyle(s, { skipSizing: true })}
    >
      {children}
      {!node.props.action && (
        <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 mt-2">
          {t('formNoDestinationWarning')}
        </p>
      )}
    </div>
  )
}

export const FormPreview: React.FC<NodeComponentProps> = ({ node, children, animationRef, animationStyle }) => {
  const s = useNodeStyle(node)
  const [status, setStatus] = useState<FormSubmitStatus['state']>('idle')

  const action        = (node.props.action as string) || ''
  const method        = ((node.props.method as string) || 'POST').toUpperCase()
  const submitAsJson  = !!node.props.submitAsJson
  const successMessage = (node.props.successMessage as string) || 'Thanks! Your submission has been received.'
  const errorMessage   = (node.props.errorMessage as string) || 'Something went wrong — please try again.'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!action) return // no destination configured — a no-op, same as a Button with an empty href
    const formEl = e.currentTarget
    const formData = new FormData(formEl)
    setStatus('submitting')
    try {
      const res = await fetch(action, {
        method,
        headers: submitAsJson
          ? { 'Content-Type': 'application/json', Accept: 'application/json' }
          : { Accept: 'application/json' },
        body: submitAsJson ? JSON.stringify(Object.fromEntries(formData.entries())) : formData,
      })
      if (res.ok) {
        setStatus('success')
        formEl.reset()
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <form
      ref={animationRef as React.Ref<HTMLFormElement>}
      id={elementId(node)}
      onSubmit={handleSubmit}
      noValidate
      className={buildClassName(s, withCustomCss(node, 'w-full'))}
      style={{ ...buildInlineStyle(s), ...buildHoverTransitionStyle(node), ...animationStyle }}
    >
      {children}
      {status === 'success' && (
        <p className="text-sm text-green-600 mt-2" role="status">{successMessage}</p>
      )}
      {status === 'error' && (
        <p className="text-sm text-red-600 mt-2" role="alert">{errorMessage}</p>
      )}
    </form>
  )
}

export const FormPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const s = useNodeStyle(node)
  const t = useT()
  const method = ((node.props.method as string) || 'POST') as string

  return (
    <div className="space-y-5 p-4">
      <FieldGroup label={t('formDestinationSection')}>
        <label className="block text-xs text-neutral-500 mb-1">{t('formActionLabel')}</label>
        <input
          className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400 font-mono"
          placeholder="https://your-endpoint.example.com/submit"
          spellCheck={false}
          value={(node.props.action as string) ?? ''}
          onChange={e => onChange({ action: e.target.value })}
        />
        <p className="text-[10px] text-neutral-400 -mt-1">{t('formActionNote')}</p>

        <SelectField
          label={t('formMethodLabel')}
          value={method}
          options={['POST', 'GET']}
          onChange={v => onChange({ method: v })}
        />

        <CheckField
          label={t('formSubmitAsJsonLabel')}
          value={!!node.props.submitAsJson}
          onChange={v => onChange({ submitAsJson: v })}
        />
        <p className="text-[10px] text-neutral-400 -mt-1">{t('formSubmitAsJsonNote')}</p>
      </FieldGroup>

      <FieldGroup label={t('formMessagesSection')}>
        <label className="block text-xs text-neutral-500 mb-1">{t('formSuccessMessageLabel')}</label>
        <textarea
          className="w-full border border-neutral-200 rounded-md text-sm p-2 resize-y min-h-14 focus:outline-none focus:ring-1 focus:ring-violet-400"
          value={(node.props.successMessage as string) ?? ''}
          onChange={e => onChange({ successMessage: e.target.value })}
        />
        <label className="block text-xs text-neutral-500 mt-2 mb-1">{t('formErrorMessageLabel')}</label>
        <textarea
          className="w-full border border-neutral-200 rounded-md text-sm p-2 resize-y min-h-14 focus:outline-none focus:ring-1 focus:ring-violet-400"
          value={(node.props.errorMessage as string) ?? ''}
          onChange={e => onChange({ errorMessage: e.target.value })}
        />
      </FieldGroup>

      <FieldGroup label={t('fgLayout')}>
        <SelectField
          label={t('directionLabel')}
          value={s.flexDir ?? 'col'}
          options={['col', 'row']}
          onChange={v => patchStyle(node, onChange, { display: 'flex', flexDir: v as StyleProps['flexDir'] })}
        />
      </FieldGroup>

      <AnimationPanel node={node} onChange={onChange} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORM INPUT (text / email / tel / number / date / url)
// ═══════════════════════════════════════════════════════════════════════════════

const INPUT_TYPES = ['text', 'email', 'tel', 'number', 'date', 'url'] as const
type FormInputType = typeof INPUT_TYPES[number]

export const FormInputEditor: React.FC<NodeComponentProps> = ({ node }) => {
  const s = useNodeStyle(node)
  const fieldName = (node.props.fieldName as string) || 'field'
  const label = (node.props.label as string) || ''
  return (
    <label
      id={elementId(node)}
      className={buildClassName(s, withCustomCss(node, 'flex flex-col gap-1.5'))}
      style={buildInlineStyle(s, { skipSizing: true })}
    >
      {label && <span className={fieldLabelClass}>{label}{!!node.props.required && <span className="text-red-500"> *</span>}</span>}
      {/* disabled in the editor — same reasoning as FormEditor's plain <div>
          instead of a real <form>: this should look right on the canvas
          without being genuinely typeable/focusable while authoring. */}
      <input
        type={(node.props.inputType as FormInputType) || 'text'}
        name={fieldName}
        placeholder={(node.props.placeholder as string) || ''}
        disabled
        className={inputBaseClass}
      />
    </label>
  )
}

export const FormInputPreview: React.FC<NodeComponentProps> = ({ node, animationRef, animationStyle }) => {
  const s = useNodeStyle(node)
  const fieldName = (node.props.fieldName as string) || 'field'
  const label = (node.props.label as string) || ''
  return (
    <label
      id={elementId(node)}
      className={buildClassName(s, withCustomCss(node, 'flex flex-col gap-1.5'))}
      style={{ ...buildInlineStyle(s), ...animationStyle }}
    >
      {label && <span className={fieldLabelClass}>{label}{!!node.props.required && <span className="text-red-500"> *</span>}</span>}
      <input
        ref={animationRef as React.Ref<HTMLInputElement>}
        type={(node.props.inputType as FormInputType) || 'text'}
        name={fieldName}
        placeholder={(node.props.placeholder as string) || ''}
        required={!!node.props.required}
        className={inputBaseClass}
      />
    </label>
  )
}

export const FormInputPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const t = useT()
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label={t('tabContent')}>
        <label className="block text-xs text-neutral-500 mb-1">{t('formLabelFieldLabel')}</label>
        <input
          className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
          value={(node.props.label as string) ?? ''}
          onChange={e => onChange({ label: e.target.value })}
        />
        <label className="block text-xs text-neutral-500 mt-2 mb-1">{t('formPlaceholderLabel')}</label>
        <input
          className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
          value={(node.props.placeholder as string) ?? ''}
          onChange={e => onChange({ placeholder: e.target.value })}
        />
        <SelectField
          label={t('formFieldTypeLabel')}
          value={(node.props.inputType as string) ?? 'text'}
          options={INPUT_TYPES as unknown as string[]}
          onChange={v => onChange({ inputType: v })}
        />
        <CheckField
          label={t('formRequiredLabel')}
          value={!!node.props.required}
          onChange={v => onChange({ required: v })}
        />
      </FieldGroup>
      <FieldGroup label={t('formFieldNameSection')}>
        <input
          className="w-full border border-neutral-200 rounded-md text-xs font-mono p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
          value={(node.props.fieldName as string) ?? ''}
          onChange={e => onChange({ fieldName: sanitizeFieldName(e.target.value) })}
        />
        <p className="text-[10px] text-neutral-400 -mt-1">{t('formFieldNameNote')}</p>
      </FieldGroup>
      <AnimationPanel node={node} onChange={onChange} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORM TEXTAREA
// ═══════════════════════════════════════════════════════════════════════════════

export const FormTextareaEditor: React.FC<NodeComponentProps> = ({ node }) => {
  const s = useNodeStyle(node)
  const fieldName = (node.props.fieldName as string) || 'message'
  const label = (node.props.label as string) || ''
  return (
    <label
      id={elementId(node)}
      className={buildClassName(s, withCustomCss(node, 'flex flex-col gap-1.5'))}
      style={buildInlineStyle(s, { skipSizing: true })}
    >
      {label && <span className={fieldLabelClass}>{label}{!!node.props.required && <span className="text-red-500"> *</span>}</span>}
      <textarea
        name={fieldName}
        placeholder={(node.props.placeholder as string) || ''}
        rows={(node.props.rows as number) ?? 4}
        disabled
        className={`${inputBaseClass} resize-none`}
      />
    </label>
  )
}

export const FormTextareaPreview: React.FC<NodeComponentProps> = ({ node, animationRef, animationStyle }) => {
  const s = useNodeStyle(node)
  const fieldName = (node.props.fieldName as string) || 'message'
  const label = (node.props.label as string) || ''
  return (
    <label
      id={elementId(node)}
      className={buildClassName(s, withCustomCss(node, 'flex flex-col gap-1.5'))}
      style={{ ...buildInlineStyle(s), ...animationStyle }}
    >
      {label && <span className={fieldLabelClass}>{label}{!!node.props.required && <span className="text-red-500"> *</span>}</span>}
      <textarea
        ref={animationRef as React.Ref<HTMLTextAreaElement>}
        name={fieldName}
        placeholder={(node.props.placeholder as string) || ''}
        rows={(node.props.rows as number) ?? 4}
        required={!!node.props.required}
        className={`${inputBaseClass} resize-y`}
      />
    </label>
  )
}

export const FormTextareaPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const t = useT()
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label={t('tabContent')}>
        <label className="block text-xs text-neutral-500 mb-1">{t('formLabelFieldLabel')}</label>
        <input
          className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
          value={(node.props.label as string) ?? ''}
          onChange={e => onChange({ label: e.target.value })}
        />
        <label className="block text-xs text-neutral-500 mt-2 mb-1">{t('formPlaceholderLabel')}</label>
        <input
          className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
          value={(node.props.placeholder as string) ?? ''}
          onChange={e => onChange({ placeholder: e.target.value })}
        />
        <div className="flex items-center gap-2" dir="ltr">
          <span className="text-xs text-neutral-500 w-20 shrink-0">{t('formRowsLabel')}</span>
          <input
            type="number" min={2} max={20}
            className="flex-1 border border-neutral-200 rounded text-xs p-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
            value={(node.props.rows as number) ?? 4}
            onChange={e => onChange({ rows: Math.max(2, +e.target.value || 4) })}
          />
        </div>
        <CheckField
          label={t('formRequiredLabel')}
          value={!!node.props.required}
          onChange={v => onChange({ required: v })}
        />
      </FieldGroup>
      <FieldGroup label={t('formFieldNameSection')}>
        <input
          className="w-full border border-neutral-200 rounded-md text-xs font-mono p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
          value={(node.props.fieldName as string) ?? ''}
          onChange={e => onChange({ fieldName: sanitizeFieldName(e.target.value) })}
        />
        <p className="text-[10px] text-neutral-400 -mt-1">{t('formFieldNameNote')}</p>
      </FieldGroup>
      <AnimationPanel node={node} onChange={onChange} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORM SELECT (dropdown)
// ═══════════════════════════════════════════════════════════════════════════════

function selectOptions(node: PageNode): string[] {
  const raw = node.props.options as string[] | undefined
  return raw && raw.length ? raw : ['Option 1', 'Option 2']
}

export const FormSelectEditor: React.FC<NodeComponentProps> = ({ node }) => {
  const s = useNodeStyle(node)
  const fieldName = (node.props.fieldName as string) || 'field'
  const label = (node.props.label as string) || ''
  const options = selectOptions(node)
  return (
    <label
      id={elementId(node)}
      className={buildClassName(s, withCustomCss(node, 'flex flex-col gap-1.5'))}
      style={buildInlineStyle(s, { skipSizing: true })}
    >
      {label && <span className={fieldLabelClass}>{label}{!!node.props.required && <span className="text-red-500"> *</span>}</span>}
      <select name={fieldName} disabled className={inputBaseClass}>
        {options.map((opt, i) => <option key={i}>{opt}</option>)}
      </select>
    </label>
  )
}

export const FormSelectPreview: React.FC<NodeComponentProps> = ({ node, animationRef, animationStyle }) => {
  const s = useNodeStyle(node)
  const fieldName = (node.props.fieldName as string) || 'field'
  const label = (node.props.label as string) || ''
  const options = selectOptions(node)
  return (
    <label
      id={elementId(node)}
      className={buildClassName(s, withCustomCss(node, 'flex flex-col gap-1.5'))}
      style={{ ...buildInlineStyle(s), ...animationStyle }}
    >
      {label && <span className={fieldLabelClass}>{label}{!!node.props.required && <span className="text-red-500"> *</span>}</span>}
      <select
        ref={animationRef as React.Ref<HTMLSelectElement>}
        name={fieldName}
        required={!!node.props.required}
        className={inputBaseClass}
        defaultValue={options[0]}
      >
        {options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
      </select>
    </label>
  )
}

export const FormSelectPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const options = selectOptions(node)
  const t = useT()
  function updateOption(i: number, value: string) { const next = [...options]; next[i] = value; onChange({ options: next }) }
  function addOption()    { onChange({ options: [...options, `Option ${options.length + 1}`] }) }
  function removeOption(i: number) { onChange({ options: options.filter((_, idx) => idx !== i) }) }

  return (
    <div className="space-y-5 p-4">
      <FieldGroup label={t('tabContent')}>
        <label className="block text-xs text-neutral-500 mb-1">{t('formLabelFieldLabel')}</label>
        <input
          className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
          value={(node.props.label as string) ?? ''}
          onChange={e => onChange({ label: e.target.value })}
        />
        <CheckField
          label={t('formRequiredLabel')}
          value={!!node.props.required}
          onChange={v => onChange({ required: v })}
        />
      </FieldGroup>

      <FieldGroup label={t('formOptionsSection')}>
        <div className="space-y-1.5">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                className="flex-1 border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
                value={opt}
                onChange={e => updateOption(i, e.target.value)}
              />
              <button
                onClick={() => removeOption(i)}
                disabled={options.length <= 1}
                className="shrink-0 w-7 h-7 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors text-sm disabled:opacity-30"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button onClick={addOption} className="w-full mt-1 text-xs font-medium text-violet-600 hover:text-violet-700 py-1.5 rounded-md hover:bg-violet-50 transition-colors">
          {t('formAddOptionBtn')}
        </button>
      </FieldGroup>

      <FieldGroup label={t('formFieldNameSection')}>
        <input
          className="w-full border border-neutral-200 rounded-md text-xs font-mono p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
          value={(node.props.fieldName as string) ?? ''}
          onChange={e => onChange({ fieldName: sanitizeFieldName(e.target.value) })}
        />
        <p className="text-[10px] text-neutral-400 -mt-1">{t('formFieldNameNote')}</p>
      </FieldGroup>
      <AnimationPanel node={node} onChange={onChange} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORM CHECKBOX
// ═══════════════════════════════════════════════════════════════════════════════

export const FormCheckboxEditor: React.FC<NodeComponentProps> = ({ node }) => {
  const s = useNodeStyle(node)
  const fieldName = (node.props.fieldName as string) || 'field'
  const label = (node.props.label as string) || 'Checkbox label'
  return (
    <label
      id={elementId(node)}
      className={buildClassName(s, withCustomCss(node, 'flex items-center gap-2'))}
      style={buildInlineStyle(s, { skipSizing: true })}
    >
      <input type="checkbox" name={fieldName} disabled className="w-4 h-4 accent-violet-600" />
      <span className="text-sm text-neutral-700">{label}{!!node.props.required && <span className="text-red-500"> *</span>}</span>
    </label>
  )
}

export const FormCheckboxPreview: React.FC<NodeComponentProps> = ({ node, animationRef, animationStyle }) => {
  const s = useNodeStyle(node)
  const fieldName = (node.props.fieldName as string) || 'field'
  const label = (node.props.label as string) || 'Checkbox label'
  return (
    <label
      id={elementId(node)}
      className={buildClassName(s, withCustomCss(node, 'flex items-center gap-2'))}
      style={{ ...buildInlineStyle(s), ...animationStyle }}
    >
      <input
        ref={animationRef as React.Ref<HTMLInputElement>}
        type="checkbox"
        name={fieldName}
        value="on"
        required={!!node.props.required}
        className="w-4 h-4 accent-violet-600"
      />
      <span className="text-sm text-neutral-700">{label}{!!node.props.required && <span className="text-red-500"> *</span>}</span>
    </label>
  )
}

export const FormCheckboxPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const t = useT()
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label={t('tabContent')}>
        <label className="block text-xs text-neutral-500 mb-1">{t('formLabelFieldLabel')}</label>
        <input
          className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
          value={(node.props.label as string) ?? ''}
          onChange={e => onChange({ label: e.target.value })}
        />
        <CheckField
          label={t('formRequiredLabel')}
          value={!!node.props.required}
          onChange={v => onChange({ required: v })}
        />
      </FieldGroup>
      <FieldGroup label={t('formFieldNameSection')}>
        <input
          className="w-full border border-neutral-200 rounded-md text-xs font-mono p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
          value={(node.props.fieldName as string) ?? ''}
          onChange={e => onChange({ fieldName: sanitizeFieldName(e.target.value) })}
        />
        <p className="text-[10px] text-neutral-400 -mt-1">{t('formFieldNameNote')}</p>
      </FieldGroup>
      <AnimationPanel node={node} onChange={onChange} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORM SUBMIT
// ═══════════════════════════════════════════════════════════════════════════════
// A real <button type="submit">, styled identically to Button's own variant
// system. No href/link fields at all — clicking it submits whatever <form>
// it happens to be nested inside, which is ordinary HTML behavior requiring
// no wiring here. Placed outside any `form` node, it's simply an inert
// (but harmless) submit button with nothing to submit to.

const SUBMIT_VARIANTS: Record<string, string> = {
  solid:   'bg-violet-600 text-white hover:bg-violet-700',
  outline: 'border-2 border-violet-600 text-violet-600 hover:bg-violet-50',
  ghost:   'text-violet-600 hover:bg-violet-50',
}

export const FormSubmitEditor: React.FC<NodeComponentProps> = ({ node }) => {
  const s = useNodeStyle(node)
  const variant = (node.props.variant as string) || 'solid'
  const varClass = SUBMIT_VARIANTS[variant] ?? SUBMIT_VARIANTS.solid
  return (
    <button
      id={elementId(node)}
      type="button"
      onClick={e => e.preventDefault()}
      className={buildClassName(s, withCustomCss(node, `inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-medium transition-colors text-sm ${varClass}`))}
      style={buildInlineStyle(s, { skipSizing: true })}
    >
      {(node.props.label as string) || 'Submit'}
    </button>
  )
}

export const FormSubmitPreview: React.FC<NodeComponentProps> = ({ node, animationRef, animationStyle }) => {
  const s = useNodeStyle(node)
  const variant = (node.props.variant as string) || 'solid'
  const varClass = SUBMIT_VARIANTS[variant] ?? SUBMIT_VARIANTS.solid
  return (
    <button
      ref={animationRef as React.Ref<HTMLButtonElement>}
      id={elementId(node)}
      type="submit"
      className={buildClassName(s, withCustomCss(node, `inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-medium transition-colors text-sm ${varClass}`))}
      style={{ ...buildInlineStyle(s), ...buildHoverTransitionStyle(node), ...animationStyle }}
    >
      {(node.props.label as string) || 'Submit'}
    </button>
  )
}

export const FormSubmitPanel: React.FC<PanelProps> = ({ node, onChange }) => {
  const t = useT()
  return (
    <div className="space-y-5 p-4">
      <FieldGroup label={t('tabContent')}>
        <label className="block text-xs text-neutral-500 mb-1">{t('labelFieldLabel')}</label>
        <input
          className="w-full border border-neutral-200 rounded-md text-sm p-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
          value={(node.props.label as string) ?? ''}
          onChange={e => onChange({ label: e.target.value })}
        />
      </FieldGroup>
      <FieldGroup label={t('tabStyle')}>
        <SelectField
          label={t('variantLabel')}
          value={(node.props.variant as string) ?? 'solid'}
          options={['solid', 'outline', 'ghost']}
          onChange={v => onChange({ variant: v })}
        />
      </FieldGroup>
      <AnimationPanel node={node} onChange={onChange} />
    </div>
  )
}