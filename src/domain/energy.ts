import type { ChargingInputs, ChargingSourceId, EvInputs, UsageInputs } from './types'

export interface EnergyUsage {
  /** Consumo real estimado na cidade, kWh por 100 km. */
  kwhPer100kmCity: number
  kwhPer100kmHighway: number
  /** Média ponderada pelo perfil de uso. */
  kwhPer100km: number
  /** kWh na roda, antes das perdas de carga. */
  kwhAtWheelPerMonth: number
  /** kWh que aparecem na conta de luz ou no app do eletroposto. */
  kwhBilledPerMonth: number
  costPerMonth: number
  effectivePricePerKwh: number
  /** Quanto do consumo mensal a geração solar realmente cobre. */
  solarKwhUsed: number
  warnings: string[]
}

export const CHARGING_SOURCE_IDS: ChargingSourceId[] = [
  'casa',
  'branca',
  'solar',
  'publicoAC',
  'dcRapido',
  'gratis',
]

export const CHARGING_SOURCE_LABELS: Record<ChargingSourceId, string> = {
  casa: 'Casa, tarifa normal',
  branca: 'Casa, tarifa branca (madrugada)',
  solar: 'Geração solar própria',
  publicoAC: 'Público AC (rua, shopping)',
  dcRapido: 'DC rápido (rodovia)',
  gratis: 'Grátis (trabalho, shopping)',
}

/** Pesos do ciclo Inmetro: 55% urbano (FTP-75) e 45% rodoviário (HWFET), método EPA. */
export const INMETRO_URBAN_WEIGHT = 0.55
export const INMETRO_HIGHWAY_WEIGHT = 0.45

/**
 * Reparte a autonomia da etiqueta entre ciclo urbano e rodoviário.
 *
 * A etiqueta do Inmetro traz um número só. Por baixo dele o PBE Veicular roda os
 * dois ciclos e combina o CONSUMO (não a autonomia) pela média ponderada
 * 55/45. Ou seja, com c o consumo e k quanto a estrada consome a mais:
 *
 *   c = 0,55·c_urbano + 0,45·k·c_urbano  =>  c_urbano = c / (0,55 + 0,45k)
 *
 * Como autonomia é bateria dividida por consumo, isso vira:
 *
 *   autonomia_urbana   = autonomia_etiqueta × (0,55 + 0,45k)
 *   autonomia_estrada  = autonomia_urbana / k
 *
 * Para um EX2 de 289 km com k = 1,30: 328 km na cidade, 252 km na estrada. É
 * derivação, não medição — por isso k fica editável na tela.
 */
export function splitInmetroRange(
  rangeInmetroKm: number,
  highwayPenalty: number,
): { cityKm: number; highwayKm: number } {
  const range = Math.max(rangeInmetroKm, 1)
  const k = clampRange(highwayPenalty, 1, 2.5, 1.3)
  const cityKm = range * (INMETRO_URBAN_WEIGHT + INMETRO_HIGHWAY_WEIGHT * k)
  return { cityKm, highwayKm: cityKm / k }
}

/**
 * Consumo do elétrico a partir da autonomia Inmetro.
 *
 * Duas coisas que o senso comum erra aqui:
 *
 * 1. Elétrico gasta MAIS na estrada, ao contrário do combustão. Em velocidade
 *    constante alta o arrasto aerodinâmico domina e quase não há frenagem
 *    regenerativa. Daí o ciclo rodoviário puxar a autonomia para baixo.
 * 2. A autonomia Inmetro sai de ciclo de laboratório. O fator de realidade aplica
 *    o desconto de ar-condicionado, clima, carga e estilo de condução.
 */
export function computeEnergyUsage(
  ev: EvInputs,
  usage: UsageInputs,
  charging: ChargingInputs,
): EnergyUsage {
  const warnings: string[] = []
  const realFactor = clampRange(ev.realWorldFactor, 0.4, 1.2, 0.85)
  const efficiency = clampRange(ev.chargingEfficiency, 0.5, 1, 0.88)

  const { cityKm: rangeCity, highwayKm: rangeHighway } = splitInmetroRange(
    ev.rangeInmetroKm,
    ev.highwayPenalty,
  )
  const battery = Math.max(ev.batteryKwh, 0.1)

  // Autonomia real menor significa consumo por km maior, daí a divisão pelo fator.
  const kwhPer100kmCity = (battery / (rangeCity * realFactor)) * 100
  const kwhPer100kmHighway = (battery / (rangeHighway * realFactor)) * 100

  const kmCity = Math.max(usage.kmCityPerMonth, 0)
  const kmHighway = Math.max(usage.kmHighwayPerMonth, 0)
  const totalKm = kmCity + kmHighway

  const kwhAtWheelPerMonth =
    (kmCity * kwhPer100kmCity) / 100 + (kmHighway * kwhPer100kmHighway) / 100
  const kwhPer100km = totalKm > 0 ? (kwhAtWheelPerMonth / totalKm) * 100 : kwhPer100kmCity

  const kwhBilledPerMonth = kwhAtWheelPerMonth / efficiency

  const priced = priceEnergy(kwhBilledPerMonth, charging)
  warnings.push(...priced.mixWarnings)

  return {
    kwhPer100kmCity,
    kwhPer100kmHighway,
    kwhPer100km,
    kwhAtWheelPerMonth,
    kwhBilledPerMonth,
    costPerMonth: priced.cost,
    effectivePricePerKwh: kwhBilledPerMonth > 0 ? priced.cost / kwhBilledPerMonth : 0,
    solarKwhUsed: priced.solarKwhUsed,
    warnings,
  }
}

/**
 * Aplica o mix de recarga sobre os kWh do mês.
 *
 * A fonte solar é a única com teto: ela só cobre até o excedente de geração que
 * sobra depois do consumo da casa. O que passar disso não desaparece, cai na
 * tarifa residencial normal, que é o que acontece na vida real.
 */
function priceEnergy(
  kwhBilled: number,
  charging: ChargingInputs,
): { cost: number; solarKwhUsed: number; mixWarnings: string[] } {
  const mixWarnings: string[] = []
  const shares = normalizeShares(charging, mixWarnings)

  let cost = 0
  let solarKwhUsed = 0

  for (const id of CHARGING_SOURCE_IDS) {
    const share = shares[id]
    if (share <= 0) continue
    const kwh = kwhBilled * share
    const price = Math.max(charging.sources[id].pricePerKwh, 0)

    if (id === 'solar') {
      const cap = charging.hasSolar ? Math.max(charging.solarSurplusKwhPerMonth, 0) : 0
      const covered = Math.min(kwh, cap)
      const overflow = kwh - covered
      solarKwhUsed = covered
      cost += covered * price + overflow * Math.max(charging.sources.casa.pricePerKwh, 0)
      if (overflow > 0.5 && charging.hasSolar) {
        mixWarnings.push(
          'A geração solar cobre ' +
            Math.round(covered) +
            ' kWh dos ' +
            Math.round(kwh) +
            ' kWh/mês que você quer tirar do sol. O resto foi cobrado na tarifa normal.',
        )
      }
      continue
    }

    cost += kwh * price
  }

  return { cost, solarKwhUsed, mixWarnings }
}

/**
 * Converte os percentuais do mix em frações que somam 1.
 *
 * Se o usuário deixou o mix em 90% ou em 130%, reescalar é melhor do que travar o
 * cálculo: o resultado continua fazendo sentido e o aviso explica o que houve.
 */
export function normalizeShares(
  charging: ChargingInputs,
  warnings: string[] = [],
): Record<ChargingSourceId, number> {
  const raw = {} as Record<ChargingSourceId, number>
  let total = 0

  for (const id of CHARGING_SOURCE_IDS) {
    const usable =
      id === 'solar' && !charging.hasSolar ? 0 : Math.max(charging.sources[id].sharePct, 0)
    raw[id] = usable
    total += usable
  }

  if (total <= 0) {
    const fallback = {} as Record<ChargingSourceId, number>
    for (const id of CHARGING_SOURCE_IDS) fallback[id] = id === 'casa' ? 1 : 0
    warnings.push('Nenhuma fonte de recarga marcada. Considerei 100% em casa na tarifa normal.')
    return fallback
  }

  if (Math.abs(total - 100) > 0.5) {
    warnings.push(
      'As fontes de recarga somam ' +
        Math.round(total) +
        '%, não 100%. Reajustei proporcionalmente para fechar a conta.',
    )
  }

  const out = {} as Record<ChargingSourceId, number>
  for (const id of CHARGING_SOURCE_IDS) out[id] = raw[id] / total
  return out
}

export function totalInfrastructureCost(charging: ChargingInputs): number {
  if (charging.hasChargerInstalled) return 0
  return Math.max(charging.chargerCost, 0) + Math.max(charging.installationCost, 0)
}

function clampRange(v: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(v) || v <= 0) return fallback
  return Math.min(max, Math.max(min, v))
}
