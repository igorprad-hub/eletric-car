import type { CategoryTotals, SimulationResult } from '../../domain/types'
import { money, monthsLabel } from '../../format'

interface Row {
  key: keyof CategoryTotals
  label: string
  hint?: string
}

const ROWS: Row[] = [
  { key: 'energy', label: 'Combustível / energia', hint: 'O item onde o elétrico ganha.' },
  { key: 'maintenance', label: 'Manutenção' },
  { key: 'insurance', label: 'Seguro' },
  { key: 'ipva', label: 'IPVA' },
  { key: 'licensing', label: 'Licenciamento' },
  { key: 'interest', label: 'Juros e tarifas', hint: 'Só existe no caminho do financiamento.' },
  { key: 'infrastructure', label: 'Carregador e instalação', hint: 'Desembolso único, no mês zero.' },
  {
    key: 'depreciation',
    label: 'Desvalorização',
    hint: 'Quanto cada carro perde de valor no período. Costuma ser o maior item da conta.',
  },
]

/**
 * Onde o dinheiro vai, categoria por categoria.
 *
 * A coluna da diferença é a que importa: mostra qual cenário cada linha favorece e
 * por quanto. As barras usam as mesmas duas cores do gráfico, então a cor continua
 * significando a mesma coisa em toda a tela.
 */
export function BreakdownTable({ result }: { result: SimulationResult }) {
  const { keep, swap, horizonMonths } = result

  const rows = ROWS.map((r) => ({
    ...r,
    keep: keep.totals[r.key],
    swap: swap.totals[r.key],
    diff: keep.totals[r.key] - swap.totals[r.key],
  })).filter((r) => Math.abs(r.keep) > 0.5 || Math.abs(r.swap) > 0.5)

  const maxDiff = Math.max(...rows.map((r) => Math.abs(r.diff)), 1)
  const totalDiff = keep.totalCost - swap.totalCost

  return (
    <section className="card">
      <div className="chart-head">
        <div>
          <div className="chart-title">Para onde vai o dinheiro</div>
          <div className="chart-sub">
            Custo total de cada caminho em {monthsLabel(horizonMonths)}. A coluna da direita
            mostra quem ganha em cada linha.
          </div>
        </div>
      </div>

      <table className="breakdown" style={{ marginTop: 10 }}>
        <thead>
          <tr>
            <th>Item</th>
            <th>Manter</th>
            <th>Trocar</th>
            <th colSpan={2}>Diferença</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const tied = Math.abs(r.diff) < 0.5
            const favorsSwap = r.diff >= 0
            const w = (Math.abs(r.diff) / maxDiff) * 50
            return (
              <tr key={r.key}>
                <td>
                  {r.label}
                  {r.hint && <div className="hint">{r.hint}</div>}
                </td>
                <td>{money(r.keep)}</td>
                <td>{money(r.swap)}</td>
                <td className={tied ? undefined : favorsSwap ? 'positive' : 'negative'}>
                  {tied ? 'empata' : (favorsSwap ? '+' : '−') + money(Math.abs(r.diff))}
                </td>
                <td style={{ width: 120 }}>
                  {!tied && (
                    <span className="diffbar" role="presentation">
                      <span
                        style={{
                          left: favorsSwap ? '50%' : 50 - w + '%',
                          width: w + '%',
                          background: favorsSwap ? 'var(--swap)' : 'var(--keep)',
                        }}
                      />
                    </span>
                  )}
                </td>
              </tr>
            )
          })}

          <tr className="total">
            <td>Custo total</td>
            <td>{money(keep.totalCost)}</td>
            <td>{money(swap.totalCost)}</td>
            <td className={totalDiff >= 0 ? 'positive' : 'negative'} colSpan={2}>
              {totalDiff >= 0 ? '+' : '−'}
              {money(Math.abs(totalDiff))} {totalDiff >= 0 ? 'trocando' : 'mantendo'}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="hint" style={{ marginTop: 10 }}>
        Barra laranja significa que a linha favorece trocar; azul, que favorece manter. Valor
        residual estimado no fim do período: {money(keep.residualValue)} o carro atual,{' '}
        {money(swap.residualValue)} o elétrico.
      </div>
    </section>
  )
}
