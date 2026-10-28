import { useEffect, useRef } from 'react'
import type { ConstellationGeometry } from './useConstellationPoints'

/**
 * The small-screen and reduced-motion renderer: the same real points, drawn
 * once to a 2D canvas at their true positions.
 *
 * Deliberately not a port of the shader. It is the *resolved* state — territory
 * already formed, Bengaluru already blazing — because on a phone the viewer
 * cannot comfortably drive a pinned morph, and under reduced motion they should
 * not have to. The insight is delivered by the image, not by the transition.
 *
 * Shares `geometry` with the WebGL path, so both draw the identical field.
 */
export function ConstellationFlat({
  geometry,
  focus = 0.55,
}: {
  geometry: ConstellationGeometry
  /** How far toward the Act-2 look to render: 0 even, 1 fully blown out. */
  focus?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const draw = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = parent.clientWidth
      const h = parent.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, w, h)
      // Additive, to match the WebGL field's overlapping glow.
      ctx.globalCompositeOperation = 'lighter'

      const scale = Math.min(w, h) * 0.42
      const cx = w / 2
      const cy = h / 2

      for (let i = 0; i < geometry.count; i++) {
        const x = cx + geometry.positions[i * 2] * scale
        // Screen y is inverted relative to latitude.
        const y = cy - geometry.positions[i * 2 + 1] * scale
        const intensity = geometry.intensity[i]
        const leads = geometry.isLeader[i] === 1

        const r = (0.5 + intensity * 1.9) * (leads ? 1 + focus : 1)
        const alpha = (0.18 + intensity * 0.55) * (leads ? 1 + focus * 0.8 : 1 - focus * 0.45)

        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = leads && focus > 0.3 ? '#fff3e0' : intensity > 0.5 ? '#ffc978' : '#b8814a'
        ctx.globalAlpha = Math.min(1, alpha)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }

    draw()
    const ro = new ResizeObserver(draw)
    if (canvas.parentElement) ro.observe(canvas.parentElement)
    return () => ro.disconnect()
  }, [geometry, focus])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  )
}
