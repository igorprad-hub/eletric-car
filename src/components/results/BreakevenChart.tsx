import { useMemo, useState } from 'react'

import { niceScale, useElementWidth } from '../../hooks/useElementWidth'
import { money, moneyShort, monthsLabel } from '../../format'
import type { SimulationResult } from '../../domain/types'

type Mode = 'custo' | 'caixa'

/**
 * Em tela estreita o eixo Y encurta os rótulos e os rótulos de fim de linha
 * somem: sem eles, sobram 250px de área de plotagem em vez de 150px. A legenda
 * e o toque no gráfico continuam entregando a mesma informação.
 */
const PAD_WIDE = { top: 14, right: 88, bottom: 30, left: 62 }
const PAD_NARROW = { top: 14, right: 14, bottom: 28, left: 40 }

/**
 * As duas curvas de custo acumulado e o ponto em que elas se cruzam.
 *
 * Um eixo só, duas séries, cores da paleta validada para daltonismo. O cruzamento
 * é o breakeven: dali em diante, trocar sai mais barato do que ficar.
 */
export function BreakevenChart({ result }: { result: SimulationResult }) {
  const { ref, width, compact } = useElementWidth<HTMLDivElement>()
  const [mode, setMode] = useState<Mode>('custo')
  const [hover, setHover] = useState<number | null>(null)

  const PAD = compact ? PAD_NARROW : PAD_WIDE
  const HEIGHT = compact ? 240 : 286

  const geometry = useMemo(() => {
    const pick = (m: { cumulativeCost: number; cumulativeOutflow: number }) =>
      mode === 'custo' ? m.cumulativeCost : m.cumulativeOutflow

    const keep = result.keep.months.map(pick)
    const swap = result.swap.months.map(pick)
    const n = keep.length

    const maxValue = Math.max(...keep, ...swap, 1)
    const minValue = Math.min(...keep, ...swap, 0)
    const scale = niceScale(maxValue - minValue, compact ? 3 : 5)
    const bottom = minValue < 0 ? minValue : 0

    const plotW = Math.max(width - PAD.left - PAD.right, 60)
    const plotH = HEIGHT - PAD.top - PAD.bottom

    const x = (i: number) => PAD.left + (plotW * i) / Math.max(n - 1, 1)
    const y = (v: number) => PAD.top + plotH - ((v - bottom) / (scale.max || 1)) * plotH

    const path = (values: number[]) =>
      values.map((v, i) => (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ')

    return { keep, swap, n, x, y, scale, bottom, plotW, plotH, path }
  }, [result, width, mode, compact, PAD.left, PAD.right, PAD.top, HEIGHT])

  const { keep, swap, n, x, y, scale, bottom, plotW, plotH, path } = geometry

  const monthTicks = useMemo(() => {
    // Passos de uma escada fixa, preferindo múltiplos de 12: assim os rótulos
    // saem todos em anos em vez de misturar "18m" com "3a", que lê mal.
    const escada = [3, 6, 12, 24, 36, 60]
    const maxRotulos = compact ? 6 : 10
    const step = escada.find((s) => Math.ceil((n - 1) / s) + 1 <= maxRotulos) ?? 60

    const out: number[] = []
    for (let m = 0; m < n; m += step) out.push(m)
    // O último ponto sempre aparece, desde que não encoste no anterior.
    const ultimo = n - 1
    if (out[out.length - 1] !== ultimo) {
      if (ultimo - out[out.length - 1] < step / 2) out.pop()
      out.push(ultimo)
    }
    return out
  }, [n, compact])

  const breakevenIndex =
    result.breakevenMonth !== null && result.breakevenMonth < n ? result.breakevenMonth : null

  function pointerMonth(clientX: number, target: SVGSVGElement): number | null {
    const rect = target.getBoundingClientRect()
    const i = Math.round(((clientX - rect.left - PAD.left) / Math.max(plotW, 1)) * (n - 1))
    return i >= 0 && i < n ? i : null
  }

  const tooltipW = compact ? 150 : 180
  const tooltipLeft =
    hover !== null ? Math.min(Math.max(x(hover) - tooltipW / 2, 4), Math.max(width - tooltipW - 4, 4)) : 0

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
          onMouseMove={(e) => setHover(pointerMonth(e.clientX, e.currentTarget))}
          onMouseLeave={() => setHover(null)}
          onTouchStart={(e) => setHover(pointerMonth(e.touches[0].clientX, e.currentTarget))}
          onTouchMove={(e) => setHover(pointerMonth(e.touches[0].clientX, e.currentTarget))}
          onTouchEnd={() => setHover(null)}
          style={{ touchAction: 'pan-y' }}
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
                  x={PAD.left - (compact ? 6 : 10)}
                  y={y(value) + 4}
                  textAnchor="end"
                  fontSize={compact ? 10 : 11}
                  fill="var(--ink-muted)"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {moneyShort(value, compact)}
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
              y={HEIGHT - 9}
              textAnchor={m === 0 ? 'start' : m === n - 1 ? 'end' : 'middle'}
              fontSize={compact ? 10 : 11}
              fill="var(--ink-muted)"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {monthTickLabel(m, compact)}
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
                fontSize={compact ? 10 : 11}
                fontWeight={600}
                fill="var(--ink-2)"
              >
                empata
              </text>
            </g>
          )}

          <path
            d={path(keep)}
            fill="none"
            stroke="var(--keep)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={path(swap)}
            fill="none"
            stroke="var(--swap)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          <circle cx={x(n - 1)} cy={y(keep[n - 1])} r={4} fill="var(--keep)" stroke="var(--surface)" strokeWidth={2} />
          <circle cx={x(n - 1)} cy={y(swap[n - 1])} r={4} fill="var(--swap)" stroke="var(--surface)" strokeWidth={2} />

          {/* Rótulos diretos só onde há espaço. Na tela estreita, a legenda basta. */}
          {!compact && (
            <>
              <text x={x(n - 1) + 9} y={y(keep[n - 1]) + 4} fontSize={11} fill="var(--ink-2)" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {moneyShort(keep[n - 1])}
              </text>
              <text x={x(n - 1) + 9} y={y(swap[n - 1]) + 4} fontSize={11} fill="var(--ink-2)" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {moneyShort(swap[n - 1])}
              </text>
            </>
          )}

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
          <div className="tooltip" style={{ left: tooltipLeft, top: 4, minWidth: tooltipW }}>
            <div className="tooltip-title">{hover === 0 ? 'Hoje' : monthsLabel(hover)}</div>
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
            <div
              className="tooltip-row"
              style={{ marginTop: 4, borderTop: '1px solid var(--line)', paddingTop: 4 }}
            >
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

function monthTickLabel(m: number, compact: boolean): string {
  if (m === 0) return 'hoje'
  if (m % 12 === 0) {
    const anos = m / 12
    return compact ? anos + 'a' : anos + (anos === 1 ? ' ano' : ' anos')
  }
  return m + 'm'
}
