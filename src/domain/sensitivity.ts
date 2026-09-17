import { CHARGING_SOURCE_IDS } from './energy'
import { simulate } from './simulate'
import type { Inputs } from './types'

export type SensitivityId =
  | 'fuelPrice'
  | 'kmPerMonth'
  | 'kwhPrice'
  | 'evPrice'
  | 'interestRate'
  | 'evDepreciation'

export interface SensitivityPoint {
  x: number
  /** keep.totalCost − swap.totalCost. Positivo significa que trocar compensa. */
  difference: number
  breakevenMonth: number | null
}

export interface SensitivitySweep {
  id: SensitivityId
  label: string
  question: string
  points: SensitivityPoint[]
  currentX: number
  /** Valor da variável em que a troca deixa de compensar (ou passa a compensar). */
  tippingPoint: number | null
  format: (v: number) => string
}

interface VariableDef {
  id: SensitivityId
  label: string
  question: string
  read: (i: Inputs) => number
  write: (i: Inputs, v: number) => Inputs
  /** Faixa varrida, a partir do valor atual. */
  range: (current: number, i: Inputs) => [number, number]
  format: (v: number) => string
}

const brl = (v: number) =>
  'R$ ' +
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const brl0 = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })

const VARIABLES: VariableDef[] = [
  {
    id: 'fuelPrice',
    label: 'Preço do combustível',
    question: 'A que preço do litro a troca passa a compensar?',
    read: (i) => i.currentCar.fuelPrice,
    write: (i, v) => {
      const ratio = i.currentCar.fuelPrice > 0 ? v / i.currentCar.fuelPrice : 1
      return {
        ...i,
        currentCar: {
          ...i.currentCar,
          fuelPrice: v,
          ethanolPrice: i.currentCar.ethanolPrice * ratio,
          monthlyFuelSpend: i.currentCar.monthlyFuelSpend * ratio,
        },
      }
    },
    range: (c) => [Math.max(c * 0.5, 1), c * 1.8],
    format: (v) => brl(v) + '/L',
  },
  {
    id: 'kmPerMonth',
    label: 'Quilometragem mensal',
    question: 'Rodando quanto por mês a troca passa a compensar?',
    read: (i) => i.usage.kmCityPerMonth + i.usage.kmHighwayPerMonth,
    write: (i, v) => {
      const total = i.usage.kmCityPerMonth + i.usage.kmHighwayPerMonth
      if (total <= 0) return { ...i, usage: { kmCityPerMonth: v, kmHighwayPerMonth: 0 } }
      const ratio = v / total
      return {
        ...i,
        usage: {
          kmCityPerMonth: i.usage.kmCityPerMonth * ratio,
          kmHighwayPerMonth: i.usage.kmHighwayPerMonth * ratio,
        },
      }
    },
    range: (c) => [0, Math.max(c * 2.5, 1000)],
    format: (v) => Math.round(v).toLocaleString('pt-BR') + ' km/mês',
  },
  {
    id: 'kwhPrice',
    label: 'Preço médio do kWh',
    question: 'Até que preço da energia a troca continua compensando?',
    read: (i) => simulate(i).effectiveKwhPrice,
    write: (i, v) => {
      const base = simulate(i).effectiveKwhPrice
      if (base <= 0) return i
      const ratio = v / base
      const sources = { ...i.charging.sources }
      for (const id of CHARGING_SOURCE_IDS) {
        sources[id] = { ...sources[id], pricePerKwh: sources[id].pricePerKwh * ratio }
      }
      return { ...i, charging: { ...i.charging, sources } }
    },
    range: (c) => [0, Math.max(c * 2.5, 1)],
    format: (v) => brl(v) + '/kWh',
  },
  {
    id: 'evPrice',
    label: 'Preço do elétrico',
    question: 'Por quanto o elétrico precisaria sair para compensar?',
    read: (i) => i.ev.price,
    write: (i, v) => ({ ...i, ev: { ...i.ev, price: v } }),
    range: (c) => [Math.max(c * 0.5, 20000), c * 1.5],
    format: brl0,
  },
  {
    id: 'interestRate',
    label: 'Juros do financiamento',
    question: 'Até que taxa ao mês o financiamento ainda fecha a conta?',
    read: (i) => i.payment.monthlyInterestPct,
    write: (i, v) => ({ ...i, payment: { ...i.payment, monthlyInterestPct: v } }),
    range: () => [0, 3.5],
    format: (v) => v.toFixed(2).replace('.', ',') + '% a.m.',
  },
  {
    id: 'evDepreciation',
    label: 'Depreciação do elétrico',
    question: 'Quanto o elétrico pode desvalorizar por ano sem estragar a conta?',
    read: (i) => i.ev.depreciationRatePerYear * 100,
    write: (i, v) => ({ ...i, ev: { ...i.ev, depreciationRatePerYear: v / 100 } }),
    range: () => [5, 35],
    format: (v) => v.toFixed(0) + '% ao ano',
  },
]

export const SENSITIVITY_VARIABLES = VARIABLES.map(({ id, label, question }) => ({
  id,
  label,
  question,
}))

/**
 * Varre uma variável de cada vez e devolve a curva do resultado.
 *
 * Esta é, na prática, a parte mais honesta da ferramenta. Um número único
 * ("compensa em 41 meses") esconde o quanto ele depende de premissas que
 * ninguém consegue prever. A curva mostra onde está a virada.
 */
export function runSensitivity(inputs: Inputs, id: SensitivityId, steps = 21): SensitivitySweep {
  const def = VARIABLES.find((v) => v.id === id) ?? VARIABLES[0]
  const currentX = def.read(inputs)
  const [min, max] = def.range(currentX, inputs)
  const span = max - min

  const points: SensitivityPoint[] = []
  for (let s = 0; s < steps; s++) {
    const x = min + (span * s) / (steps - 1)
    const result = simulate(def.write(inputs, x))
    points.push({ x, difference: result.totalDifference, breakevenMonth: result.breakevenMonth })
  }

  return {
    id: def.id,
    label: def.label,
    question: def.question,
    points,
    currentX,
    tippingPoint: findTippingPoint(points),
    format: def.format,
  }
}

/**
 * Onde a curva cruza o zero, por interpolação linear entre dois pontos vizinhos.
 * Precisão suficiente: a incerteza das premissas é ordens de grandeza maior que a
 * do método.
 */
function findTippingPoint(points: SensitivityPoint[]): number | null {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    if (a.difference === 0) return a.x
    if (a.difference < 0 === b.difference < 0) continue
    const t = -a.difference / (b.difference - a.difference)
    return a.x + t * (b.x - a.x)
  }
  return null
}
