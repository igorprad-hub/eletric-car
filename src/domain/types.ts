/**
 * Tipos do modelo de simulação.
 *
 * Regra geral: nada aqui sabe que React existe. Todo o domínio é função pura
 * recebendo `Inputs` e devolvendo `SimulationResult`.
 */

export type FuelKind = 'gasolina' | 'etanol' | 'diesel' | 'gnv' | 'flex'

/** Como o usuário prefere declarar o gasto do carro atual. */
export type FuelInputMode = 'consumo' | 'gasto'

export type PaymentMode = 'avista' | 'financiado'

export type ChargingSourceId =
  | 'casa'
  | 'branca'
  | 'solar'
  | 'publicoAC'
  | 'dcRapido'
  | 'gratis'

export interface ChargingSource {
  sharePct: number
  pricePerKwh: number
}

export interface UsageInputs {
  kmCityPerMonth: number
  kmHighwayPerMonth: number
}

export interface CurrentCarInputs {
  nickname: string
  /** Quanto você venderia ele hoje. Serve de valor do ativo e de entrada na troca. */
  marketValue: number
  fuelKind: FuelKind
  inputMode: FuelInputMode
  kmPerLiterCity: number
  kmPerLiterHighway: number
  /** Preço do combustível principal (a gasolina, quando flex). */
  fuelPrice: number
  ethanolPrice: number
  /** Fração dos abastecimentos feitos com etanol, quando flex. */
  ethanolSharePct: number
  /** Eficiência do etanol frente à gasolina. ~0,70 na prática. */
  ethanolEfficiencyFactor: number
  /** Usado quando inputMode === 'gasto'. */
  monthlyFuelSpend: number
  maintenancePerYear: number
  insurancePerYear: number
  depreciationRatePerYear: number
}

export interface EvInputs {
  modelId: string | null
  name: string
  price: number
  batteryKwh: number
  /** Autonomia do ciclo Inmetro, em km. Número combinado, como sai na etiqueta. */
  rangeInmetroKm: number
  /**
   * Quanto o consumo na estrada é maior que na cidade. 1,30 significa 30% a mais.
   *
   * O Inmetro não publica o desdobramento, então este fator é premissa nossa, e
   * é o que reparte a autonomia da etiqueta entre os dois ciclos.
   */
  highwayPenalty: number
  /** Quanto da autonomia declarada se realiza no mundo real (clima, ar, condução). */
  realWorldFactor: number
  /** Perdas entre a tomada e a bateria. */
  chargingEfficiency: number
  maintenancePerYear: number
  insurancePerYear: number
  depreciationRatePerYear: number
}

export interface ChargingInputs {
  sources: Record<ChargingSourceId, ChargingSource>
  hasSolar: boolean
  /** Sobra mensal de geração disponível para o carro. Limita a fonte solar. */
  solarSurplusKwhPerMonth: number
  hasChargerInstalled: boolean
  /** Wallbox + cabo. */
  chargerCost: number
  /** Instalação elétrica, e upgrade do padrão de entrada se precisar. */
  installationCost: number
}

export interface PaymentInputs {
  mode: PaymentMode
  /** Entrada total em R$. O valor do carro usado costuma entrar aqui. */
  downPayment: number
  monthlyInterestPct: number
  termMonths: number
  /** IOF, tarifa de cadastro, registro de gravame. Somados ao financiado. */
  feesAndIof: number
}

export interface OwnershipInputs {
  uf: string
  /** Se preenchido, ignora a tabela do estado. Em R$/ano. */
  ipvaOverrideIce: number | null
  ipvaOverrideEv: number | null
  licensingPerYear: number
}

export interface EscalationInputs {
  fuelPerYear: number
  energyPerYear: number
  insurancePerYear: number
  maintenancePerYear: number
}

export interface Inputs {
  horizonMonths: number
  usage: UsageInputs
  currentCar: CurrentCarInputs
  ev: EvInputs
  charging: ChargingInputs
  payment: PaymentInputs
  ownership: OwnershipInputs
  escalation: EscalationInputs
  /** Piso do valor residual, como fração do preço original. */
  residualFloorPct: number
}

export interface CategoryTotals {
  /** Combustível no cenário A, energia no cenário B. */
  energy: number
  maintenance: number
  insurance: number
  ipva: number
  licensing: number
  /** Juros do financiamento + tarifas e IOF. */
  interest: number
  /** Wallbox, instalação, padrão de entrada. Só no cenário B. */
  infrastructure: number
  depreciation: number
}

export interface MonthPoint {
  month: number
  /** Desembolso do mês (negativo = entrada de dinheiro). */
  outflow: number
  cumulativeOutflow: number
  assetValue: number
  debt: number
  /** Custo econômico acumulado, já com depreciação diluída. */
  cumulativeCost: number
}

export interface ScenarioResult {
  label: string
  months: MonthPoint[]
  totals: CategoryTotals
  /** Custo econômico total no horizonte. */
  totalCost: number
  /** Desembolso de caixa total no horizonte. */
  totalOutflow: number
  residualValue: number
  costPerKm: number
}

export interface SimulationResult {
  keep: ScenarioResult
  swap: ScenarioResult
  /** Mês em que trocar passa a sair mais barato. `null` se não acontece no horizonte. */
  breakevenMonth: number | null
  /** keep.totalCost − swap.totalCost. Positivo significa que trocar economiza. */
  totalDifference: number
  averageMonthlySaving: number
  horizonMonths: number
  totalKm: number
  monthlyPayment: number
  /** Consumo real estimado do elétrico, em kWh/100km. */
  evKwhPer100km: number
  /** Preço médio ponderado efetivamente pago pelo kWh. */
  effectiveKwhPrice: number
  warnings: string[]
}

export const EMPTY_TOTALS: CategoryTotals = {
  energy: 0,
  maintenance: 0,
  insurance: 0,
  ipva: 0,
  licensing: 0,
  interest: 0,
  infrastructure: 0,
  depreciation: 0,
}

export function sumTotals(t: CategoryTotals): number {
  return (
    t.energy +
    t.maintenance +
    t.insurance +
    t.ipva +
    t.licensing +
    t.interest +
    t.infrastructure +
    t.depreciation
  )
}
