import { useInViewOnce, ringArc, fmtIN, pct, MiniLegend } from './primitives'

export interface Slice {
  label: string
  value: number
  color: string
}

/** Arc length without touching the DOM — `r × θ` in radians. Measuring with
 *  getTotalLength() would need a layout pass before the dash animation could
 *  be primed, which flashes the fully-drawn arc on first paint. */
const arcLen = (r: number, deg: number) => (r * deg * Math.PI) / 180

/* ── size class: stacked half-donut ─────────────────────────────────────── */
export function ClassGauge({ rows }: { rows: Slice[] }) {
  const [ref, inView] = useInViewOnce<SVGSVGElement>()
  const total = rows.reduce((s, r) => s + r.value, 0)
  const r = 92
  /* 270° → 450°, i.e. left → top → right: the upper semicircle a gauge is read
     as. The reference's 180° → 360° sweeps bottom → left → top, which renders
     as a lopsided arc down the left-hand side rather than a dial. */
  let angle = 270

  return (
    <>
      <svg
        ref={ref}
        viewBox="0 0 260 170"
        width="100%"
        role="img"
        aria-label={`Outlets by size class. ${rows.map((s) => `${s.label} ${pct(s.value, total)} percent`).join(', ')}.`}
      >
        {rows.map((s, i) => {
          const span = total > 0 ? (s.value / total) * 180 : 0
          const a0 = angle
          const a1 = angle + span
          angle = a1
          const len = arcLen(r, span)
          return (
            <path
              key={s.label}
              d={ringArc(130, 140, r, a0, a1)}
              fill="none"
              stroke={s.color}
              strokeWidth={20}
              style={{
                strokeDasharray: len,
                strokeDashoffset: inView ? 0 : len,
                transition: `stroke-dashoffset 1.1s var(--ease) ${i * 0.12}s`,
              }}
            />
          )
        })}
        <text x={130} y={120} textAnchor="middle" className="gauge-center" fontSize={34}>
          {pct(rows[0]?.value ?? 0, total)}%
        </text>
        <text x={130} y={140} textAnchor="middle" className="gauge-sub" fontSize={13}>
          {rows[0]?.label ?? ''}
        </text>
      </svg>
      <MiniLegend rows={rows} total={total} />
    </>
  )
}

/* ── premises: donut ────────────────────────────────────────────────────── */
export function OwnershipDonut({ rows }: { rows: Slice[] }) {
  const [ref, inView] = useInViewOnce<SVGSVGElement>()
  const total = rows.reduce((s, r) => s + r.value, 0)
  const r = 74
  let angle = 0

  return (
    <>
      <svg
        ref={ref}
        viewBox="0 0 200 200"
        width="100%"
        style={{ maxWidth: 200, margin: '6px auto 0' }}
        role="img"
        aria-label={`Outlets by premises. ${rows.map((s) => `${s.label} ${pct(s.value, total)} percent`).join(', ')}.`}
      >
        {rows.map((s, i) => {
          const span = total > 0 ? (s.value / total) * 360 : 0
          const a0 = angle
          const a1 = angle + Math.min(span, 359.9)
          angle += span
          const len = arcLen(r, Math.min(span, 359.9))
          return (
            <path
              key={s.label}
              d={ringArc(100, 100, r, a0, a1)}
              fill="none"
              stroke={s.color}
              strokeWidth={26}
              style={{
                strokeDasharray: len,
                strokeDashoffset: inView ? 0 : len,
                transition: `stroke-dashoffset 1.1s var(--ease) ${i * 0.12}s`,
              }}
            />
          )
        })}
        <text x={100} y={96} textAnchor="middle" className="gauge-center" fontSize={30}>
          {pct(rows[0]?.value ?? 0, total, 0)}%
        </text>
        <text x={100} y={116} textAnchor="middle" className="gauge-sub" fontSize={13}>
          {rows[0]?.label ?? ''}
        </text>
      </svg>
      <MiniLegend rows={rows} total={total} />
    </>
  )
}

/* ── route to market: funnel ────────────────────────────────────────────── */
export function ChannelFunnel({ rows }: { rows: Slice[] }) {
  const [ref, inView] = useInViewOnce<SVGSVGElement>()
  const total = rows.reduce((s, r) => s + r.value, 0)
  const maxV = Math.max(...rows.map((r) => r.value), 1)

  const cx = 78
  const wmax = 132
  const tierH = 36
  const gap = 8
  const height = rows.length * (tierH + gap) + 12
  // sqrt keeps the smallest tier visible: Retail outnumbers MTO ~215:1, and a
  // linear width would render MTO as a hairline.
  const wOf = (v: number) => Math.max(20, wmax * Math.pow(v / maxV, 0.5))

  return (
    <svg
      ref={ref}
      viewBox={`0 0 300 ${height}`}
      width="100%"
      role="img"
      aria-label={`Outlets by route to market. ${rows.map((s) => `${s.label} ${fmtIN(s.value)}`).join(', ')}.`}
    >
      {rows.map((s, i) => {
        const y = 8 + i * (tierH + gap)
        const wt = wOf(s.value)
        const wb = wOf(i < rows.length - 1 ? rows[i + 1].value : s.value * 0.7)
        return (
          <g key={s.label}>
            <polygon
              points={`${cx - wt / 2},${y} ${cx + wt / 2},${y} ${cx + wb / 2},${y + tierH} ${cx - wb / 2},${y + tierH}`}
              fill={s.color}
              style={{
                transformOrigin: `${cx}px ${y + tierH / 2}px`,
                transform: inView ? 'scaleX(1)' : 'scaleX(0)',
                opacity: inView ? 1 : 0.2,
                transition: `transform .7s var(--ease) ${i * 0.09}s, opacity .5s ease ${i * 0.09}s`,
              }}
            />
            <line x1={cx + wt / 2} y1={y + tierH / 2} x2={158} y2={y + tierH / 2} stroke="var(--hair)" />
            <text
              x={164}
              y={y + tierH / 2 - 3}
              fill="var(--hi)"
              fontSize={13}
              fontFamily="Bricolage Grotesque, sans-serif"
              fontWeight={600}
            >
              {s.label}
            </text>
            <text x={164} y={y + tierH / 2 + 13} fill="var(--mid)" fontSize={12}>
              {fmtIN(s.value)} · {pct(s.value, total)}%
            </text>
          </g>
        )
      })}
    </svg>
  )
}
