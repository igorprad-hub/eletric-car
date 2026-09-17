import { useMemo, useState } from 'react'

import { SENSITIVITY_VARIABLES, runSensitivity } from '../../domain/sensitivity'
import type { SensitivityId } from '../../domain/sensitivity'
import type { Inputs } from '../../domain/types'
import { money, moneyShort } from '../../format'
import { niceScale, useElementWidth } from '../../hooks/useElementWidth'

const PAD_WIDE = { top: 16, right: 20, bottom: 30, left: 62 }
const PAD_NARROW = { top: 16, right: 12, bottom: 28, left: 40 }

/**
 * O painel mais honesto da ferramenta.
 *
 * Um número único ("empata em 41 meses") esconde o quanto ele depende de premissas
 * que ninguém consegue prever. A curva mostra onde está a virada: a partir de que
 * preço de combustível, de que quilometragem, de que taxa de juros a resposta muda
 * de lado.
 */
export function SensitivityPanel({ inputs }: { inputs: Inputs }) {
  const { ref, width, compact } = useElementWidth<HTMLDivElement>()
  const [variable, setVariable] = useState<SensitivityId>('fuelPrice')
  const [hover, setHover] = useState<number | null>(null)

  const PAD = compact ? PAD_NARROW : PAD_WIDE
  const HEIGHT = compact ? 190 : 220

  const sweep = useMemo(() => runSensitivity(inputs, variable), [inputs, variable])

  const geo = useMemo(() => {
    const values = sweep.points.map((p) => p.difference)
    const maxAbs = Math.max(...values.map(Math.abs), 1)
    const scale = niceScale(maxAbs, 3)

    const plotW = Math.max(width - PAD.left - PAD.right, 60)
    const plotH = HEIGHT - PAD.top - PAD.bottom

    const xs = sweep.points.map((p) => p.x)
    const xMin = Math.min(...xs)
    const xMax = Math.max(...xs)
    const span = xMax - xMin || 1

    const x = (v: number) => PAD.left + ((v - xMin) / span) * plotW
    const y = (v: number) => PAD.top + plotH / 2 - (v / scale.max) * (plotH / 2)

    const d = sweep.points
      .map((p, i) => (i === 0 ? 'M' : 'L') + x(p.x).toFixed(1) + ' ' + y(p.difference).toFixed(1))
      .join(' ')

    return { x, y, d, scale, plotW, plotH, xMin, xMax }
  }, [sweep, width, PAD.left, PAD.right, PAD.top, HEIGHT])

  const { x, y, d, scale, plotW, plotH, xMin, xMax } = geo

  function pointAt(clientX: number, target: SVGSVGElement): number | null {
    const rect = target.getBoundingClientRect()
    const i = Math.round(
      ((clientX - rect.left - PAD.left) / Math.max(plotW, 1)) * (sweep.points.length - 1),
    )
    return i >= 0 && i < sweep.points.length ? i : null
  }

  const hovered = hover !== null ? sweep.points[hover] : null

  return (
    <section className="card">
      <div className="chart-head">
        <div>
          <div className="chart-title">E se as premissas mudarem?</div>
          <div className="chart-sub">{sweep.question}</div>
        </div>
        <select
          value={variable}
          onChange={(e) => setVariable(e.target.value as SensitivityId)}
          aria-label="Variável a testar"
        >
          {SENSITIVITY_VARIABLES.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      <div
        className={
          'note ' + (sweep.tippingPoint === null ? '' : 'note-warning')
        }
        style={{ marginTop: 10 }}
      >
        <span className="note-icon" aria-hidden="true">
          →
        </span>
        <div>
          {sweep.tippingPoint !== null ? (
            <>
              A virada está em <strong>{sweep.format(sweep.tippingPoint)}</strong>. Hoje você
              informou {sweep.format(sweep.currentX)}.
            </>
          ) : (
            <>
              Nesta faixa a resposta não muda de lado. Mexer só em {sweep.label.toLowerCase()} não
              é suficiente para inverter a decisão.
            </>
          )}
        </div>
      </div>

      <div className="chart-wrap" ref={ref} style={{ marginTop: 6 }}>
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={
            'Diferença de custo entre manter e trocar conforme varia ' + sweep.label.toLowerCase()
          }
          onMouseMove={(e) => setHover(pointAt(e.clientX, e.currentTarget))}
          onMouseLeave={() => setHover(null)}
          onTouchStart={(e) => setHover(pointAt(e.touches[0].clientX, e.currentTarget))}
          onTouchMove={(e) => setHover(pointAt(e.touches[0].clientX, e.currentTarget))}
          onTouchEnd={() => setHover(null)}
          style={{ touchAction: 'pan-y' }}
        >
          {[scale.max, 0, -scale.max].map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={y(v)}
                y2={y(v)}
                stroke={v === 0 ? 'var(--line-strong)' : 'var(--line)'}
                strokeWidth={1}
              />
              <text
                x={PAD.left - (compact ? 6 : 10)}
                y={y(v) + 4}
                textAnchor="end"
                fontSize={compact ? 10 : 11}
                fill="var(--ink-muted)"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {v === 0 ? 'empata' : moneyShort(v, compact)}
              </text>
            </g>
          ))}

          {/* Faixa em que trocar compensa fica marcada pela própria linha acima do zero. */}
          <path d={d} fill="none" stroke="var(--swap)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {sweep.tippingPoint !== null && (
            <g>
              <line
                x1={x(sweep.tippingPoint)}
                x2={x(sweep.tippingPoint)}
                y1={PAD.top}
                y2={PAD.top + plotH}
                stroke="var(--line-strong)"
                strokeWidth={1}
              />
              <circle
                cx={x(sweep.tippingPoint)}
                cy={y(0)}
                r={4}
                fill="var(--ink)"
                stroke="var(--surface)"
                strokeWidth={2}
              />
            </g>
          )}

          {sweep.currentX >= xMin && sweep.currentX <= xMax && (
            <g>
              <circle
                cx={x(sweep.currentX)}
                cy={y(sweep.points[nearestIndex(sweep.points.map((p) => p.x), sweep.currentX)].difference)}
                r={4.5}
                fill="var(--keep)"
                stroke="var(--surface)"
                strokeWidth={2}
              />
              <text
                x={x(sweep.currentX)}
                y={PAD.top - 3}
                textAnchor="middle"
                fontSize={11}
                fill="var(--ink-2)"
                fontWeight={600}
              >
                hoje
              </text>
            </g>
          )}

          <text x={PAD.left} y={HEIGHT - 9} fontSize={compact ? 10 : 11} fill="var(--ink-muted)">
            {sweep.format(xMin)}
          </text>
          <text
            x={PAD.left + plotW}
            y={HEIGHT - 9}
            textAnchor="end"
            fontSize={compact ? 10 : 11}
            fill="var(--ink-muted)"
          >
            {sweep.format(xMax)}
          </text>

          {hovered && (
            <line
              x1={x(hovered.x)}
              x2={x(hovered.x)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="var(--ink-muted)"
              strokeWidth={1}
            />
          )}
        </svg>

        {hovered && (
          <div
            className="tooltip"
            style={{
              left: Math.min(Math.max(x(hovered.x) - 75, 4), Math.max(width - 154, 4)),
              top: 4,
              minWidth: 150,
            }}
          >
            <div className="tooltip-title">{sweep.format(hovered.x)}</div>
            <div className="tooltip-row">
              <span>Diferença</span>
              <strong className={hovered.difference >= 0 ? 'positive' : 'negative'}>
                {money(hovered.difference)}
              </strong>
            </div>
            <div className="tooltip-row">
              <span>Empata em</span>
              <strong>
                {hovered.breakevenMonth !== null ? hovered.breakevenMonth + ' meses' : 'nunca'}
              </strong>
            </div>
          </div>
        )}
      </div>

      <div className="hint" style={{ marginTop: 4 }}>
        Acima da linha de equilíbrio, trocar compensa. Abaixo, manter. Cada ponto refaz a
        simulação inteira mudando só esta variável.
      </div>
    </section>
  )
}

function nearestIndex(xs: number[], target: number): number {
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < xs.length; i++) {
    const dist = Math.abs(xs[i] - target)
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  }
  return best
}
