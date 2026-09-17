import { useCallback, useEffect, useState } from 'react'

import { freshInputs } from '../data/defaults'
import type { Inputs } from '../domain/types'

const STORAGE_KEY = 'eletric-car:inputs:v1'

/**
 * Estado dos formulários, com persistência local e cenário compartilhável na URL.
 *
 * Tudo que vem de fora (localStorage, hash) passa por um merge sobre os padrões.
 * Assim um cenário salvo numa versão anterior, sem os campos novos, continua
 * abrindo em vez de quebrar a tela com `undefined`.
 */
export function usePersistedInputs() {
  const [inputs, setInputs] = useState<Inputs>(() => loadInitial())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs))
    } catch {
      // Modo privativo, cota cheia, storage bloqueado. A calculadora funciona igual.
    }
  }, [inputs])

  const update = useCallback((fn: (draft: Inputs) => void) => {
    setInputs((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setInputs(freshInputs())
    if (location.hash) history.replaceState(null, '', location.pathname + location.search)
  }, [])

  return { inputs, update, reset, setInputs }
}

function loadInitial(): Inputs {
  const fromHash = readHash()
  if (fromHash) return fromHash

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return mergeDefaults(JSON.parse(raw))
  } catch {
    // Ignora e cai nos padrões.
  }

  return freshInputs()
}

function readHash(): Inputs | null {
  const hash = location.hash.replace(/^#/, '')
  if (!hash.startsWith('c=')) return null
  try {
    const json = decodeURIComponent(escape(atob(hash.slice(2).replace(/-/g, '+').replace(/_/g, '/'))))
    return mergeDefaults(JSON.parse(json))
  } catch {
    return null
  }
}

/** Escreve o cenário atual na URL e devolve o link pronto para compartilhar. */
export function buildShareLink(inputs: Inputs): string {
  const json = JSON.stringify(diffFromDefaults(inputs))
  const encoded = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  const url = location.origin + location.pathname + location.search + '#c=' + encoded
  history.replaceState(null, '', '#c=' + encoded)
  return url
}

/**
 * Só o que difere do padrão vai para a URL.
 *
 * O cenário inteiro em JSON dá quase 1.900 caracteres de link, o que atrapalha em
 * mensageiro e em e-mail. Como a leitura já reidrata em cima dos padrões, mandar a
 * diferença basta, e quem só mexeu em dois campos ganha um link curto.
 */
export function diffFromDefaults(inputs: Inputs): Record<string, unknown> {
  const base = freshInputs() as unknown as Record<string, unknown>
  const current = inputs as unknown as Record<string, unknown>
  const out: Record<string, unknown> = {}

  for (const key of Object.keys(current)) {
    const a = current[key]
    const b = base[key]

    if (a !== null && typeof a === 'object' && b !== null && typeof b === 'object') {
      const nested: Record<string, unknown> = {}
      const aObj = a as Record<string, unknown>
      const bObj = b as Record<string, unknown>
      for (const k of Object.keys(aObj)) {
        if (JSON.stringify(aObj[k]) !== JSON.stringify(bObj[k])) nested[k] = aObj[k]
      }
      if (Object.keys(nested).length > 0) out[key] = nested
      continue
    }

    if (a !== b) out[key] = a
  }

  return out
}

/**
 * Merge raso por seção: o suficiente, já que `Inputs` tem só dois níveis
 * (`charging.sources` é tratado à parte).
 */
export function mergeDefaults(raw: unknown): Inputs {
  const base = freshInputs()
  if (!raw || typeof raw !== 'object') return base

  const saved = raw as Partial<Inputs>
  const merged: Inputs = {
    ...base,
    ...saved,
    usage: { ...base.usage, ...saved.usage },
    currentCar: { ...base.currentCar, ...saved.currentCar },
    ev: { ...base.ev, ...saved.ev },
    payment: { ...base.payment, ...saved.payment },
    ownership: { ...base.ownership, ...saved.ownership },
    escalation: { ...base.escalation, ...saved.escalation },
    charging: {
      ...base.charging,
      ...saved.charging,
      sources: { ...base.charging.sources, ...saved.charging?.sources },
    },
  }

  return merged
}
