import type { PaymentInputs } from './types'

export interface FinancingPlan {
  /** Valor efetivamente financiado, já com IOF e tarifas embutidos. */
  principal: number
  monthlyPayment: number
  termMonths: number
  monthlyRate: number
  /** Juros do contrato inteiro, mesmo além do horizonte da análise. */
  totalInterest: number
}

/**
 * Tabela Price: parcela fixa, juros compostos sobre o saldo devedor.
 *
 * PMT = PV * i / (1 - (1 + i)^-n)
 *
 * Aviso que vale repetir na tela: a taxa que o banco anuncia é a taxa nominal.
 * O CET, que inclui tarifas, seguro prestamista e registro, vem sempre acima.
 */
export function buildFinancingPlan(payment: PaymentInputs, vehiclePrice: number): FinancingPlan {
  if (payment.mode === 'avista') {
    return { principal: 0, monthlyPayment: 0, termMonths: 0, monthlyRate: 0, totalInterest: 0 }
  }

  const financed = Math.max(vehiclePrice - Math.max(payment.downPayment, 0), 0)
  const principal = financed > 0 ? financed + Math.max(payment.feesAndIof, 0) : 0
  const termMonths = Math.max(Math.round(payment.termMonths), 0)
  const monthlyRate = Math.max(payment.monthlyInterestPct, 0) / 100

  if (principal <= 0 || termMonths <= 0) {
    return { principal: 0, monthlyPayment: 0, termMonths, monthlyRate, totalInterest: 0 }
  }

  const monthlyPayment =
    monthlyRate === 0
      ? principal / termMonths
      : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths))

  return {
    principal,
    monthlyPayment,
    termMonths,
    monthlyRate,
    totalInterest: monthlyPayment * termMonths - principal,
  }
}

/**
 * Saldo devedor após `month` parcelas pagas.
 *
 * Importa quando o financiamento é mais longo que o horizonte da análise: o que
 * ainda se deve tem que ser abatido do patrimônio, senão o cenário da troca
 * aparece barato demais.
 */
export function remainingBalance(plan: FinancingPlan, month: number): number {
  if (plan.principal <= 0) return 0
  const paid = Math.min(Math.max(month, 0), plan.termMonths)
  if (paid >= plan.termMonths) return 0

  const { monthlyRate: i, principal: pv, monthlyPayment: pmt } = plan
  if (i === 0) return Math.max(pv - pmt * paid, 0)

  const growth = Math.pow(1 + i, paid)
  return Math.max(pv * growth - pmt * ((growth - 1) / i), 0)
}

/** Parcela do mês. Zero depois de quitado. */
export function paymentForMonth(plan: FinancingPlan, month: number): number {
  if (plan.principal <= 0) return 0
  return month >= 1 && month <= plan.termMonths ? plan.monthlyPayment : 0
}

/** Parte da parcela do mês que é juro puro. */
export function interestForMonth(plan: FinancingPlan, month: number): number {
  if (plan.principal <= 0 || month < 1 || month > plan.termMonths) return 0
  return remainingBalance(plan, month - 1) * plan.monthlyRate
}
