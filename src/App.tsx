import { useMemo, useState } from 'react'

import {
  ChargingCard,
  ContextCard,
  CurrentCarCard,
  EvCard,
  PaymentCard,
  UsageCard,
} from './components/forms/cards'
import { BreakdownTable } from './components/results/BreakdownTable'
import { BreakevenChart } from './components/results/BreakevenChart'
import { Disclaimer, NonFinancial, Warnings } from './components/results/Disclaimer'
import { SensitivityPanel } from './components/results/SensitivityPanel'
import { Verdict } from './components/results/Verdict'
import { simulate } from './domain/simulate'
import { buildShareLink, usePersistedInputs } from './hooks/usePersistedState'

export default function App() {
  const { inputs, update, reset } = usePersistedInputs()
  const [copied, setCopied] = useState(false)

  const result = useMemo(() => simulate(inputs), [inputs])

  async function share() {
    const link = buildShareLink(inputs)
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      // Sem permissão de área de transferência: a URL já foi atualizada de todo jeito.
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    }
  }

  return (
    <div className="page">
      <header className="masthead">
        <div>
          <h1>Vale a pena trocar por um elétrico?</h1>
          <p>
            A pergunta certa não é quanto custa o elétrico, é quanto custa cada um dos dois
            futuros: trocar, ou continuar com o carro que você já tem. Manter também queima
            dinheiro. Esta calculadora compara os dois lado a lado e diz em quanto tempo eles
            empatam.
          </p>
        </div>
        <div className="toolbar">
          <button type="button" className="ghost" onClick={share}>
            {copied ? 'Link copiado' : 'Compartilhar cenário'}
          </button>
          <button type="button" className="ghost" onClick={reset}>
            Recomeçar
          </button>
        </div>
      </header>

      {/* No celular o resultado ficaria seis cartões abaixo. Esta âncora resolve. */}
      <div className="verdict-dock only-narrow">
        <Verdict result={result} compact />
      </div>

      <div className="layout">
        <div className="column">
          <UsageCard inputs={inputs} update={update} />
          <CurrentCarCard inputs={inputs} update={update} />
          <EvCard inputs={inputs} update={update} />
          <ChargingCard inputs={inputs} update={update} />
          <PaymentCard inputs={inputs} update={update} />
          <ContextCard inputs={inputs} update={update} />
        </div>

        <div className="column column-results">
          <div className="verdict-dock only-wide">
            <Verdict result={result} />
          </div>
          <Warnings result={result} />
          <BreakevenChart result={result} />
          <BreakdownTable result={result} />
          <SensitivityPanel inputs={inputs} />
          <NonFinancial />
          <Disclaimer />
        </div>
      </div>
    </div>
  )
}
