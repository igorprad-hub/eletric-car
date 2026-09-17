import { useLayoutEffect, useRef, useState } from 'react'

/** Abaixo disto, os gráficos entram em modo compacto. */
export const COMPACT_WIDTH = 520

/**
 * Largura real do container, em pixels.
 *
 * Os gráficos são desenhados no tamanho de verdade em vez de um viewBox escalado.
 * Custa este hook, mas evita dois problemas: texto esticado quando o container
 * muda de proporção, e coordenada de mouse que não bate com a do SVG no tooltip.
 *
 * A medição é feita de três formas, de propósito. A síncrona, no layout effect,
 * é a que garante a primeira pintura correta — sem ela, um ambiente onde o
 * ResizeObserver não dispara deixa o SVG preso no valor de fallback, desenhando
 * um gráfico de 720px dentro de uma caixa de 300px e vazando por fora. Já
 * aconteceu. O ResizeObserver e o listener de resize são melhorias por cima
 * dela, não a fundação.
 */
export function useElementWidth<T extends HTMLElement>(fallback = 720) {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(fallback)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const measure = () => {
      const w = el.getBoundingClientRect().width
      if (w > 0) setWidth((prev) => (Math.abs(prev - w) > 0.5 ? w : prev))
    }

    measure()

    let observer: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure)
      observer.observe(el)
    }
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
    }
  }, [])

  return { ref, width, compact: width < COMPACT_WIDTH }
}

/** Escala de eixo com passos legíveis (1, 2, 2.5, 5 × 10^n). */
export function niceScale(max: number, targetTicks = 5): { max: number; ticks: number[] } {
  if (!Number.isFinite(max) || max <= 0) return { max: 1, ticks: [0, 1] }

  const rawStep = max / targetTicks
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const normalized = rawStep / magnitude
  const niceNormalized =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10
  const step = niceNormalized * magnitude

  const top = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(v)

  return { max: top, ticks }
}
