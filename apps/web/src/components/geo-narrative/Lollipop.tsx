import { useInViewOnce, fmtIN, pct } from './primitives'

interface Row {
  district: string
  outlet_count: number
}

/**
 * Top districts on a log scale.
 *
 * Bengaluru Urban holds roughly twelve times the outlets of the next district,
 * so on a linear axis every other bar collapses into a stub and the ranking
 * below second place becomes unreadable. A log axis keeps the tail legible
 * while still showing the leader running off to the right — the distortion is
 * declared in the caption rather than hidden.
 */
export function Lollipop({ rows, total }: { rows: Row[]; total: number }) {
  const [ref, inView] = useInViewOnce<SVGSVGElement>()

  const W = 900
  const H = 430
  const x0 = 210
  // Stops well short of the viewBox edge: the leader's value label is drawn to
  // the right of its dot, and at x1=852 that label ran past 900 and was clipped.
  const x1 = 736
  const top = 24
  const rowH = (H - top - 16) / Math.max(rows.length, 1)

  const values = rows.map((r) => r.outlet_count)
  const maxV = Math.max(...values, 10) * 1.08
  // Floor the axis just under the smallest value so the shortest stem still
  // has visible length instead of sitting on the axis.
  const minV = Math.max(10, Math.min(...values) * 0.75)
  const L = Math.log10
  const lx = (v: number) =>
    x0 + ((L(Math.max(v, minV)) - L(minV)) / (L(maxV) - L(minV))) * (x1 - x0)

  // Decade-ish ticks that actually fall inside the domain.
  const ticks = [100, 300, 1000, 3000, 10000, 30000, 60000].filter(
    (t) => t > minV && t < maxV,
  )

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Top ${rows.length} districts by outlet count, log scale. ${rows
        .map((r) => `${r.district} ${fmtIN(r.outlet_count)}`)
        .join('; ')}.`}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={lx(t)} y1={top - 4} x2={lx(t)} y2={H - 26} stroke="var(--hair)" />
          <text x={lx(t)} y={H - 5} textAnchor="middle" className="grid-tx">
            {t >= 1000 ? `${t / 1000}k` : t}
          </text>
        </g>
      ))}
      <line x1={x0} y1={top - 4} x2={x0} y2={H - 16} stroke="var(--hair-strong)" />

      {rows.map((r, i) => {
        const y = top + rowH * i + rowH / 2
        const lead = i === 0
        const cx = lx(r.outlet_count)
        return (
          <g key={r.district}>
            <text x={12} y={y + 7} className={`lolli-name${lead ? ' lead' : ''}`}>
              {r.district}
            </text>
            <line
              x1={x0}
              y1={y}
              x2={inView ? cx : x0}
              y2={y}
              stroke={lead ? 'var(--gold)' : '#4a557a'}
              strokeWidth={lead ? 3 : 2}
              strokeLinecap="round"
              style={{ transition: `x2 .7s var(--ease) ${i * 0.08}s` }}
            />
            <circle
              cx={cx}
              cy={y}
              r={lead ? 11 : 7}
              fill={lead ? 'var(--gold)' : '#7E8AAC'}
              stroke="var(--ink)"
              strokeWidth={lead ? 3 : 2}
              style={{
                transformOrigin: `${cx}px ${y}px`,
                transform: inView ? 'scale(1)' : 'scale(0)',
                transition: `transform .5s var(--ease) ${i * 0.08 + 0.15}s`,
              }}
            />
            <text
              x={cx + 20}
              y={y + 7}
              className={`lolli-val${lead ? ' lead' : ''}`}
              style={{
                opacity: inView ? 1 : 0,
                transition: `opacity .5s ease ${i * 0.08 + 0.25}s`,
              }}
            >
              {fmtIN(r.outlet_count)} · {pct(r.outlet_count, total)}%
            </text>
          </g>
        )
      })}
    </svg>
  )
}
