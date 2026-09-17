import type { SimulationResult } from '../../domain/types'
import { money, monthsLabel, num } from '../../format'

/**
 * A resposta em uma frase, e os quatro números que a sustentam.
 *
 * O veredito nunca diz "sim" ou "não" seco. Diz em quanto tempo empata, ou que não
 * empata no prazo analisado, porque é isso que a conta de fato responde.
 */
export function Verdict({
  result,
  compact = false,
}: {
  result: SimulationResult
  compact?: boolean
}) {
  const { breakevenMonth, totalDifference, horizonMonths } = result
  const compensa = breakevenMonth !== null
  const saving = totalDifference

  // Versão de bolso, para a âncora fixa do topo no celular. Só o essencial:
  // uma tela pequena não pode gastar metade da altura com o resumo.
  if (compact) {
    return (
      <section className="verdict verdict-compact">
        <div className="verdict-headline">
          {compensa ? (
            <>
              Empata em <span className="positive">{monthsLabel(breakevenMonth)}</span>
            </>
          ) : (
            <>
              Não se paga em <span className="negative">{monthsLabel(horizonMonths)}</span>
            </>
          )}
        </div>
        <div className="hint" style={{ marginTop: 2 }}>
          {saving >= 0 ? money(saving) + ' a favor de trocar' : money(Math.abs(saving)) + ' a favor de manter'}
          {' em ' + monthsLabel(horizonMonths)}
        </div>
      </section>
    )
  }

  return (
    <section className="verdict">
      <div className="verdict-headline">
        {compensa ? (
          <>
            Empata em{' '}
            <span className="positive">{monthsLabel(breakevenMonth)}</span>
          </>
        ) : (
          <>
            Não se paga em <span className="negative">{monthsLabel(horizonMonths)}</span>
          </>
        )}
      </div>

      <p className="verdict-sub">
        {compensa ? (
          <>
            A partir daí, trocar sai mais barato do que continuar com o carro atual. Em{' '}
            {monthsLabel(horizonMonths)} a diferença chega a <strong>{money(saving)}</strong> a
            favor do elétrico.
          </>
        ) : (
          <>
            No prazo analisado, manter o carro atual sai <strong>{money(Math.abs(saving))}</strong>{' '}
            mais barato. Olhe o detalhamento abaixo para ver qual item está pesando, e o painel
            de sensibilidade para descobrir o que precisaria mudar.
          </>
        )}
      </p>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-label">Diferença em {monthsLabel(horizonMonths)}</span>
          <div className={'stat-value ' + (saving >= 0 ? 'positive' : 'negative')}>
            {saving >= 0 ? '+' : '−'}
            {money(Math.abs(saving))}
          </div>
          <span className="stat-note">{saving >= 0 ? 'a favor de trocar' : 'a favor de manter'}</span>
        </div>

        <div className="stat">
          <span className="stat-label">Por mês, na média</span>
          <div className={'stat-value ' + (saving >= 0 ? 'positive' : 'negative')}>
            {saving >= 0 ? '+' : '−'}
            {money(Math.abs(result.averageMonthlySaving))}
          </div>
          <span className="stat-note">diluído no período</span>
        </div>

        <div className="stat">
          <span className="stat-label">Custo por km</span>
          <div className="stat-value">
            {money(result.swap.costPerKm, 2)}
          </div>
          <span className="stat-note">
            elétrico · {money(result.keep.costPerKm, 2)} o atual
          </span>
        </div>

        <div className="stat">
          <span className="stat-label">Consumo estimado</span>
          <div className="stat-value">{num(result.evKwhPer100km, 1)} kWh</div>
          <span className="stat-note">
            por 100 km · kWh a {money(result.effectiveKwhPrice, 2)}
          </span>
        </div>

        {result.monthlyPayment > 0 && (
          <div className="stat">
            <span className="stat-label">Parcela</span>
            <div className="stat-value">{money(result.monthlyPayment)}</div>
            <span className="stat-note">por mês</span>
          </div>
        )}
      </div>
    </section>
  )
}
