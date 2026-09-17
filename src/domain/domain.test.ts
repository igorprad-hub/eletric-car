import { describe, expect, it } from 'vitest'

import { freshInputs } from '../data/defaults'
import { valueAtMonth } from './depreciation'
import {
  INMETRO_HIGHWAY_WEIGHT,
  INMETRO_URBAN_WEIGHT,
  computeEnergyUsage,
  normalizeShares,
  splitInmetroRange,
} from './energy'
import { buildFinancingPlan, interestForMonth, remainingBalance } from './financing'
import { computeFuelUsage } from './fuel'
import { escalationFactor } from './ownership'
import { runSensitivity } from './sensitivity'
import { simulate } from './simulate'
import { sumTotals } from './types'
import type { Inputs } from './types'

describe('financiamento (Tabela Price)', () => {
  const plan = buildFinancingPlan(
    { mode: 'financiado', downPayment: 0, monthlyInterestPct: 1, termMonths: 12, feesAndIof: 0 },
    100000,
  )

  it('calcula a parcela pela fórmula da Price', () => {
    // 100.000 a 1% a.m. em 12x dá 8.884,88 na calculadora financeira.
    expect(plan.monthlyPayment).toBeCloseTo(8884.88, 2)
  })

  it('zera o saldo devedor exatamente na última parcela', () => {
    expect(remainingBalance(plan, 12)).toBeCloseTo(0, 6)
    expect(remainingBalance(plan, 11)).toBeGreaterThan(0)
  })

  it('devolve o principal antes da primeira parcela', () => {
    expect(remainingBalance(plan, 0)).toBeCloseTo(100000, 6)
  })

  it('soma dos juros mensais bate com o juro total do contrato', () => {
    let total = 0
    for (let m = 1; m <= 12; m++) total += interestForMonth(plan, m)
    expect(total).toBeCloseTo(plan.totalInterest, 4)
  })

  it('sem juros, amortiza linearmente', () => {
    const semJuros = buildFinancingPlan(
      { mode: 'financiado', downPayment: 0, monthlyInterestPct: 0, termMonths: 10, feesAndIof: 0 },
      50000,
    )
    expect(semJuros.monthlyPayment).toBeCloseTo(5000, 6)
    expect(remainingBalance(semJuros, 4)).toBeCloseTo(30000, 6)
    expect(semJuros.totalInterest).toBeCloseTo(0, 6)
  })

  it('à vista não gera parcela nem juros', () => {
    const avista = buildFinancingPlan(
      { mode: 'avista', downPayment: 0, monthlyInterestPct: 2, termMonths: 48, feesAndIof: 900 },
      150000,
    )
    expect(avista.monthlyPayment).toBe(0)
    expect(avista.principal).toBe(0)
  })

  it('entrada cobrindo o carro inteiro não deixa nada a financiar', () => {
    const quitado = buildFinancingPlan(
      { mode: 'financiado', downPayment: 150000, monthlyInterestPct: 2, termMonths: 48, feesAndIof: 900 },
      150000,
    )
    expect(quitado.principal).toBe(0)
    expect(quitado.monthlyPayment).toBe(0)
  })
})

describe('combustível', () => {
  const base = freshInputs()

  it('usa km/l separados para cidade e estrada', () => {
    const car = { ...base.currentCar, fuelKind: 'gasolina' as const, kmPerLiterCity: 10, kmPerLiterHighway: 20, fuelPrice: 6 }
    const usage = { kmCityPerMonth: 1000, kmHighwayPerMonth: 1000 }
    const r = computeFuelUsage(car, usage)
    expect(r.litersPerMonth).toBeCloseTo(150, 6) // 100 + 50
    expect(r.costPerMonth).toBeCloseTo(900, 6)
  })

  it('no modo gasto, o valor informado manda', () => {
    const car = { ...base.currentCar, inputMode: 'gasto' as const, monthlyFuelSpend: 777 }
    const r = computeFuelUsage(car, { kmCityPerMonth: 1000, kmHighwayPerMonth: 0 })
    expect(r.costPerMonth).toBe(777)
  })

  it('etanol consome mais litros para a mesma distância', () => {
    const car = {
      ...base.currentCar,
      fuelKind: 'flex' as const,
      kmPerLiterCity: 10,
      kmPerLiterHighway: 10,
      ethanolSharePct: 100,
      ethanolEfficiencyFactor: 0.7,
      ethanolPrice: 4,
    }
    const r = computeFuelUsage(car, { kmCityPerMonth: 700, kmHighwayPerMonth: 0 })
    expect(r.litersPerMonth).toBeCloseTo(100, 6) // 70 km/l-equivalente virou 70/0,7
    expect(r.costPerMonth).toBeCloseTo(400, 6)
  })
})

describe('energia e recarga', () => {
  const base = freshInputs()

  it('reescala o mix quando não soma 100%', () => {
    const charging = structuredClone(base.charging)
    charging.sources.casa.sharePct = 50
    charging.sources.publicoAC.sharePct = 0
    charging.sources.dcRapido.sharePct = 0
    const warnings: string[] = []
    const shares = normalizeShares(charging, warnings)
    expect(shares.casa).toBeCloseTo(1, 6)
    expect(warnings.length).toBe(1)
  })

  it('ignora a fonte solar quando não há painel', () => {
    const charging = structuredClone(base.charging)
    charging.hasSolar = false
    charging.sources.solar.sharePct = 50
    const shares = normalizeShares(charging)
    expect(shares.solar).toBe(0)
  })

  it('o que passa do excedente solar volta para a tarifa de casa', () => {
    const charging = structuredClone(base.charging)
    charging.hasSolar = true
    charging.solarSurplusKwhPerMonth = 50
    charging.sources.solar.sharePct = 100
    charging.sources.solar.pricePerKwh = 0.3
    charging.sources.casa.sharePct = 0
    charging.sources.casa.pricePerKwh = 1
    charging.sources.publicoAC.sharePct = 0
    charging.sources.dcRapido.sharePct = 0

    // highwayPenalty 1 achata os dois ciclos: 50 kWh / 250 km = 20 kWh/100km.
    const ev = {
      ...base.ev,
      batteryKwh: 50,
      rangeInmetroKm: 250,
      highwayPenalty: 1,
      realWorldFactor: 1,
      chargingEfficiency: 1,
    }
    // 500 km a 20 kWh/100km = 100 kWh. 50 kWh no sol, 50 kWh na tarifa de casa.
    const r = computeEnergyUsage(ev, { kmCityPerMonth: 500, kmHighwayPerMonth: 0 }, charging)
    expect(r.kwhBilledPerMonth).toBeCloseTo(100, 6)
    expect(r.solarKwhUsed).toBeCloseTo(50, 6)
    expect(r.costPerMonth).toBeCloseTo(50 * 0.3 + 50 * 1, 6)
    expect(r.warnings.length).toBeGreaterThan(0)
  })

  it('reparte a autonomia da etiqueta pelos pesos do Inmetro', () => {
    // O EX2 tem 289 km de etiqueta. Com estrada consumindo 30% a mais:
    // urbana = 289 × (0,55 + 0,45×1,3) = 328 km; rodoviária = 328 / 1,3 = 252 km.
    const { cityKm, highwayKm } = splitInmetroRange(289, 1.3)
    expect(cityKm).toBeCloseTo(328, 0)
    expect(highwayKm).toBeCloseTo(252, 0)
  })

  it('a autonomia repartida recompõe o número da etiqueta', () => {
    // Prova de consistência: o consumo combinado 55/45 tem que devolver os 289 km.
    const range = 289
    const battery = 39.4
    const { cityKm, highwayKm } = splitInmetroRange(range, 1.3)
    const combinado =
      INMETRO_URBAN_WEIGHT * (battery / cityKm) + INMETRO_HIGHWAY_WEIGHT * (battery / highwayKm)
    expect(battery / combinado).toBeCloseTo(range, 6)
  })

  it('sem penalidade de estrada, os dois ciclos valem a etiqueta', () => {
    const { cityKm, highwayKm } = splitInmetroRange(300, 1)
    expect(cityKm).toBeCloseTo(300, 6)
    expect(highwayKm).toBeCloseTo(300, 6)
  })

  it('gasta mais na estrada que na cidade', () => {
    const r = computeEnergyUsage(base.ev, base.usage, base.charging)
    expect(r.kwhPer100kmHighway).toBeGreaterThan(r.kwhPer100kmCity)
  })

  it('perdas de carga aumentam os kWh cobrados', () => {
    const ev = { ...base.ev, chargingEfficiency: 0.8 }
    const r = computeEnergyUsage(ev, base.usage, base.charging)
    expect(r.kwhBilledPerMonth).toBeCloseTo(r.kwhAtWheelPerMonth / 0.8, 6)
  })
})

describe('depreciação', () => {
  it('decai geometricamente por ano', () => {
    expect(valueAtMonth(100000, 0.2, 12, 0)).toBeCloseTo(80000, 6)
    expect(valueAtMonth(100000, 0.2, 24, 0)).toBeCloseTo(64000, 6)
  })

  it('respeita o piso', () => {
    expect(valueAtMonth(100000, 0.5, 120, 0.1)).toBeCloseTo(10000, 6)
  })
})

describe('reajuste anual', () => {
  it('só muda na virada de cada 12 meses', () => {
    expect(escalationFactor(0.1, 1)).toBeCloseTo(1, 6)
    expect(escalationFactor(0.1, 12)).toBeCloseTo(1, 6)
    expect(escalationFactor(0.1, 13)).toBeCloseTo(1.1, 6)
    expect(escalationFactor(0.1, 25)).toBeCloseTo(1.21, 6)
  })
})

describe('simulação', () => {
  it('manter o carro começa com custo zero', () => {
    const r = simulate(freshInputs())
    expect(r.keep.months[0].cumulativeCost).toBeCloseTo(0, 6)
  })

  it('trocar começa custando a infraestrutura mais as tarifas do financiamento', () => {
    const inputs = freshInputs()
    const r = simulate(inputs)
    const esperado =
      inputs.charging.chargerCost + inputs.charging.installationCost + inputs.payment.feesAndIof
    expect(r.swap.months[0].cumulativeCost).toBeCloseTo(esperado, 4)
  })

  it('o custo acumulado no fim bate com a soma das categorias', () => {
    const inputs = freshInputs()
    const r = simulate(inputs)
    const h = r.horizonMonths
    expect(r.keep.months[h].cumulativeCost).toBeCloseTo(sumTotals(r.keep.totals), 2)
    expect(r.swap.months[h].cumulativeCost).toBeCloseTo(sumTotals(r.swap.totals), 2)
  })

  it('reconcilia também quando o financiamento passa do horizonte', () => {
    const inputs = freshInputs()
    inputs.horizonMonths = 24
    inputs.payment.termMonths = 60
    const r = simulate(inputs)
    expect(r.swap.months[24].debt).toBeGreaterThan(0)
    expect(r.swap.months[24].cumulativeCost).toBeCloseTo(sumTotals(r.swap.totals), 2)
    expect(r.warnings.some((w) => w.includes('saldo devedor'))).toBe(true)
  })

  it('reconcilia à vista', () => {
    const inputs = freshInputs()
    inputs.payment.mode = 'avista'
    const r = simulate(inputs)
    const h = r.horizonMonths
    expect(r.swap.months[h].cumulativeCost).toBeCloseTo(sumTotals(r.swap.totals), 2)
    expect(r.monthlyPayment).toBe(0)
  })

  it('sem rodar nada, a troca nunca se paga', () => {
    const inputs = freshInputs()
    inputs.usage = { kmCityPerMonth: 0, kmHighwayPerMonth: 0 }
    const r = simulate(inputs)
    expect(r.breakevenMonth).toBeNull()
    expect(r.totalDifference).toBeLessThan(0)
  })

  it('rodar muito antecipa o breakeven', () => {
    const pouco = freshInputs()
    pouco.usage = { kmCityPerMonth: 500, kmHighwayPerMonth: 0 }
    const muito = freshInputs()
    muito.usage = { kmCityPerMonth: 4000, kmHighwayPerMonth: 0 }

    const rPouco = simulate(pouco)
    const rMuito = simulate(muito)
    expect(rMuito.totalDifference).toBeGreaterThan(rPouco.totalDifference)
  })

  it('combustível mais caro favorece a troca', () => {
    const barato = freshInputs()
    barato.currentCar.fuelPrice = 4
    const caro = freshInputs()
    caro.currentCar.fuelPrice = 9
    expect(simulate(caro).totalDifference).toBeGreaterThan(simulate(barato).totalDifference)
  })

  it('não quebra com horizonte de um mês', () => {
    const inputs = freshInputs()
    inputs.horizonMonths = 1
    const r = simulate(inputs)
    expect(Number.isFinite(r.totalDifference)).toBe(true)
    expect(r.keep.months.length).toBe(2)
  })

  it('isenção de IPVA no estado zera o imposto do elétrico', () => {
    const inputs = freshInputs()
    inputs.ownership.uf = 'RJ'
    const r = simulate(inputs)
    expect(r.swap.totals.ipva).toBeCloseTo(0, 6)
    expect(r.keep.totals.ipva).toBeGreaterThan(0)
  })

  it('o override de IPVA ganha da tabela do estado', () => {
    const inputs = freshInputs()
    inputs.ownership.uf = 'RJ'
    inputs.ownership.ipvaOverrideEv = 1200
    const r = simulate(inputs)
    expect(r.swap.totals.ipva).toBeCloseTo(1200 * 5, 2)
  })
})

describe('sensibilidade', () => {
  const inputs: Inputs = freshInputs()

  it('acha o preço de combustível que vira a decisão', () => {
    const sweep = runSensitivity(inputs, 'fuelPrice')
    expect(sweep.points.length).toBeGreaterThan(5)
    if (sweep.tippingPoint !== null) {
      expect(sweep.tippingPoint).toBeGreaterThan(0)
    }
    // Quanto mais caro o combustível, melhor fica trocar.
    expect(sweep.points[sweep.points.length - 1].difference).toBeGreaterThan(
      sweep.points[0].difference,
    )
  })

  it('mais juros piora a troca', () => {
    const sweep = runSensitivity(inputs, 'interestRate')
    expect(sweep.points[sweep.points.length - 1].difference).toBeLessThan(sweep.points[0].difference)
  })

  it('todas as variáveis produzem curva finita', () => {
    for (const id of ['fuelPrice', 'kmPerMonth', 'kwhPrice', 'evPrice', 'interestRate', 'evDepreciation'] as const) {
      const sweep = runSensitivity(inputs, id, 9)
      expect(sweep.points.every((p) => Number.isFinite(p.difference))).toBe(true)
    }
  })
})
