import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useInViewOnce } from './primitives'

/**
 * 100 squares, one per percentage point of the census. Concentration is the
 * hardest thing to feel from a number — "58.7%" is abstract, but a block of
 * gold covering most of a grid is not.
 *
 * Cells are allocated by largest-remainder so the three groups always sum to
 * exactly 100 squares; naive rounding drifts to 99 or 101 on some segments.
 */
export function Waffle({
  leaderShare,
  nextShare,
}: {
  leaderShare: number
  nextShare: number
}) {
  const [ref, inView] = useInViewOnce<HTMLDivElement>()
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(0)

  const restShare = Math.max(0, 100 - leaderShare - nextShare)
  const raw = [leaderShare, nextShare, restShare]
  const floors = raw.map((v) => Math.floor(v))
  let remainder = 100 - floors.reduce((a, b) => a + b, 0)
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  const counts = [...floors]
  for (const { i } of order) {
    if (remainder <= 0) break
    counts[i] += 1
    remainder -= 1
  }

  const cells: string[] = [
    ...Array<string>(counts[0]).fill('blr'),
    ...Array<string>(counts[1]).fill('d2'),
    ...Array<string>(counts[2]).fill('rest'),
  ]

  useEffect(() => {
    if (!inView) return
    if (reduced) {
      setShown(100)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 900)
      setShown(Math.round(p * 100))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, reduced])

  return (
    <div
      ref={ref}
      className="waffle"
      role="img"
      aria-label={`Each square is one percent of the census. ${counts[0]} squares are Bengaluru Urban, ${counts[1]} the next seven districts, ${counts[2]} the rest of the state.`}
    >
      {cells.map((cls, i) => (
        <div key={i} className={`cell ${cls}${i < shown ? ' show' : ''}`} />
      ))}
    </div>
  )
}
