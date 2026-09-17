import { describe, expect, it } from 'vitest'

import { freshInputs } from '../data/defaults'
import { diffFromDefaults, mergeDefaults } from './usePersistedState'

describe('cenário compartilhável', () => {
  it('cenário padrão não gera diferença nenhuma', () => {
    expect(diffFromDefaults(freshInputs())).toEqual({})
  })

  it('manda só o campo alterado', () => {
    const i = freshInputs()
    i.usage.kmCityPerMonth = 2750
    expect(diffFromDefaults(i)).toEqual({ usage: { kmCityPerMonth: 2750 } })
  })

  it('pega alterações em campos de primeiro nível', () => {
    const i = freshInputs()
    i.horizonMonths = 84
    expect(diffFromDefaults(i)).toEqual({ horizonMonths: 84 })
  })

  it('inclui o mix de recarga inteiro quando uma fonte muda', () => {
    const i = freshInputs()
    i.charging.sources.dcRapido.sharePct = 40
    const diff = diffFromDefaults(i) as { charging: { sources: Record<string, unknown> } }
    expect(diff.charging.sources).toBeDefined()
    expect(mergeDefaults(diff).charging.sources.dcRapido.sharePct).toBe(40)
  })

  it('ida e volta preserva o cenário', () => {
    const i = freshInputs()
    i.usage.kmCityPerMonth = 3100
    i.ev.price = 187900
    i.payment.mode = 'avista'
    i.ownership.uf = 'RJ'
    i.charging.hasSolar = true

    expect(mergeDefaults(diffFromDefaults(i))).toEqual(i)
  })

  it('cenário salvo sem campos novos abre nos padrões', () => {
    const parcial = { usage: { kmCityPerMonth: 900 } }
    const merged = mergeDefaults(parcial)
    expect(merged.usage.kmCityPerMonth).toBe(900)
    expect(merged.usage.kmHighwayPerMonth).toBe(freshInputs().usage.kmHighwayPerMonth)
    expect(merged.ev.price).toBe(freshInputs().ev.price)
  })

  it('lixo no storage não derruba a tela', () => {
    expect(mergeDefaults(null)).toEqual(freshInputs())
    expect(mergeDefaults('nada disso')).toEqual(freshInputs())
  })
})
