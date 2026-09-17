/**
 * Depreciação por decaimento geométrico.
 *
 * valor(t) = valor0 * (1 - taxa)^anos, com piso.
 *
 * É o item mais pesado e ao mesmo tempo o mais discutível do modelo. A taxa de um
 * elétrico no Brasil ainda tem pouca série histórica, e marcas que chegaram há
 * poucos anos não têm curva de revenda madura. Por isso a taxa fica editável e a
 * tela avisa que essa é a premissa mais frágil da conta.
 */
export function valueAtMonth(
  initialValue: number,
  ratePerYear: number,
  month: number,
  floorPct: number,
): number {
  const value0 = Math.max(initialValue, 0)
  if (value0 === 0) return 0

  const rate = Math.min(Math.max(ratePerYear, 0), 0.95)
  const years = Math.max(month, 0) / 12
  const decayed = value0 * Math.pow(1 - rate, years)
  const floor = value0 * Math.min(Math.max(floorPct, 0), 1)

  return Math.max(decayed, floor)
}
