const brl0 = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

const brl2 = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function money(v: number, decimals: 0 | 2 = 0): string {
  if (!Number.isFinite(v)) return '—'
  return decimals === 0 ? brl0.format(v) : brl2.format(v)
}

/**
 * Versão curta para eixos de gráfico, onde não cabe o valor inteiro.
 *
 * Em `compact` (tela estreita) o "R$" e o "mil" saem: num eixo de 40px de
 * largura, "R$ 200 mil" não cabe, e "200k" diz a mesma coisa. A unidade fica
 * subentendida pelo título do gráfico.
 */
export function moneyShort(v: number, compact = false): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? '−' : ''

  if (compact) {
    if (abs >= 1000000) return sign + (abs / 1000000).toFixed(1).replace('.', ',') + 'mi'
    if (abs >= 1000) return sign + Math.round(abs / 1000) + 'k'
    return sign + Math.round(abs)
  }

  if (abs >= 1000000) return sign + 'R$ ' + (abs / 1000000).toFixed(1).replace('.', ',') + ' mi'
  if (abs >= 1000) return sign + 'R$ ' + Math.round(abs / 1000) + ' mil'
  return sign + 'R$ ' + Math.round(abs)
}

export function num(v: number, decimals = 0): string {
  if (!Number.isFinite(v)) return '—'
  return v.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function pct(v: number, decimals = 0): string {
  return num(v * 100, decimals) + '%'
}

/** 41 vira "3 anos e 5 meses". Bem mais legível que "41 meses". */
export function monthsLabel(months: number): string {
  const m = Math.round(months)
  if (m < 1) return 'imediatamente'
  if (m < 12) return m + (m === 1 ? ' mês' : ' meses')

  const years = Math.floor(m / 12)
  const rest = m % 12
  const yearPart = years + (years === 1 ? ' ano' : ' anos')
  if (rest === 0) return yearPart
  return yearPart + ' e ' + rest + (rest === 1 ? ' mês' : ' meses')
}

/**
 * Aceita as duas formas que brasileiro digita: "6,20" e "6.20".
 *
 * Se há vírgula, ela é o decimal e o ponto é separador de milhar ("1.250,50").
 * Se não há vírgula, o ponto é o decimal ("6.20"), porque quem escreve "1.250"
 * querendo mil duzentos e cinquenta quase sempre também usaria vírgula.
 */
export function parseNumber(raw: string): number | null {
  const trimmed = raw.replace(/\s/g, '').replace(/[R$]/g, '')
  const cleaned = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed
  if (cleaned === '' || cleaned === '-') return null
  const v = Number(cleaned)
  return Number.isFinite(v) ? v : null
}
