import type { ChargingSourceId, Inputs } from '../domain/types'
import { EV_MODEL_BY_ID } from './evModels'

/**
 * Todos os valores padrão da calculadora vivem aqui.
 *
 * A página abre já calculando um resultado em vez de mostrar um formulário vazio.
 * Ninguém sabe de cabeça quanto custa o kWh no DC rápido, mas todo mundo sabe
 * reconhecer um número errado quando vê um. Partir de algo plausível e corrigir é
 * muito mais fácil do que preencher trinta campos do zero.
 *
 * São referências de ordem de grandeza para o Brasil, não cotações.
 */

const DEFAULT_MODEL = EV_MODEL_BY_ID['dolphin-mini-gs']

export const DEFAULT_CHARGING_PRICES: Record<ChargingSourceId, number> = {
  casa: 0.95,
  branca: 0.65,
  solar: 0.3,
  publicoAC: 1.8,
  dcRapido: 2.5,
  gratis: 0,
}

export const DEFAULT_CHARGING_SHARES: Record<ChargingSourceId, number> = {
  casa: 85,
  branca: 0,
  solar: 0,
  publicoAC: 5,
  dcRapido: 10,
  gratis: 0,
}

export const DEFAULT_INPUTS: Inputs = {
  horizonMonths: 60,
  residualFloorPct: 0.1,

  usage: {
    kmCityPerMonth: 1000,
    kmHighwayPerMonth: 200,
  },

  currentCar: {
    nickname: 'Meu carro atual',
    marketValue: 60000,
    fuelKind: 'flex',
    inputMode: 'consumo',
    kmPerLiterCity: 10,
    kmPerLiterHighway: 13,
    fuelPrice: 6.2,
    ethanolPrice: 4.4,
    ethanolSharePct: 0,
    ethanolEfficiencyFactor: 0.7,
    monthlyFuelSpend: 800,
    maintenancePerYear: 2500,
    insurancePerYear: 3000,
    depreciationRatePerYear: 0.15,
  },

  ev: {
    modelId: DEFAULT_MODEL.id,
    name: DEFAULT_MODEL.brand + ' ' + DEFAULT_MODEL.name,
    price: DEFAULT_MODEL.price,
    batteryKwh: DEFAULT_MODEL.batteryKwh,
    rangeInmetroKm: DEFAULT_MODEL.rangeInmetroKm,
    highwayPenalty: 1.3,
    realWorldFactor: 0.85,
    chargingEfficiency: 0.88,
    maintenancePerYear: 1200,
    insurancePerYear: 4200,
    depreciationRatePerYear: 0.18,
  },

  charging: {
    sources: {
      casa: { sharePct: DEFAULT_CHARGING_SHARES.casa, pricePerKwh: DEFAULT_CHARGING_PRICES.casa },
      branca: { sharePct: DEFAULT_CHARGING_SHARES.branca, pricePerKwh: DEFAULT_CHARGING_PRICES.branca },
      solar: { sharePct: DEFAULT_CHARGING_SHARES.solar, pricePerKwh: DEFAULT_CHARGING_PRICES.solar },
      publicoAC: { sharePct: DEFAULT_CHARGING_SHARES.publicoAC, pricePerKwh: DEFAULT_CHARGING_PRICES.publicoAC },
      dcRapido: { sharePct: DEFAULT_CHARGING_SHARES.dcRapido, pricePerKwh: DEFAULT_CHARGING_PRICES.dcRapido },
      gratis: { sharePct: DEFAULT_CHARGING_SHARES.gratis, pricePerKwh: 0 },
    },
    hasSolar: false,
    solarSurplusKwhPerMonth: 250,
    hasChargerInstalled: false,
    chargerCost: 3500,
    installationCost: 2500,
  },

  payment: {
    mode: 'financiado',
    downPayment: 60000,
    monthlyInterestPct: 1.49,
    termMonths: 48,
    feesAndIof: 1800,
  },

  ownership: {
    uf: 'SP',
    ipvaOverrideIce: null,
    ipvaOverrideEv: null,
    licensingPerYear: 160,
  },

  escalation: {
    fuelPerYear: 0.06,
    energyPerYear: 0.07,
    insurancePerYear: 0.05,
    maintenancePerYear: 0.05,
  },
}

/** Cópia profunda, para o estado do app nunca escrever em cima do padrão. */
export function freshInputs(): Inputs {
  return structuredClone(DEFAULT_INPUTS)
}
