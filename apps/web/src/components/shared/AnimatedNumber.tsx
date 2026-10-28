import { useEffect, useState } from 'react'
import { animate } from 'framer-motion'

interface AnimatedNumberProps {
  value: number
  format?: (n: number) => string
  duration?: number
  className?: string
}

/** Counts up from 0 to `value` on mount — used for hero/KPI stats where a
 * static number reads flat. Not used everywhere: most KpiCard call sites
 * pass a pre-formatted string (₹, /31, +, etc.) that isn't worth the risk of
 * generically parsing, so this is opt-in via KpiCard's `countTo` prop.
 *
 * No "run once" ref guard here — React 18 StrictMode (see main.tsx) mounts,
 * cleans up, and remounts every component once in dev. A ref-guarded
 * effect would let the cleanup stop the animation on the first mount and
 * then skip starting it on the second, freezing the display at 0. Letting
 * the effect re-run normally on each mount is what makes it correct under
 * StrictMode, since only the second mount survives.
 */
export function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString('en-IN'), duration = 1.4, className }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    })
    return () => controls.stop()
  }, [value, duration])

  return <span className={className}>{format(display)}</span>
}
