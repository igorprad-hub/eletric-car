import type { MonthPoint } from './types'

export interface BreakevenResult {
  /** Primeiro mês em que trocar passa a custar menos. `null` se não acontece. */
  month: number | null
  /** Verdadeiro quando a vantagem aparece e depois se perde dentro do horizonte. */
  crossesBack: boolean
}

/**
 * Procura o cruzamento das duas curvas de custo acumulado.
 *
 * O retorno inclui `crossesBack` porque existe um caso real e traiçoeiro: com
 * financiamento longo e depreciação forte, a troca pode ficar barata por um
 * tempo e voltar a ficar cara depois. Anunciar só o primeiro cruzamento nesse
 * caso seria enganoso.
 */
export function findBreakeven(keep: MonthPoint[], swap: MonthPoint[]): BreakevenResult {
  const n = Math.min(keep.length, swap.length)
  let month: number | null = null
  let crossesBack = false

  for (let m = 0; m < n; m++) {
    const swapIsCheaper = swap[m].cumulativeCost <= keep[m].cumulativeCost
    if (month === null && swapIsCheaper) {
      month = keep[m].month
    } else if (month !== null && !swapIsCheaper) {
      crossesBack = true
    }
  }

  return { month, crossesBack }
}
