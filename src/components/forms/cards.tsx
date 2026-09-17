import {
  EV_MODELS,
  EV_MODELS_CHECKED_AT,
  EV_MODEL_BY_ID,
  modelLabel,
} from '../../data/evModels'
import { STATES } from '../../data/states'
import {
  CHARGING_SOURCE_IDS,
  CHARGING_SOURCE_LABELS,
  splitInmetroRange,
} from '../../domain/energy'
import type { ChargingSourceId, FuelKind, FuelInputMode, Inputs, PaymentMode } from '../../domain/types'
import { money, monthsLabel, num } from '../../format'
import { Advanced, Card, Check, NumberField, Note, Segmented, SelectField } from './Field'

/** Mutação em cópia. Deixa os formulários legíveis sem trazer uma lib de estado. */
export type Update = (fn: (draft: Inputs) => void) => void

interface CardProps {
  inputs: Inputs
  update: Update
}

const FUEL_OPTIONS: Array<{ value: FuelKind; label: string }> = [
  { value: 'flex', label: 'Flex (gasolina e etanol)' },
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'etanol', label: 'Etanol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'gnv', label: 'GNV' },
]

const FUEL_UNIT: Record<FuelKind, string> = {
  flex: '/L',
  gasolina: '/L',
  etanol: '/L',
  diesel: '/L',
  gnv: '/m³',
}

/* ------------------------------------------------------------------ */

export function UsageCard({ inputs, update }: CardProps) {
  const { kmCityPerMonth, kmHighwayPerMonth } = inputs.usage
  const total = kmCityPerMonth + kmHighwayPerMonth

  return (
    <Card title="Como você roda" step="1 de 5">
      <div className="grid-2">
        <NumberField
          label="Cidade, por mês"
          suffix="km"
          value={kmCityPerMonth}
          min={0}
          onChange={(v) => update((d) => void (d.usage.kmCityPerMonth = v))}
        />
        <NumberField
          label="Estrada, por mês"
          suffix="km"
          value={kmHighwayPerMonth}
          min={0}
          onChange={(v) => update((d) => void (d.usage.kmHighwayPerMonth = v))}
        />
      </div>

      <div className="hint" style={{ marginTop: 8 }}>
        Total de {num(total)} km por mês, {num(total * 12)} km por ano.
      </div>

      <Note>
        A divisão entre cidade e estrada importa mais do que parece. O carro a combustão
        faz mais km por litro na estrada; o elétrico faz o contrário, porque em
        velocidade alta o arrasto pesa e quase não há frenagem regenerativa.
      </Note>

      <Advanced label="Horizonte da análise">
        <NumberField
          label="Analisar os próximos"
          suffix="meses"
          value={inputs.horizonMonths}
          min={1}
          max={180}
          onChange={(v) => update((d) => void (d.horizonMonths = Math.round(v)))}
          hint={monthsLabel(inputs.horizonMonths) + '. Quanto mais longo, mais especulativo.'}
        />
      </Advanced>
    </Card>
  )
}

/* ------------------------------------------------------------------ */

export function CurrentCarCard({ inputs, update }: CardProps) {
  const car = inputs.currentCar
  const unit = FUEL_UNIT[car.fuelKind]

  return (
    <Card title="Seu carro hoje" step="2 de 5">
      <div className="grid-2">
        <NumberField
          label="Quanto vale hoje"
          prefix="R$"
          value={car.marketValue}
          min={0}
          onChange={(v) => update((d) => void (d.currentCar.marketValue = v))}
          hint="Preço de venda realista, não o da tabela."
        />
        <SelectField
          label="Combustível"
          value={car.fuelKind}
          options={FUEL_OPTIONS}
          onChange={(v) => update((d) => void (d.currentCar.fuelKind = v))}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <Segmented<FuelInputMode>
          label="Como informar o consumo"
          value={car.inputMode}
          options={[
            { value: 'consumo', label: 'Sei meu km/l' },
            { value: 'gasto', label: 'Sei quanto gasto' },
          ]}
          onChange={(v) => update((d) => void (d.currentCar.inputMode = v))}
        />
      </div>

      {car.inputMode === 'consumo' ? (
        <div className="grid-3" style={{ marginTop: 10 }}>
          <NumberField
            label="Cidade"
            suffix="km/l"
            decimals={1}
            value={car.kmPerLiterCity}
            min={0.1}
            onChange={(v) => update((d) => void (d.currentCar.kmPerLiterCity = v))}
          />
          <NumberField
            label="Estrada"
            suffix="km/l"
            decimals={1}
            value={car.kmPerLiterHighway}
            min={0.1}
            onChange={(v) => update((d) => void (d.currentCar.kmPerLiterHighway = v))}
          />
          <NumberField
            label={car.fuelKind === 'flex' ? 'Gasolina' : 'Preço'}
            prefix="R$"
            suffix={unit}
            decimals={2}
            value={car.fuelPrice}
            min={0}
            onChange={(v) => update((d) => void (d.currentCar.fuelPrice = v))}
          />
        </div>
      ) : (
        <div className="grid-2" style={{ marginTop: 10 }}>
          <NumberField
            label="Gasto por mês"
            prefix="R$"
            value={car.monthlyFuelSpend}
            min={0}
            onChange={(v) => update((d) => void (d.currentCar.monthlyFuelSpend = v))}
            hint="Some os abastecimentos de um mês típico."
          />
          <NumberField
            label="Preço do litro"
            prefix="R$"
            suffix={unit}
            decimals={2}
            value={car.fuelPrice}
            min={0}
            onChange={(v) => update((d) => void (d.currentCar.fuelPrice = v))}
            hint="Só para estimar quantos litros são."
          />
        </div>
      )}

      {car.fuelKind === 'flex' && car.inputMode === 'consumo' && (
        <div className="grid-2" style={{ marginTop: 10 }}>
          <NumberField
            label="Preço do etanol"
            prefix="R$"
            suffix="/L"
            decimals={2}
            value={car.ethanolPrice}
            min={0}
            onChange={(v) => update((d) => void (d.currentCar.ethanolPrice = v))}
          />
          <NumberField
            label="Abastecimentos com etanol"
            suffix="%"
            value={car.ethanolSharePct}
            min={0}
            max={100}
            onChange={(v) => update((d) => void (d.currentCar.ethanolSharePct = v))}
          />
        </div>
      )}

      <div className="grid-2" style={{ marginTop: 10 }}>
        <NumberField
          label="Manutenção por ano"
          prefix="R$"
          value={car.maintenancePerYear}
          min={0}
          onChange={(v) => update((d) => void (d.currentCar.maintenancePerYear = v))}
          hint="Revisões, óleo, filtros, pneus, correias."
        />
        <NumberField
          label="Seguro por ano"
          prefix="R$"
          value={car.insurancePerYear}
          min={0}
          onChange={(v) => update((d) => void (d.currentCar.insurancePerYear = v))}
        />
      </div>

      <Advanced>
        <div className="grid-2">
          <NumberField
            label="Desvalorização"
            suffix="% ao ano"
            value={car.depreciationRatePerYear * 100}
            min={0}
            max={60}
            onChange={(v) => update((d) => void (d.currentCar.depreciationRatePerYear = v / 100))}
          />
          {car.fuelKind === 'flex' && (
            <NumberField
              label="Eficiência do etanol"
              suffix="× gasolina"
              decimals={2}
              value={car.ethanolEfficiencyFactor}
              min={0.3}
              max={1}
              onChange={(v) => update((d) => void (d.currentCar.ethanolEfficiencyFactor = v))}
              hint="0,70 é a regra prática."
            />
          )}
        </div>
      </Advanced>
    </Card>
  )
}

/* ------------------------------------------------------------------ */

export function EvCard({ inputs, update }: CardProps) {
  const ev = inputs.ev

  function pickModel(id: string) {
    update((d) => {
      if (id === 'custom') {
        d.ev.modelId = null
        return
      }
      const m = EV_MODEL_BY_ID[id]
      if (!m) return
      d.ev.modelId = m.id
      d.ev.name = modelLabel(m)
      d.ev.price = m.price
      d.ev.batteryKwh = m.batteryKwh
      d.ev.rangeInmetroKm = m.rangeInmetroKm
    })
  }

  const split = splitInmetroRange(ev.rangeInmetroKm, ev.highwayPenalty)

  return (
    <Card title="O carro elétrico" step="3 de 5">
      <SelectField
        label="Modelo"
        value={ev.modelId ?? 'custom'}
        options={[
          ...EV_MODELS.map((m) => ({ value: m.id, label: modelLabel(m) })),
          { value: 'custom', label: 'Outro (digitar os dados)' },
        ]}
        onChange={pickModel}
      />

      <div className="grid-2" style={{ marginTop: 10 }}>
        <NumberField
          label="Preço"
          prefix="R$"
          value={ev.price}
          min={0}
          onChange={(v) => update((d) => void ((d.ev.price = v), (d.ev.modelId = null)))}
        />
        <NumberField
          label="Bateria"
          suffix="kWh"
          decimals={1}
          value={ev.batteryKwh}
          min={1}
          onChange={(v) => update((d) => void ((d.ev.batteryKwh = v), (d.ev.modelId = null)))}
        />
        <NumberField
          label="Autonomia Inmetro"
          suffix="km"
          value={ev.rangeInmetroKm}
          min={1}
          className="span-2"
          onChange={(v) => update((d) => void ((d.ev.rangeInmetroKm = v), (d.ev.modelId = null)))}
          hint={
            'É o número único da etiqueta. Daí saem ' +
            num(split.cityKm) +
            ' km na cidade e ' +
            num(split.highwayKm) +
            ' km na estrada, pelos pesos do ciclo Inmetro.'
          }
        />
      </div>

      <Note tone="warning">
        Preços e autonomias conferidos em {EV_MODELS_CHECKED_AT} e válidos só para aquele
        momento. Mudam por versão, ano-modelo e campanha. Pegue os números da ficha do carro
        que você vai comprar e digite por cima. Modelos sem autonomia Inmetro publicada não
        entraram na lista: use "Outro" e digite a ficha.
      </Note>

      <div className="grid-2" style={{ marginTop: 10 }}>
        <NumberField
          label="Manutenção por ano"
          prefix="R$"
          value={ev.maintenancePerYear}
          min={0}
          onChange={(v) => update((d) => void (d.ev.maintenancePerYear = v))}
          hint="Menos itens, mas pneus e freios continuam."
        />
        <NumberField
          label="Seguro por ano"
          prefix="R$"
          value={ev.insurancePerYear}
          min={0}
          onChange={(v) => update((d) => void (d.ev.insurancePerYear = v))}
          hint="Costuma vir acima do equivalente a combustão. Peça cotação."
        />
      </div>

      <Advanced>
        <div className="grid-2">
          <NumberField
            label="Autonomia que se realiza"
            suffix="% do Inmetro"
            value={ev.realWorldFactor * 100}
            min={40}
            max={120}
            onChange={(v) => update((d) => void (d.ev.realWorldFactor = v / 100))}
            hint="Ar-condicionado, clima, carga, pé direito."
          />
          <NumberField
            label="Eficiência de carga"
            suffix="%"
            value={ev.chargingEfficiency * 100}
            min={50}
            max={100}
            onChange={(v) => update((d) => void (d.ev.chargingEfficiency = v / 100))}
            hint="Perdas entre a tomada e a bateria."
          />
          <NumberField
            label="Estrada consome a mais"
            suffix="×"
            decimals={2}
            value={ev.highwayPenalty}
            min={1}
            max={2.5}
            onChange={(v) => update((d) => void (d.ev.highwayPenalty = v))}
            className="span-2"
            hint="O Inmetro publica um número só. Este fator reparte a autonomia entre os ciclos urbano e rodoviário — é premissa nossa, não medição."
          />
          <NumberField
            label="Desvalorização"
            suffix="% ao ano"
            value={ev.depreciationRatePerYear * 100}
            min={0}
            max={60}
            onChange={(v) => update((d) => void (d.ev.depreciationRatePerYear = v / 100))}
            className="span-2"
            hint="A premissa mais frágil da conta inteira. Teste no painel de sensibilidade antes de confiar no resultado."
          />
        </div>
      </Advanced>
    </Card>
  )
}

/* ------------------------------------------------------------------ */

export function ChargingCard({ inputs, update }: CardProps) {
  const charging = inputs.charging
  const shareTotal = CHARGING_SOURCE_IDS.filter((id) => id !== 'solar' || charging.hasSolar).reduce(
    (acc, id) => acc + charging.sources[id].sharePct,
    0,
  )
  const off = Math.abs(shareTotal - 100) > 0.5

  function setSource(id: ChargingSourceId, field: 'sharePct' | 'pricePerKwh', v: number) {
    update((d) => void (d.charging.sources[id][field] = v))
  }

  return (
    <Card title="Onde você vai carregar" step="4 de 5">
      <div className="hint" style={{ marginBottom: 10 }}>
        É aqui que a conta se decide. Carregar em casa custa uma fração do que custa um
        DC rápido de rodovia. Distribua os percentuais de como você realmente vai usar.
      </div>

      <table className="breakdown" style={{ marginBottom: 4 }}>
        <thead>
          <tr>
            <th>Fonte</th>
            <th style={{ width: 90 }}>R$/kWh</th>
            <th style={{ width: 80 }}>% do uso</th>
          </tr>
        </thead>
        <tbody>
          {CHARGING_SOURCE_IDS.map((id) => {
            const disabled = id === 'solar' && !charging.hasSolar
            return (
              <tr key={id} style={disabled ? { opacity: 0.4 } : undefined}>
                <td>{CHARGING_SOURCE_LABELS[id]}</td>
                <td>
                  <div className="input-shell" style={{ height: 28 }}>
                    <input
                      inputMode="decimal"
                      aria-label={'Preço do kWh em ' + CHARGING_SOURCE_LABELS[id]}
                      disabled={disabled || id === 'gratis'}
                      value={charging.sources[id].pricePerKwh.toFixed(2).replace('.', ',')}
                      onChange={(e) => {
                        const v = Number(e.target.value.replace(',', '.'))
                        if (Number.isFinite(v)) setSource(id, 'pricePerKwh', Math.max(v, 0))
                      }}
                    />
                  </div>
                </td>
                <td>
                  <div className="input-shell" style={{ height: 28 }}>
                    <input
                      inputMode="numeric"
                      aria-label={'Percentual de uso em ' + CHARGING_SOURCE_LABELS[id]}
                      disabled={disabled}
                      value={String(Math.round(charging.sources[id].sharePct))}
                      onChange={(e) => {
                        const v = Number(e.target.value.replace(/\D/g, ''))
                        if (Number.isFinite(v)) setSource(id, 'sharePct', Math.min(v, 100))
                      }}
                    />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="hint" style={{ color: off ? 'var(--critical)' : undefined }}>
        Soma: {Math.round(shareTotal)}%
        {off && ' — vou reajustar proporcionalmente para fechar 100%.'}
      </div>

      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Check
          label="Tenho painel solar"
          checked={charging.hasSolar}
          onChange={(v) =>
            update((d) => {
              d.charging.hasSolar = v
              if (v && d.charging.sources.solar.sharePct === 0) {
                d.charging.sources.solar.sharePct = d.charging.sources.casa.sharePct
                d.charging.sources.casa.sharePct = 0
              }
            })
          }
        />

        {charging.hasSolar && (
          <>
            <NumberField
              label="Sobra de geração por mês"
              suffix="kWh"
              value={charging.solarSurplusKwhPerMonth}
              min={0}
              onChange={(v) => update((d) => void (d.charging.solarSurplusKwhPerMonth = v))}
              hint="O que sobra depois do consumo da casa. O carro só pode usar isso."
            />
            <Note>
              Energia solar não é de graça para o carro. Pela Lei 14.300 a energia que você
              injeta na rede e resgata depois paga o Fio B, numa escalada anual até 2029. E
              o que passar da sua sobra de geração é cobrado na tarifa normal.
            </Note>
          </>
        )}

        <Check
          label="Já tenho carregador instalado em casa"
          checked={charging.hasChargerInstalled}
          onChange={(v) => update((d) => void (d.charging.hasChargerInstalled = v))}
        />

        {!charging.hasChargerInstalled && (
          <div className="grid-2">
            <NumberField
              label="Carregador (wallbox)"
              prefix="R$"
              value={charging.chargerCost}
              min={0}
              onChange={(v) => update((d) => void (d.charging.chargerCost = v))}
            />
            <NumberField
              label="Instalação elétrica"
              prefix="R$"
              value={charging.installationCost}
              min={0}
              onChange={(v) => update((d) => void (d.charging.installationCost = v))}
              hint="Inclua a troca do padrão de entrada se for preciso."
            />
          </div>
        )}
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */

export function PaymentCard({ inputs, update }: CardProps) {
  const { payment, ev, currentCar } = inputs
  const financed = Math.max(ev.price - payment.downPayment, 0)

  return (
    <Card title="Como você vai pagar" step="5 de 5">
      <Segmented<PaymentMode>
        value={payment.mode}
        options={[
          { value: 'financiado', label: 'Financiar' },
          { value: 'avista', label: 'À vista' },
        ]}
        onChange={(v) => update((d) => void (d.payment.mode = v))}
      />

      {payment.mode === 'financiado' ? (
        <>
          <div className="grid-2" style={{ marginTop: 10 }}>
            <NumberField
              label="Entrada"
              prefix="R$"
              value={payment.downPayment}
              min={0}
              onChange={(v) => update((d) => void (d.payment.downPayment = v))}
              hint={
                <button
                  type="button"
                  className="ghost"
                  style={{ marginTop: 4 }}
                  onClick={() => update((d) => void (d.payment.downPayment = currentCar.marketValue))}
                >
                  Usar o valor do meu carro ({money(currentCar.marketValue)})
                </button>
              }
            />
            <NumberField
              label="Juros"
              suffix="% ao mês"
              decimals={2}
              value={payment.monthlyInterestPct}
              min={0}
              max={10}
              onChange={(v) => update((d) => void (d.payment.monthlyInterestPct = v))}
            />
            <NumberField
              label="Prazo"
              suffix="meses"
              value={payment.termMonths}
              min={1}
              max={120}
              onChange={(v) => update((d) => void (d.payment.termMonths = Math.round(v)))}
            />
            <NumberField
              label="IOF e tarifas"
              prefix="R$"
              value={payment.feesAndIof}
              min={0}
              onChange={(v) => update((d) => void (d.payment.feesAndIof = v))}
            />
          </div>

          <div className="hint" style={{ marginTop: 8 }}>
            A financiar: {money(financed)}
            {payment.feesAndIof > 0 && ' mais ' + money(payment.feesAndIof) + ' de tarifas'}.
          </div>

          <Note tone="warning">
            A taxa que o banco anuncia é a nominal. O CET, que inclui tarifa de cadastro,
            registro de gravame e seguro prestamista, sempre vem acima dela. Se você tem uma
            proposta na mão, use a taxa do CET aqui.
          </Note>
        </>
      ) : (
        <div className="hint" style={{ marginTop: 10 }}>
          Você desembolsa {money(Math.max(ev.price - currentCar.marketValue, 0))} no ato, já
          descontando a venda do carro atual por {money(currentCar.marketValue)}.
          <br />
          <br />
          Esta versão não calcula quanto esse dinheiro renderia se ficasse investido. Se a
          alternativa real é deixar o valor rendendo, some isso por fora ao julgar o resultado.
        </div>
      )}
    </Card>
  )
}

/* ------------------------------------------------------------------ */

export function ContextCard({ inputs, update }: CardProps) {
  const { ownership, escalation } = inputs
  const state = STATES.find((s) => s.uf === ownership.uf)

  return (
    <Card title="Impostos e reajustes">
      <div className="grid-2">
        <SelectField
          label="Estado"
          value={ownership.uf}
          options={STATES.map((s) => ({ value: s.uf, label: s.uf + ' — ' + s.name }))}
          onChange={(v) => update((d) => void (d.ownership.uf = v))}
        />
        <NumberField
          label="Licenciamento por ano"
          prefix="R$"
          value={ownership.licensingPerYear}
          min={0}
          onChange={(v) => update((d) => void (d.ownership.licensingPerYear = v))}
        />
      </div>

      <Note tone="warning">
        IPVA de {ownership.uf}: {(state ? state.rate * 100 : 0).toFixed(2).replace('.', ',')}% em
        geral
        {state?.evRule === 'isento' && ', com previsão de isenção para elétricos'}
        {state?.evRule === 'reduzido' &&
          ', com alíquota reduzida de ' +
            ((state.evRate ?? state.rate) * 100).toFixed(2).replace('.', ',') +
            '% para elétricos'}
        {state?.evRule === 'normal' && ', sem tratamento diferenciado para elétricos'}. As regras
        estaduais para elétricos mudam com frequência e algumas têm teto de valor. Confirme na
        Sefaz e, se souber o valor do boleto, digite abaixo.
      </Note>

      <Advanced label="Valores exatos e reajustes">
        <div style={{ marginBottom: 12 }}>
          <Check
            label="Sei o valor exato do IPVA e quero digitar"
            checked={ownership.ipvaOverrideIce !== null || ownership.ipvaOverrideEv !== null}
            onChange={(v) =>
              update((d) => {
                if (v) {
                  d.ownership.ipvaOverrideIce = Math.round(
                    (state ? state.rate : 0.04) * d.currentCar.marketValue,
                  )
                  d.ownership.ipvaOverrideEv = Math.round(
                    (state?.evRule === 'isento' ? 0 : state ? state.rate : 0.04) * d.ev.price,
                  )
                } else {
                  d.ownership.ipvaOverrideIce = null
                  d.ownership.ipvaOverrideEv = null
                }
              })
            }
          />
          <div className="hint" style={{ marginTop: 4 }}>
            Desmarcado, o IPVA é estimado pela alíquota do estado sobre o valor do carro naquele
            ano. Marcado, o valor que você digitar vale para todos os anos.
          </div>
        </div>

        <div className="grid-2">
          {ownership.ipvaOverrideIce !== null && (
            <NumberField
              label="IPVA do carro atual"
              prefix="R$"
              suffix="/ano"
              value={ownership.ipvaOverrideIce}
              min={0}
              onChange={(v) => update((d) => void (d.ownership.ipvaOverrideIce = v))}
            />
          )}
          {ownership.ipvaOverrideEv !== null && (
            <NumberField
              label="IPVA do elétrico"
              prefix="R$"
              suffix="/ano"
              value={ownership.ipvaOverrideEv}
              min={0}
              onChange={(v) => update((d) => void (d.ownership.ipvaOverrideEv = v))}
            />
          )}

          <NumberField
            label="Combustível sobe"
            suffix="% ao ano"
            decimals={1}
            value={escalation.fuelPerYear * 100}
            min={-10}
            max={30}
            onChange={(v) => update((d) => void (d.escalation.fuelPerYear = v / 100))}
          />
          <NumberField
            label="Energia sobe"
            suffix="% ao ano"
            decimals={1}
            value={escalation.energyPerYear * 100}
            min={-10}
            max={30}
            onChange={(v) => update((d) => void (d.escalation.energyPerYear = v / 100))}
          />
          <NumberField
            label="Seguro sobe"
            suffix="% ao ano"
            decimals={1}
            value={escalation.insurancePerYear * 100}
            min={-10}
            max={30}
            onChange={(v) => update((d) => void (d.escalation.insurancePerYear = v / 100))}
          />
          <NumberField
            label="Manutenção sobe"
            suffix="% ao ano"
            decimals={1}
            value={escalation.maintenancePerYear * 100}
            min={-10}
            max={30}
            onChange={(v) => update((d) => void (d.escalation.maintenancePerYear = v / 100))}
          />
        </div>
      </Advanced>
    </Card>
  )
}
