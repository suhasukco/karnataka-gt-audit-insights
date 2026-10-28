import { useEffect, useRef, useState } from 'react'
import { useInViewOnce, fmtIN } from './primitives'

export interface AgeBand {
  age_band: string
  outlet_count: number
}

/** Trading age as a filled ridge. The shape is the point: a single peak in the
 *  5–10 year band says the base is settled, which is a different sales problem
 *  from a base skewed to new openings. */
export function AgeRidge({ bands }: { bands: AgeBand[] }) {
  const [ref, inView] = useInViewOnce<SVGSVGElement>()
  const lineRef = useRef<SVGPathElement>(null)
  const [len, setLen] = useState(0)

  const W = 900
  const H = 320
  const pad = 44
  const max = Math.max(...bands.map((b) => b.outlet_count), 1)

  const pts = bands.map((b, i) => {
    const x = pad + (i * (W - pad * 2)) / Math.max(bands.length - 1, 1)
    const y = H - 40 - (b.outlet_count / max) * (H - 90)
    return { x, y, b }
  })

  // Horizontally-symmetric cubic through each point — a plain polyline reads
  // as a bar-chart outline, and a monotone spline is overkill for six points.
  const curve = pts
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`
      const prev = pts[i - 1]
      const cx = (prev.x + p.x) / 2
      return `C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`
    })
    .join(' ')

  const area = `M ${pts[0]?.x ?? pad} ${H - 40} L ${pts[0]?.x ?? pad} ${pts[0]?.y ?? H - 40} ${pts
    .slice(1)
    .map((p, i) => {
      const prev = pts[i]
      const cx = (prev.x + p.x) / 2
      return `C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`
    })
    .join(' ')} L ${pts[pts.length - 1]?.x ?? W - pad} ${H - 40} Z`

  useEffect(() => {
    if (lineRef.current) setLen(lineRef.current.getTotalLength())
  }, [curve])

  return (
    <>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Outlets by years in business. ${bands
          .map((b) => `${b.age_band}: ${fmtIN(b.outlet_count)}`)
          .join('; ')}.`}
      >
        <defs>
          <linearGradient id="geo-ridge-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E6A93B" stopOpacity="0.55" />
            <stop offset="1" stopColor="#E6A93B" stopOpacity="0" />
          </linearGradient>
        </defs>

        <line x1={pad} y1={H - 40} x2={W - pad} y2={H - 40} stroke="var(--hair)" />

        <path
          d={area}
          fill="url(#geo-ridge-fill)"
          style={{ opacity: inView ? 1 : 0, transition: 'opacity 1.4s ease .3s' }}
        />
        <path
          ref={lineRef}
          d={curve}
          fill="none"
          stroke="#F2C24A"
          strokeWidth={2.5}
          style={
            len
              ? {
                  strokeDasharray: len,
                  strokeDashoffset: inView ? 0 : len,
                  transition: 'stroke-dashoffset 1.6s var(--ease)',
                }
              : undefined
          }
        />

        {pts.map((p) => (
          <g key={p.b.age_band}>
            <circle cx={p.x} cy={p.y} r={4.5} fill="#090D18" stroke="#F2C24A" strokeWidth={2} />
            <text
              x={p.x}
              y={p.y - 14}
              textAnchor="middle"
              fill={p.b.outlet_count === max ? '#F2C24A' : 'var(--mid)'}
              fontSize={13}
              fontFamily="Bricolage Grotesque, sans-serif"
              fontWeight={700}
              style={{ opacity: inView ? 1 : 0, transition: 'opacity .6s ease 1s' }}
            >
              {p.b.outlet_count >= 1000
                ? `${(p.b.outlet_count / 1000).toFixed(1).replace('.0', '')}k`
                : fmtIN(p.b.outlet_count)}
            </text>
          </g>
        ))}
      </svg>
      <div className="ridge-x">
        {bands.map((b) => (
          <span key={b.age_band}>{b.age_band}</span>
        ))}
      </div>
    </>
  )
}
