/**
 * Elétricos à venda no Brasil, com autonomia do ciclo Inmetro.
 *
 * SOBRE A AUTONOMIA: a etiqueta do Inmetro publica UM número só, não cidade e
 * estrada separadas. Por baixo, o PBE Veicular roda dois ciclos — urbano (FTP-75)
 * e rodoviário (HWFET) — e combina os dois com peso de 55% e 45%, no método da
 * EPA. O desdobramento entre cidade e estrada que a calculadora usa é derivado
 * desse número, não medido. Veja `splitInmetroRange` em `domain/energy.ts`.
 *
 * SOBRE OS PREÇOS: conferidos em setembro de 2026 e válidos só para esse momento.
 * Preço de carro muda por campanha, região e ano-modelo. Confirme na
 * concessionária.
 *
 * Nesta lista entram apenas modelos com autonomia Inmetro publicada e preço
 * corroborado. Modelos sem número de ciclo Inmetro confiável ficaram de fora de
 * propósito: é melhor o usuário digitar a ficha do carro dele em "Outro" do que
 * receber um palpite com cara de dado.
 *
 * Tesla não entra: não é vendida oficialmente no Brasil, só importada.
 */

export interface EvModel {
  id: string
  brand: string
  name: string
  /** Capacidade da bateria em kWh. */
  batteryKwh: number
  /** Autonomia do ciclo Inmetro, em km. Número combinado, como sai na etiqueta. */
  rangeInmetroKm: number
  /** Preço de referência em R$. */
  price: number
}

export const EV_MODELS: EvModel[] = [
  { id: 'kwid-etech', brand: 'Renault', name: 'Kwid E-Tech Techno', batteryKwh: 26.8, rangeInmetroKm: 185, price: 99990 },
  { id: 'dolphin-mini-gl', brand: 'BYD', name: 'Dolphin Mini GL', batteryKwh: 30.08, rangeInmetroKm: 250, price: 118990 },
  { id: 'dolphin-mini-gs', brand: 'BYD', name: 'Dolphin Mini GS', batteryKwh: 38.88, rangeInmetroKm: 280, price: 119990 },
  { id: 'geely-ex2-pro', brand: 'Geely', name: 'EX2 Pro', batteryKwh: 39.4, rangeInmetroKm: 289, price: 123800 },
  { id: 'jac-ejs1', brand: 'JAC', name: 'e-JS1', batteryKwh: 30.2, rangeInmetroKm: 181, price: 132900 },
  { id: 'mg4-comfort', brand: 'MG', name: 'MG4 Urban Comfort 43', batteryKwh: 43, rangeInmetroKm: 299, price: 134990 },
  { id: 'geely-ex2-max', brand: 'Geely', name: 'EX2 Max', batteryKwh: 39.4, rangeInmetroKm: 289, price: 136800 },
  { id: 'aion-ut-premium', brand: 'GAC', name: 'Aion UT Premium', batteryKwh: 44.12, rangeInmetroKm: 253, price: 139990 },
  { id: 'mg4-luxury-43', brand: 'MG', name: 'MG4 Urban Luxury 43', batteryKwh: 43, rangeInmetroKm: 299, price: 144990 },
  { id: 'dolphin-gs', brand: 'BYD', name: 'Dolphin GS', batteryKwh: 44.9, rangeInmetroKm: 291, price: 149990 },
  { id: 'spark-euv', brand: 'Chevrolet', name: 'Spark EUV', batteryKwh: 42, rangeInmetroKm: 258, price: 154990 },
  { id: 'mg4-luxury-54', brand: 'MG', name: 'MG4 Urban Luxury 54', batteryKwh: 54, rangeInmetroKm: 358, price: 154990 },
  { id: 'aion-ut-elite', brand: 'GAC', name: 'Aion UT Elite', batteryKwh: 60, rangeInmetroKm: 310, price: 159990 },
  { id: 'ora-5', brand: 'GWM', name: 'Ora 5', batteryKwh: 58.3, rangeInmetroKm: 349, price: 163990 },
  { id: 'ora-03-bev58', brand: 'GWM', name: 'Ora 03 BEV58', batteryKwh: 58, rangeInmetroKm: 315, price: 169000 },
  { id: 'aion-y-premium', brand: 'GAC', name: 'Aion Y Premium', batteryKwh: 63.2, rangeInmetroKm: 318, price: 175990 },
  { id: 'aion-y-elite', brand: 'GAC', name: 'Aion Y Elite', batteryKwh: 63.2, rangeInmetroKm: 318, price: 187990 },
  { id: 'yuan-plus-gs', brand: 'BYD', name: 'Yuan Plus GS', batteryKwh: 60.5, rangeInmetroKm: 400, price: 239990 },
]

/** Quando os dados desta lista foram conferidos. Aparece na tela. */
export const EV_MODELS_CHECKED_AT = 'setembro de 2026'

export const EV_MODEL_BY_ID: Record<string, EvModel> = Object.fromEntries(
  EV_MODELS.map((m) => [m.id, m]),
)

export function modelLabel(m: EvModel): string {
  return m.brand + ' ' + m.name
}
