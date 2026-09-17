import { useId, useState } from 'react'
import type { ReactNode } from 'react'

import { num, parseNumber } from '../../format'

interface NumberFieldProps {
  label: string
  value: number
  onChange: (v: number) => void
  prefix?: string
  suffix?: string
  hint?: ReactNode
  decimals?: number
  min?: number
  max?: number
  className?: string
}

/**
 * Campo numérico que não briga com o usuário enquanto ele digita.
 *
 * O texto fica em estado local durante a edição, então apagar tudo para redigitar
 * não faz o valor pular para zero nem o cursor saltar. No blur o rascunho é
 * descartado e o campo volta a exibir o número formatado.
 */
export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
  decimals = 0,
  min,
  max,
  className,
}: NumberFieldProps) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)

  const display = draft ?? num(value, decimals)

  function handleChange(raw: string) {
    setDraft(raw)
    const parsed = parseNumber(raw)
    if (parsed === null) return
    let next = parsed
    if (min !== undefined) next = Math.max(next, min)
    if (max !== undefined) next = Math.min(next, max)
    onChange(next)
  }

  return (
    <div className={'field' + (className ? ' ' + className : '')}>
      <label htmlFor={id}>{label}</label>
      <div className="input-shell">
        {prefix && <span className="affix">{prefix}</span>}
        <input
          id={id}
          inputMode="decimal"
          value={display}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => setDraft(null)}
        />
        {suffix && <span className="affix">{suffix}</span>}
      </div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  )
}

interface SelectFieldProps<T extends string> {
  label: string
  value: T
  onChange: (v: T) => void
  options: Array<{ value: T; label: string }>
  hint?: ReactNode
  className?: string
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  className,
}: SelectFieldProps<T>) {
  const id = useId()
  return (
    <div className={'field' + (className ? ' ' + className : '')}>
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <div className="hint">{hint}</div>}
    </div>
  )
}

interface SegmentedProps<T extends string> {
  label?: string
  value: T
  onChange: (v: T) => void
  options: Array<{ value: T; label: string }>
}

export function Segmented<T extends string>({ label, value, onChange, options }: SegmentedProps<T>) {
  return (
    <div className="field">
      {label && <span className="fieldset-label">{label}</span>}
      <div className="segmented" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Check({
  label,
  checked,
  onChange,
}: {
  label: ReactNode
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

export function Advanced({ children, label = 'Avançado' }: { children: ReactNode; label?: string }) {
  return (
    <details className="advanced">
      <summary>{label}</summary>
      <div className="advanced-body">{children}</div>
    </details>
  )
}

export function Note({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'warning'
}) {
  return (
    <div className={'note' + (tone === 'warning' ? ' note-warning' : '')}>
      <span className="note-icon" aria-hidden="true">
        {tone === 'warning' ? '!' : 'i'}
      </span>
      <div>{children}</div>
    </div>
  )
}

export function Card({
  title,
  step,
  children,
}: {
  title: string
  step?: string
  children: ReactNode
}) {
  return (
    <section className="card">
      <header>
        <h2>{title}</h2>
        {step && <span className="step">{step}</span>}
      </header>
      {children}
    </section>
  )
}
