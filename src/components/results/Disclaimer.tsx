import type { SimulationResult } from '../../domain/types'

export function Warnings({ result }: { result: SimulationResult }) {
  if (result.warnings.length === 0) return null

  return (
    <div className="notes-stack">
      {result.warnings.map((w, i) => (
        <div className="note note-warning" key={i}>
          <span className="note-icon" aria-hidden="true">
            !
          </span>
          <div>{w}</div>
        </div>
      ))}
    </div>
  )
}

/**
 * O rodapé que impede a ferramenta de mentir por omissão.
 *
 * Uma calculadora que cospe "compensa em 34 meses" com duas casas decimais passa
 * uma confiança que os dados não sustentam. Tudo aqui é estimativa construída
 * sobre premissas, e as premissas mais frágeis merecem ser ditas em voz alta.
 */
export function Disclaimer() {
  return (
    <section className="disclaimer">
      <strong>Isto é uma estimativa, não uma previsão.</strong> O resultado vale o que valem as
      premissas que você colocou. Os pontos mais frágeis da conta:
      <ul>
        <li>
          <strong>Desvalorização.</strong> Costuma ser o maior item e é o mais incerto. Elétricos
          têm pouca série histórica de revenda no Brasil, e marcas que chegaram há poucos anos
          ainda não têm curva madura.
        </li>
        <li>
          <strong>Preço de combustível e de energia.</strong> Projetar cinco anos de reajuste é
          chute informado. Use o painel de sensibilidade em vez de acreditar num número só.
        </li>
        <li>
          <strong>Seguro.</strong> Só uma cotação real resolve. Varia muito por modelo, perfil e
          cidade, e no elétrico costuma surpreender para cima.
        </li>
        <li>
          <strong>IPVA.</strong> As regras estaduais para elétricos mudam com frequência e várias
          têm teto de valor. Confirme na Sefaz do seu estado.
        </li>
        <li>
          <strong>Bateria.</strong> A conta não inclui troca de bateria. A garantia costuma ir até
          cerca de 8 anos, então em horizontes longos existe um risco que não está aqui.
        </li>
        <li>
          <strong>Custo de oportunidade.</strong> Esta versão não calcula quanto o dinheiro da
          compra renderia investido. Em compra à vista, isso favorece o cenário de manter mais do
          que o mostrado.
        </li>
      </ul>
    </section>
  )
}

/** O que não cabe em planilha e mesmo assim decide a compra. */
export function NonFinancial() {
  return (
    <section className="card">
      <div className="chart-title">O que a conta não mede</div>
      <div className="chart-sub" style={{ marginTop: 6, maxWidth: '68ch' }}>
        Dinheiro é metade da decisão. A outra metade não tem número:
      </div>
      <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: 'var(--ink-2)', lineHeight: 1.6 }}>
        <li>
          <strong>Viagem longa.</strong> Parar 30 minutos para carregar a cada 300 km muda o
          passeio. Se você faz isso toda semana, pesa; se faz duas vezes por ano, não.
        </li>
        <li>
          <strong>Carregar onde você mora.</strong> Sem tomada na garagem, a economia evapora:
          depender de recarga pública troca R$ 0,95 por R$ 2,50 o kWh.
        </li>
        <li>
          <strong>Rodízio e estacionamento.</strong> Algumas cidades dão isenção ou vaga
          preferencial a elétricos. Vale conferir na sua.
        </li>
        <li>
          <strong>Não ir ao posto.</strong> Sair de casa todo dia com o carro cheio é uma
          conveniência real que nenhuma linha da tabela captura.
        </li>
        <li>
          <strong>Rede de assistência.</strong> Fora dos grandes centros, oficina autorizada e
          peça de reposição podem ser um problema concreto.
        </li>
        <li>
          <strong>Como você dirige.</strong> Torque instantâneo, silêncio e freio regenerativo
          agradam muita gente e incomodam outra tanta. Faça um test drive longo.
        </li>
      </ul>
    </section>
  )
}
