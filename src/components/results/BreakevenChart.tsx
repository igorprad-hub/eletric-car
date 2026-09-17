import { useMemo, useState } from 'react'

import { niceScale, useElementWidth } from '../../hooks/useElementWidth'
import { money, moneyShort, monthsLabel } from '../../format'
import type { SimulationResult } from '../../domain/types'

type Mode = 'custo' | 'caixa'

const PAD = { top: 14, right: 88, bottom: 30, left: 62 }
const HEIGHT = 286

/**
 * As duas curvas de custo acumulado e o ponto em que elas se cruzam.
 *
 * Um eixo só, duas séries, cores da paleta validada para daltonismo. O cruzamento
 * é o breakeven: dali em diante, trocar sai mais barato do que ficar.
 */
export function BreakevenChart({ result }: { result: SimulationResult }) {
  const { ref, width } = useElementWidth<HTMLDivElement>()
  const [mode, setMode] = useState<Mode>('custo')
  const [hover, setHover] = useState<number | null>(null)

  const pick = (m: { cumulativeCost: number; cumulativeOutflow: number }) =>
    mode === 'custo' ? m.cumulativeCost : m.cumulativeOutflow

  const geometry = useMemo(() => {
    const keep = result.keep.months.map(pick)
    const swap = result.swap.months.map(pick)
    const n = keep.length

    const maxValue = Math.max(...keep, ...swap, 1)
    const minValue = Math.min(...keep, ...swap, 0)
    const scale = niceScale(maxValue - minValue)
    const bottom = minValue < 0 ? minValue : 0

    const plotW = Math.max(width - PAD.left - PAD.right, 60)
    const plotH = HEIGHT - PAD.top - PAD.bottom

    const x = (i: number) => PAD.left + (plotW * i) / Math.max(n - 1, 1)
    const y = (v: number) => PAD.top + plotH - ((v - bottom) / (scale.max || 1)) * plotH

    const path = (values: number[]) =>
      values.map((v, i) => (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ')

    return { keep, swap, n, x, y, scale, bottom, plotW, plotH, path }
  }, [result, width, mode])

  const { keep, swap, n, x, y, scale, bottom, plotW, plotH, path } = geometry

  const monthTicks = useMemo(() => {
    const step = n > 121 ? 24 : n > 37 ? 12 : n > 13 ? 6 : 3
    const out: number[] = []
    for (let m = 0; m < n; m += step) out.push(m)
    if (out[out.length - 1] !== n - 1) out.push(n - 1)
    return out
  }, [n])

  const breakevenIndex =
    result.breakevenMonth !== null && result.breakevenMonth < n ? result.breakevenMonth : null

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const i = Math.round(((px - PAD.left) / Math.max(plotW, 1)) * (n - 1))
    setHover(i >= 0 && i < n ? i : null)
  }

  const active = hover ?? breakevenIndex
  const tooltipLeft = active !== null ? Math.min(Math.max(x(active) + 12, 8), width - 190) : 0

  return (
    <section className="card">
      <div className="chart-head">
        <div>
          <div className="chart-title">
            {mode === 'custo' ? 'Custo acumulado' : 'Desembolso acumulado'}
          </div>
          <div className="chart-sub">
            {mode === 'custo'
              ? 'Quanto cada caminho custa de verdade ao longo do tempo, já contando a desvalorização do carro mês a mês. Onde as linhas se cruzam, trocar passa a sair mais barato.'
              : 'Quanto sai do bolso, sem contar depreciação. Útil para enxergar o aperto no caixa, não para decidir.'}
          </div>
        </div>
        <div className="segmented" role="group" aria-label="Tipo de curva">
          <button type="button" aria-pressed={mode === 'custo'} onClick={() => setMode('custo')}>
            Custo real
          </button>
          <button type="button" aria-pressed={mode === 'caixa'} onClick={() => setMode('caixa')}>
            Caixa
          </button>
        </div>
      </div>

      <div className="legend" style={{ margin: '10px 0 2px' }}>
        <span className="legend-item">
          <span className="legend-key" style={{ background: 'var(--keep)' }} />
          {result.keep.label}
        </span>
        <span className="legend-item">
          <span className="legend-key" style={{ background: 'var(--swap)' }} />
          {result.swap.label}
        </span>
      </div>

      <div className="chart-wrap" ref={ref}>
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={
            'Custo acumulado de manter o carro atual contra trocar pelo elétrico ao longo de ' +
            monthsLabel(result.horizonMonths)
          }
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
        >
          {scale.ticks.map((t) => {
            const value = bottom + t
            return (
              <g key={t}>
                <line
                  x1={PAD.left}
                  x2={PAD.left + plotW}
                  y1={y(value)}
                  y2={y(value)}
                  stroke="var(--line)"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 10}
                  y={y(value) + 4}
                  textAnchor="end"
                  fontSize={11}
                  fill="var(--ink-muted)"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {moneyShort(value)}
                </text>
              </g>
            )
          })}

          <line
            x1={PAD.left}
            x2={PAD.left + plotW}
            y1={PAD.top + plotH}
            y2={PAD.top + plotH}
            stroke="var(--line-strong)"
            strokeWidth={1}
          />

          {monthTicks.map((m) => (
            <text
              key={m}
              x={x(m)}
              y={HEIGHT - 10}
              textAnchor={m === 0 ? 'start' : m === n - 1 ? 'end' : 'middle'}
              fontSize={11}
              fill="var(--ink-muted)"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {m === 0 ? 'hoje' : m % 12 === 0 ? m / 12 + (m === 12 ? ' ano' : ' anos') : m + 'm'}
            </text>
          ))}

          {breakevenIndex !== null && (
            <g>
              <line
                x1={x(breakevenIndex)}
                x2={x(breakevenIndex)}
                y1={PAD.top}
                y2={PAD.top + plotH}
                stroke="var(--line-strong)"
                strokeWidth={1}
              />
              <text
                x={x(breakevenIndex)}
                y={PAD.top - 2}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill="var(--ink-2)"
              >
                empata
              </text>
            </g>
          )}

          <path d={path(keep)} fill="none" stroke="var(--keep)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <path d={path(swap)} fill="none" stroke="var(--swap)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {/* Rótulos diretos no fim das linhas: identidade sem depender só da cor. */}
          <circle cx={x(n - 1)} cy={y(keep[n - 1])} r={4} fill="var(--keep)" stroke="var(--surface)" strokeWidth={2} />
          <circle cx={x(n - 1)} cy={y(swap[n - 1])} r={4} fill="var(--swap)" stroke="var(--surface)" strokeWidth={2} />
          <text x={x(n - 1) + 9} y={y(keep[n - 1]) + 4} fontSize={11} fill="var(--ink-2)" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {moneyShort(keep[n - 1])}
          </text>
          <text x={x(n - 1) + 9} y={y(swap[n - 1]) + 4} fontSize={11} fill="var(--ink-2)" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {moneyShort(swap[n - 1])}
          </text>

          {hover !== null && (
            <g>
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD.top}
                y2={PAD.top + plotH}
                stroke="var(--ink-muted)"
                strokeWidth={1}
              />
              <circle cx={x(hover)} cy={y(keep[hover])} r={4.5} fill="var(--keep)" stroke="var(--surface)" strokeWidth={2} />
              <circle cx={x(hover)} cy={y(swap[hover])} r={4.5} fill="var(--swap)" stroke="var(--surface)" strokeWidth={2} />
            </g>
          )}
        </svg>

        {hover !== null && (
          <div className="tooltip" style={{ left: tooltipLeft, top: 8 }}>
            <div className="tooltip-title">
              {hover === 0 ? 'Hoje' : monthsLabel(hover)}
            </div>
            <div className="tooltip-row">
              <span>
                <span className="dot" style={{ background: 'var(--keep)', display: 'inline-block' }} />
                Manter
              </span>
              <strong>{money(keep[hover])}</strong>
            </div>
            <div className="tooltip-row">
              <span>
                <span className="dot" style={{ background: 'var(--swap)', display: 'inline-block' }} />
                Trocar
              </span>
              <strong>{money(swap[hover])}</strong>
            </div>
            <div className="tooltip-row" style={{ marginTop: 4, borderTop: '1px solid var(--line)', paddingTop: 4 }}>
              <span>Diferença</span>
              <strong className={keep[hover] - swap[hover] >= 0 ? 'positive' : 'negative'}>
                {money(keep[hover] - swap[hover])}
              </strong>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
