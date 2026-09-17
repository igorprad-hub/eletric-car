import { useEffect, useRef, useState } from 'react'

/**
 * Largura real do container, em pixels.
 *
 * Os gráficos são desenhados no tamanho de verdade em vez de um viewBox escalado.
 * Custa este hook, mas evita dois problemas chatos: texto esticado quando o
 * container muda de proporção, e coordenada de mouse que não bate com a
 * coordenada do SVG na hora do tooltip.
 */
export function useElementWidth<T extends HTMLElement>(fallback = 720) {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(fallback)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setWidth(w)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, width }
}

/** Escala de eixo com passos legíveis (1, 2, 2.5, 5 × 10^n). */
export function niceScale(max: number, targetTicks = 5): { max: number; ticks: number[] } {
  if (!Number.isFinite(max) || max <= 0) return { max: 1, ticks: [0, 1] }

  const rawStep = max / targetTicks
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const normalized = rawStep / magnitude
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10
  const step = niceNormalized * magnitude

  const top = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(v)

  return { max: top, ticks }
}
