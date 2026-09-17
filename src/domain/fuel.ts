import type { CurrentCarInputs, UsageInputs } from './types'

export interface FuelUsage {
  litersPerMonth: number
  costPerMonth: number
  /** Preço médio efetivamente pago por litro, já ponderado no caso flex. */
  effectivePricePerLiter: number
}

/**
 * Consumo e custo mensal do carro a combustão.
 *
 * No modo 'gasto' o usuário informa direto quanto gasta por mês, o que costuma ser
 * bem mais fiel do que o km/l que ele acha que faz. Nesse caso os litros são
 * reconstruídos a partir do preço só para poder mostrar o consumo médio na tela.
 *
 * No flex, rodar com etanol consome mais litros para a mesma distância. O fator de
 * eficiência (~0,70) converte isso: a parcela de km feita com etanol tem o km/l
 * reduzido na mesma proporção.
 */
export function computeFuelUsage(car: CurrentCarInputs, usage: UsageInputs): FuelUsage {
  const totalKm = usage.kmCityPerMonth + usage.kmHighwayPerMonth

  if (car.inputMode === 'gasto') {
    const price = car.fuelPrice > 0 ? car.fuelPrice : 1
    return {
      litersPerMonth: car.monthlyFuelSpend / price,
      costPerMonth: car.monthlyFuelSpend,
      effectivePricePerLiter: price,
    }
  }

  const cityKmPerL = Math.max(car.kmPerLiterCity, 0.1)
  const highwayKmPerL = Math.max(car.kmPerLiterHighway, 0.1)

  if (car.fuelKind !== 'flex') {
    const liters = usage.kmCityPerMonth / cityKmPerL + usage.kmHighwayPerMonth / highwayKmPerL
    return {
      litersPerMonth: liters,
      costPerMonth: liters * car.fuelPrice,
      effectivePricePerLiter: car.fuelPrice,
    }
  }

  const ethanolShare = clamp01(car.ethanolSharePct / 100)
  const effFactor = car.ethanolEfficiencyFactor > 0 ? car.ethanolEfficiencyFactor : 0.7

  const cityShare = totalKm > 0 ? usage.kmCityPerMonth / totalKm : 1
  const blendedKmPerL = 1 / (cityShare / cityKmPerL + (1 - cityShare) / highwayKmPerL)

  const gasolineLiters = (totalKm * (1 - ethanolShare)) / blendedKmPerL
  const ethanolLiters = (totalKm * ethanolShare) / (blendedKmPerL * effFactor)
  const liters = gasolineLiters + ethanolLiters
  const cost = gasolineLiters * car.fuelPrice + ethanolLiters * car.ethanolPrice

  return {
    litersPerMonth: liters,
    costPerMonth: cost,
    effectivePricePerLiter: liters > 0 ? cost / liters : car.fuelPrice,
  }
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0
  return Math.min(1, Math.max(0, v))
}
