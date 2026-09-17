/**
 * Alíquotas de IPVA por estado e o tratamento dado a veículos elétricos.
 *
 * LEIA ANTES DE CONFIAR NESTES NÚMEROS.
 *
 * As alíquotas gerais para automóveis de passeio são razoavelmente estáveis e
 * estão aqui como referência. Já o tratamento dado a elétricos muda com
 * frequência: estados criam, revogam, limitam por valor do veículo e por ano de
 * fabricação. Alguns concedem isenção só até determinado teto de valor venal.
 *
 * Por isso nenhuma regra de elétrico aqui está marcada como confirmada. Todas
 * entram como ponto de partida, e a tela sempre oferece o campo para digitar o
 * IPVA em reais, que é o que o usuário de fato vê no boleto.
 *
 * Fonte a consultar: Sefaz do seu estado.
 */

export type EvIpvaRule = 'isento' | 'reduzido' | 'normal'

export interface StateInfo {
  uf: string
  name: string
  /** Alíquota geral para automóveis, em fração do valor venal. */
  rate: number
  /** Tratamento aproximado para veículos 100% elétricos. */
  evRule: EvIpvaRule
  /** Alíquota aplicada ao elétrico quando evRule === 'reduzido'. */
  evRate?: number
  note?: string
}

export const STATES: StateInfo[] = [
  { uf: 'AC', name: 'Acre', rate: 0.02, evRule: 'normal' },
  { uf: 'AL', name: 'Alagoas', rate: 0.03, evRule: 'normal' },
  { uf: 'AM', name: 'Amazonas', rate: 0.03, evRule: 'normal' },
  { uf: 'AP', name: 'Amapá', rate: 0.03, evRule: 'normal' },
  { uf: 'BA', name: 'Bahia', rate: 0.025, evRule: 'normal' },
  { uf: 'CE', name: 'Ceará', rate: 0.03, evRule: 'isento', note: 'Há previsão de isenção para elétricos. Confirme o teto de valor.' },
  { uf: 'DF', name: 'Distrito Federal', rate: 0.035, evRule: 'normal' },
  { uf: 'ES', name: 'Espírito Santo', rate: 0.02, evRule: 'normal' },
  { uf: 'GO', name: 'Goiás', rate: 0.0375, evRule: 'normal' },
  { uf: 'MA', name: 'Maranhão', rate: 0.025, evRule: 'isento', note: 'Há previsão de isenção para elétricos. Confirme as condições.' },
  { uf: 'MG', name: 'Minas Gerais', rate: 0.04, evRule: 'reduzido', evRate: 0.01, note: 'Alíquota reduzida para movidos só a eletricidade. Confirme na Sefaz.' },
  { uf: 'MS', name: 'Mato Grosso do Sul', rate: 0.035, evRule: 'normal' },
  { uf: 'MT', name: 'Mato Grosso', rate: 0.03, evRule: 'normal' },
  { uf: 'PA', name: 'Pará', rate: 0.025, evRule: 'normal' },
  { uf: 'PB', name: 'Paraíba', rate: 0.025, evRule: 'normal' },
  { uf: 'PE', name: 'Pernambuco', rate: 0.03, evRule: 'isento', note: 'Há previsão de isenção para elétricos. Confirme as condições.' },
  { uf: 'PI', name: 'Piauí', rate: 0.025, evRule: 'isento', note: 'Há previsão de isenção para elétricos. Confirme as condições.' },
  { uf: 'PR', name: 'Paraná', rate: 0.035, evRule: 'reduzido', evRate: 0.01, note: 'Tratamento diferenciado para elétricos. Confirme na Sefaz.' },
  { uf: 'RJ', name: 'Rio de Janeiro', rate: 0.04, evRule: 'isento', note: 'Isenção costuma valer até um teto de valor do veículo. Confirme.' },
  { uf: 'RN', name: 'Rio Grande do Norte', rate: 0.03, evRule: 'isento', note: 'Há previsão de isenção para elétricos. Confirme as condições.' },
  { uf: 'RO', name: 'Rondônia', rate: 0.03, evRule: 'normal' },
  { uf: 'RR', name: 'Roraima', rate: 0.03, evRule: 'normal' },
  { uf: 'RS', name: 'Rio Grande do Sul', rate: 0.03, evRule: 'reduzido', evRate: 0.01, note: 'Tratamento diferenciado para elétricos. Confirme na Sefaz.' },
  { uf: 'SC', name: 'Santa Catarina', rate: 0.02, evRule: 'normal' },
  { uf: 'SE', name: 'Sergipe', rate: 0.025, evRule: 'normal' },
  { uf: 'SP', name: 'São Paulo', rate: 0.04, evRule: 'normal', note: 'Não há isenção geral para elétricos. Confirme o ano vigente.' },
  { uf: 'TO', name: 'Tocantins', rate: 0.02, evRule: 'normal' },
]

export const STATE_BY_UF: Record<string, StateInfo> = Object.fromEntries(
  STATES.map((s) => [s.uf, s]),
)

export function getState(uf: string): StateInfo {
  return STATE_BY_UF[uf] ?? STATE_BY_UF.SP
}
