import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

/** The reference design drove every reveal through GSAP ScrollTrigger. GSAP was
 *  removed from this project on 2026-08-18, so the same treatment is rebuilt on
 *  Framer Motion, which is already a dependency. Timing matches lib/motion.ts so
 *  this page reveals at the same rhythm as the light tabs. */
const EASE_OUT = [0.16, 1, 0.3, 1] as const

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  )
}

/** Fires once when the element first scrolls into view. Charts use this to
 *  start their draw-on animation, so nothing animates off-screen. */
export function useInViewOnce<T extends Element>() {
  const ref = useRef<T>(null)
  const inView = useInView(ref, { once: true, margin: '-70px' })
  return [ref, inView] as const
}

/** Indian digit grouping (1,03,622 — not 103,622). The census is quoted in
 *  lakhs throughout the report, so the whole page has to agree with it. */
export const fmtIN = (n: number) => Math.round(n).toLocaleString('en-IN')

export const pct = (part: number, whole: number, dp = 1) =>
  whole > 0 ? ((part / whole) * 100).toFixed(dp) : '0.0'

/** Counts from 0 to `to` on a cubic ease-out. Returns the live value so the
 *  caller can format it however it likes. Honours reduced-motion by snapping. */
export function useCountUp(to: number, duration = 1100, start = true) {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(reduced || !start ? to : 0)

  useEffect(() => {
    if (reduced || !start) {
      setValue(to)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      setValue(to * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, duration, reduced, start])

  return value
}

/** A count-up that only begins once the number is on screen. */
export function CountUp({
  to,
  duration = 1100,
  format = fmtIN,
  className,
}: {
  to: number
  duration?: number
  format?: (n: number) => string
  className?: string
}) {
  const [ref, inView] = useInViewOnce<HTMLSpanElement>()
  const value = useCountUp(to, duration, inView)
  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  )
}

/** Describes an SVG arc on a circle — shared by the gauge and the donut. */
export function ringArc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const polar = (deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }
  const [x0, y0] = polar(a0)
  const [x1, y1] = polar(a1)
  const large = (((a1 - a0) % 360) + 360) % 360 > 180 ? 1 : 0
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`
}

/** Legend shared by the gauge and donut minis. */
export function MiniLegend({
  rows,
  total,
}: {
  rows: { label: string; value: number; color: string }[]
  total: number
}) {
  return (
    <div className="mini-legend">
      {rows.map((r) => (
        <div key={r.label}>
          <i style={{ background: r.color }} />
          <span>{r.label}</span>
          <b>{pct(r.value, total)}%</b>
        </div>
      ))}
    </div>
  )
}
