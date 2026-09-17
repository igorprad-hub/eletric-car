import { findBreakeven } from './breakeven'
import { valueAtMonth } from './depreciation'
import { computeEnergyUsage, totalInfrastructureCost } from './energy'
import {
  buildFinancingPlan,
  interestForMonth,
  paymentForMonth,
  remainingBalance,
} from './financing'
import { computeFuelUsage } from './fuel'
import { annualIpva, escalationFactor } from './ownership'
import { EMPTY_TOTALS, sumTotals } from './types'
import type {
  CategoryTotals,
  Inputs,
  MonthPoint,
  ScenarioResult,
  SimulationResult,
} from './types'

/**
 * O motor da calculadora.
 *
 * A ideia central, e o que separa isso de uma conta de padaria: não comparamos
 * "custo do elétrico" contra zero. Comparamos dois futuros possíveis, cada um com
 * seus custos, sendo que em um deles o carro a combustão continua queimando
 * dinheiro. Manter também custa.
 *
 * Cada cenário é acompanhado por uma posição patrimonial:
 *
 *   posição(m) = -desembolsos acumulados + valor do carro - saldo devedor
 *   custo(m)   = posição inicial comum - posição(m)
 *
 * Os dois cenários partem da mesma posição inicial (hoje você tem o carro a
 * combustão e nenhuma dívida), então as curvas são comparáveis e o cruzamento
 * delas é o breakeven. Como bônus, a depreciação entra diluída mês a mês em vez
 * de dar um salto no último mês do gráfico.
 */
export function simulate(inputs: Inputs): SimulationResult {
  const warnings: string[] = []
  const horizon = Math.max(Math.round(inputs.horizonMonths), 1)
  const floor = inputs.residualFloorPct

  const fuel = computeFuelUsage(inputs.currentCar, inputs.usage)
  const energy = computeEnergyUsage(inputs.ev, inputs.usage, inputs.charging)
  warnings.push(...energy.warnings)

  const infrastructure = totalInfrastructureCost(inputs.charging)
  const plan = buildFinancingPlan(inputs.payment, inputs.ev.price)

  const kmPerMonth = inputs.usage.kmCityPerMonth + inputs.usage.kmHighwayPerMonth
  const totalKm = kmPerMonth * horizon

  // Posição inicial comum aos dois cenários: hoje você tem o carro atual.
  const baseline = Math.max(inputs.currentCar.marketValue, 0)

  const keep = buildKeepScenario(inputs, fuel.costPerMonth, horizon, floor, baseline, totalKm)
  const swap = buildSwapScenario(
    inputs,
    energy.costPerMonth,
    infrastructure,
    plan,
    horizon,
    floor,
    baseline,
    totalKm,
  )

  const breakeven = findBreakeven(keep.months, swap.months)
  if (breakeven.crossesBack) {
    warnings.push(
      'A vantagem da troca aparece e depois se perde dentro do horizonte escolhido. Olhe a curva inteira, não só o mês do breakeven.',
    )
  }

  if (kmPerMonth <= 0) {
    warnings.push('Com 0 km por mês não há combustível a economizar, então a troca nunca se paga.')
  }
  if (plan.termMonths > horizon && plan.principal > 0) {
    warnings.push(
      'O financiamento termina depois do horizonte da análise. O saldo devedor que sobra foi descontado do patrimônio no cenário da troca.',
    )
  }
  if (inputs.ev.depreciationRatePerYear > inputs.currentCar.depreciationRatePerYear + 0.08) {
    warnings.push(
      'Você assumiu uma depreciação bem mais forte para o elétrico. Essa premissa sozinha pode decidir o resultado. Vale testá-la no painel de sensibilidade.',
    )
  }

  const totalDifference = keep.totalCost - swap.totalCost

  return {
    keep,
    swap,
    breakevenMonth: breakeven.month,
    totalDifference,
    averageMonthlySaving: totalDifference / horizon,
    horizonMonths: horizon,
    totalKm,
    monthlyPayment: plan.monthlyPayment,
    evKwhPer100km: energy.kwhPer100km,
    effectiveKwhPrice: energy.effectivePricePerKwh,
    warnings,
  }
}

function buildKeepScenario(
  inputs: Inputs,
  fuelCostPerMonth: number,
  horizon: number,
  floor: number,
  baseline: number,
  totalKm: number,
): ScenarioResult {
  const { currentCar, ownership, escalation } = inputs
  const value0 = Math.max(currentCar.marketValue, 0)
  const totals: CategoryTotals = { ...EMPTY_TOTALS }
  const months: MonthPoint[] = []

  let cumulativeOutflow = 0

  for (let m = 0; m <= horizon; m++) {
    const assetValue = valueAtMonth(value0, currentCar.depreciationRatePerYear, m, floor)
    let outflow = 0

    if (m >= 1) {
      const energy = fuelCostPerMonth * escalationFactor(escalation.fuelPerYear, m)
      const maintenance =
        (currentCar.maintenancePerYear / 12) * escalationFactor(escalation.maintenancePerYear, m)
      const insurance =
        (currentCar.insurancePerYear / 12) * escalationFactor(escalation.insurancePerYear, m)
      const ipva = annualIpva(ownership, assetValue, false) / 12
      const licensing = ownership.licensingPerYear / 12

      totals.energy += energy
      totals.maintenance += maintenance
      totals.insurance += insurance
      totals.ipva += ipva
      totals.licensing += licensing

      outflow = energy + maintenance + insurance + ipva + licensing
      cumulativeOutflow += outflow
    }

    months.push({
      month: m,
      outflow,
      cumulativeOutflow,
      assetValue,
      debt: 0,
      cumulativeCost: baseline - (-cumulativeOutflow + assetValue),
    })
  }

  totals.depreciation = value0 - months[horizon].assetValue

  return finishScenario('Manter o carro atual', months, totals, horizon, totalKm)
}

function buildSwapScenario(
  inputs: Inputs,
  energyCostPerMonth: number,
  infrastructure: number,
  plan: ReturnType<typeof buildFinancingPlan>,
  horizon: number,
  floor: number,
  baseline: number,
  totalKm: number,
): ScenarioResult {
  const { ev, payment, ownership, escalation, currentCar } = inputs
  const value0 = Math.max(ev.price, 0)
  const totals: CategoryTotals = { ...EMPTY_TOTALS }
  const months: MonthPoint[] = []

  // Quanto sai do bolso no ato. À vista é o carro inteiro; financiado é só a
  // entrada. Nos dois casos a venda do carro atual entra como dinheiro.
  const cashAtPurchase =
    payment.mode === 'avista' ? value0 : Math.min(Math.max(payment.downPayment, 0), value0)
  const feesPaid = plan.principal > 0 ? Math.max(payment.feesAndIof, 0) : 0

  totals.infrastructure = infrastructure
  totals.interest = feesPaid

  let cumulativeOutflow = 0

  for (let m = 0; m <= horizon; m++) {
    const assetValue = valueAtMonth(value0, ev.depreciationRatePerYear, m, floor)
    const debt = remainingBalance(plan, m)
    let outflow = 0

    if (m === 0) {
      outflow = cashAtPurchase + infrastructure - Math.max(currentCar.marketValue, 0)
    } else {
      const energy = energyCostPerMonth * escalationFactor(escalation.energyPerYear, m)
      const maintenance =
        (ev.maintenancePerYear / 12) * escalationFactor(escalation.maintenancePerYear, m)
      const insurance =
        (ev.insurancePerYear / 12) * escalationFactor(escalation.insurancePerYear, m)
      const ipva = annualIpva(ownership, assetValue, true) / 12
      const licensing = ownership.licensingPerYear / 12

      totals.energy += energy
      totals.maintenance += maintenance
      totals.insurance += insurance
      totals.ipva += ipva
      totals.licensing += licensing
      totals.interest += interestForMonth(plan, m)

      outflow = energy + maintenance + insurance + ipva + licensing + paymentForMonth(plan, m)
    }

    cumulativeOutflow += outflow

    months.push({
      month: m,
      outflow,
      cumulativeOutflow,
      assetValue,
      debt,
      cumulativeCost: baseline - (-cumulativeOutflow + assetValue - debt),
    })
  }

  totals.depreciation = value0 - months[horizon].assetValue

  return finishScenario('Trocar pelo elétrico', months, totals, horizon, totalKm)
}

function finishScenario(
  label: string,
  months: MonthPoint[],
  totals: CategoryTotals,
  horizon: number,
  totalKm: number,
): ScenarioResult {
  const last = months[horizon]
  const totalCost = sumTotals(totals)

  return {
    label,
    months,
    totals,
    totalCost,
    totalOutflow: last.cumulativeOutflow,
    residualValue: last.assetValue,
    costPerKm: totalKm > 0 ? totalCost / totalKm : 0,
  }
}
