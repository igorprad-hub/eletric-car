import { getState } from '../data/states'
import type { OwnershipInputs } from './types'

/**
 * IPVA anual estimado.
 *
 * A base legal é o valor venal (tabela Fipe). Aqui usamos o valor do carro já
 * depreciado naquele ano como aproximação, que é o comportamento certo: o imposto
 * cai junto com o carro.
 *
 * O campo de override existe porque a regra estadual para elétricos muda toda
 * hora. Se o usuário sabe quanto paga, o número dele ganha da nossa tabela.
 */
export function annualIpva(
  ownership: OwnershipInputs,
  vehicleValue: number,
  isElectric: boolean,
): number {
  const override = isElectric ? ownership.ipvaOverrideEv : ownership.ipvaOverrideIce
  if (override !== null && Number.isFinite(override)) return Math.max(override, 0)

  const state = getState(ownership.uf)
  const value = Math.max(vehicleValue, 0)

  if (!isElectric) return value * state.rate

  switch (state.evRule) {
    case 'isento':
      return 0
    case 'reduzido':
      return value * (state.evRate ?? state.rate)
    default:
      return value * state.rate
  }
}

/** Converte uma taxa anual de reajuste no multiplicador do ano corrente da simulação. */
export function escalationFactor(ratePerYear: number, month: number): number {
  const rate = Number.isFinite(ratePerYear) ? ratePerYear : 0
  const yearIndex = Math.floor(Math.max(month - 1, 0) / 12)
  return Math.pow(1 + rate, yearIndex)
}
