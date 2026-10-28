import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import type { OutletClusterPoint } from '@/lib/liveApi'

/**
 * The census as a point cloud.
 *
 * The reference design used three.js to scatter particles inside a hand-drawn
 * Karnataka silhouette. `three` was removed from this project on 2026-08-18 and
 * a stylised outline would have been decoration rather than data, so this draws
 * on a plain 2D canvas instead — and every point is a real place: one
 * `/api/geography/clusters` cell (lat/lng rounded to 2dp) sized and coloured by
 * the outlets actually counted there. The shape of Karnataka that emerges is
 * the shape the census found, not one that was drawn.
 */
export function HeroConstellation({ points }: { points: OutletClusterPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || points.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const maxCount = Math.max(...points.map((p) => p.outlet_count))
    const lats = points.map((p) => p.lat)
    const lngs = points.map((p) => p.lng)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    // Equirectangular with a cos(lat) correction, so the state is not stretched
    // east-west at Karnataka's latitude.
    const midLatRad = (((minLat + maxLat) / 2) * Math.PI) / 180
    const lngScale = Math.cos(midLatRad)
    const spanLng = (maxLng - minLng) * lngScale
    const spanLat = maxLat - minLat

    interface Particle {
      tx: number
      ty: number
      sx: number
      sy: number
      x: number
      y: number
      r: number
      color: string
      twinkle: number
    }

    let particles: Particle[] = []
    let width = 0
    let height = 0
    let raf = 0
    let t0 = 0
    let mx = 0
    let my = 0
    let targetX = 0
    let targetY = 0

    const layout = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Fit the state into the right-hand side of the hero, leaving the left
      // clear for the headline. Below 860px the copy sits under the map, so
      // the cloud re-centres.
      const narrow = width < 860
      // Narrow screens stack: the state occupies the top third and the copy sits
      // below it. At 0.52 of the height the cloud ran straight through the
      // headline, and neither the map nor the type survived it.
      const boxW = narrow ? width * 0.72 : width * 0.4
      const boxH = height * (narrow ? 0.3 : 0.78)
      const scale = Math.min(boxW / spanLng, boxH / spanLat)
      const drawW = spanLng * scale
      const drawH = spanLat * scale
      // Centre the state on the right-hand third rather than anchoring its left
      // edge there — anchoring pushed the eastern districts past the viewport.
      const offsetX = narrow ? (width - drawW) / 2 : width * 0.72 - drawW / 2
      const offsetY = narrow ? height * 0.03 : (height - drawH) / 2

      particles = points.map((p) => {
        const x = offsetX + (p.lng - minLng) * lngScale * scale
        // Screen y grows downward, latitude grows northward — so invert.
        const y = offsetY + (maxLat - p.lat) * scale
        const weight = Math.pow(p.outlet_count / maxCount, 0.42)
        const r = 0.7 + weight * 5.4
        // Colour encodes density: gold where the census found the most outlets
        // in one cell, cooling to slate where it found the fewest.
        const color =
          weight > 0.62
            ? `rgba(244, 206, 121, ${0.85 + weight * 0.15})`
            : weight > 0.34
              ? `rgba(230, 169, 59, ${0.6 + weight * 0.3})`
              : weight > 0.17
                ? `rgba(176, 120, 30, ${0.55 + weight})`
                : `rgba(96, 112, 156, ${0.42 + weight * 1.4})`
        return {
          tx: x,
          ty: y,
          sx: x + (Math.random() - 0.5) * width * 1.5,
          sy: y + (Math.random() - 0.5) * height * 1.5,
          x,
          y,
          r,
          color,
          twinkle: Math.random() * Math.PI * 2,
        }
      })
    }

    const SETTLE = reduced ? 1 : 2000

    const draw = (now: number) => {
      if (!t0) t0 = now
      const elapsed = now - t0
      const p = Math.min(1, elapsed / SETTLE)
      const e = 1 - Math.pow(1 - p, 3)

      mx += (targetX - mx) * 0.05
      my += (targetY - my) * 0.05

      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'lighter'

      for (let i = 0; i < particles.length; i++) {
        const pt = particles[i]
        pt.x = pt.sx + (pt.tx - pt.sx) * e
        pt.y = pt.sy + (pt.ty - pt.sy) * e
        // Parallax: bigger (denser) points ride further, which reads as depth.
        const depth = pt.r / 6
        const px = pt.x + mx * 26 * depth
        const py = pt.y + my * 16 * depth
        const pulse = reduced ? 1 : 0.86 + Math.sin(now * 0.0013 + pt.twinkle) * 0.14

        const g = ctx.createRadialGradient(px, py, 0, px, py, pt.r * 3.2)
        g.addColorStop(0, pt.color)
        g.addColorStop(1, 'rgba(9,13,24,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(px, py, pt.r * 3.2 * pulse, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalCompositeOperation = 'source-over'
      // Keep animating after settle only for the drift/twinkle; reduced-motion
      // users get one static frame.
      if (reduced && p >= 1) return
      raf = requestAnimationFrame(draw)
    }

    const onPointerMove = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      targetX = (ev.clientX - rect.left) / rect.width - 0.5
      targetY = (ev.clientY - rect.top) / rect.height - 0.5
    }

    layout()
    raf = requestAnimationFrame(draw)

    const ro = new ResizeObserver(() => {
      layout()
      // Re-running layout resets positions; jump straight to settled so a
      // resize does not replay the fly-in.
      t0 = performance.now() - SETTLE
    })
    ro.observe(canvas)
    if (!reduced) canvas.addEventListener('pointermove', onPointerMove)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('pointermove', onPointerMove)
    }
  }, [points, reduced])

  return (
    <canvas
      ref={canvasRef}
      className="hero-canvas"
      role="img"
      aria-label={`Map of ${points.length.toLocaleString('en-IN')} surveyed outlet clusters across Karnataka, brightest where outlet density is highest`}
    />
  )
}
