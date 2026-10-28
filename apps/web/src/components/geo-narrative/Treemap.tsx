import { useInViewOnce, fmtIN } from './primitives'

export interface TreemapDatum {
  label: string
  value: number
  color: string
  /** True when the tile is light enough that dark text is the legible choice.
   *  Set per-colour rather than by rank: the ramp crosses the light/dark
   *  threshold between #8a8576 (dark text, 5.4:1) and #5f6b8c (light text,
   *  5.1:1), which is not where a naive "first three are light" rule falls. */
  darkText: boolean
}

interface Tile {
  d: TreemapDatum
  x: number
  y: number
  w: number
  h: number
}

/** Squarified treemap (Bruls, Huizing & van Wijk). Keeps tiles close to square
 *  so area stays comparable by eye — a strip layout makes long thin tiles that
 *  read as smaller than they are. */
function squarify(items: TreemapDatum[], x: number, y: number, w: number, h: number): Tile[] {
  const total = items.reduce((s, d) => s + d.value, 0)
  if (total <= 0) return []
  const area = w * h
  const nodes = items.map((d) => ({ d, area: (d.value / total) * area }))
  const out: Tile[] = []

  let X = x
  let Y = y
  let Wd = w
  let Hd = h
  let i = 0

  const worst = (row: { area: number }[], len: number) => {
    const s = row.reduce((a, b) => a + b.area, 0)
    if (s <= 0 || len <= 0) return Infinity
    const mx = Math.max(...row.map((r) => r.area))
    const mn = Math.min(...row.map((r) => r.area))
    return Math.max((len * len * mx) / (s * s), (s * s) / (len * len * mn))
  }

  while (i < nodes.length) {
    const len = Math.min(Wd, Hd)
    const row = [nodes[i]]
    let best = worst(row, len)
    let j = i + 1
    while (j < nodes.length) {
      const r = worst([...row, nodes[j]], len)
      if (r <= best) {
        row.push(nodes[j])
        best = r
        j++
      } else break
    }
    const rs = row.reduce((a, b) => a + b.area, 0)
    if (Wd >= Hd) {
      const cw = rs / Hd
      let yy = Y
      row.forEach((nd) => {
        const hh = nd.area / cw
        out.push({ d: nd.d, x: X, y: yy, w: cw, h: hh })
        yy += hh
      })
      X += cw
      Wd -= cw
    } else {
      const rh = rs / Wd
      let xx = X
      row.forEach((nd) => {
        const ww = nd.area / rh
        out.push({ d: nd.d, x: xx, y: Y, w: ww, h: rh })
        xx += ww
      })
      Y += rh
      Hd -= rh
    }
    i = j
  }
  return out
}

export function Treemap({ data, total }: { data: TreemapDatum[]; total: number }) {
  const [ref, inView] = useInViewOnce<SVGSVGElement>()
  const tiles = squarify(data, 2, 2, 896, 336)

  return (
    <svg
      ref={ref}
      viewBox="0 0 900 340"
      width="100%"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Outlet mix by type. ${data
        .map((d) => `${d.label} ${fmtIN(d.value)}`)
        .join('; ')}.`}
      style={{ borderRadius: 16, overflow: 'hidden' }}
    >
      {tiles.map((t, i) => {
        const showLabel = t.w > 92 && t.h > 52
        const fg = t.d.darkText ? '#0c1220' : '#ffffff'
        const fgSub = t.d.darkText ? 'rgba(12,18,32,.78)' : 'rgba(255,255,255,.9)'
        return (
          <g key={t.d.label}>
            <rect
              x={t.x}
              y={t.y}
              width={t.w}
              height={t.h}
              fill={t.d.color}
              stroke="var(--ink)"
              strokeWidth={2}
              rx={3}
              style={{
                transformOrigin: `${t.x + t.w / 2}px ${t.y + t.h / 2}px`,
                opacity: inView ? 1 : 0,
                transform: inView ? 'scale(1)' : 'scale(.6)',
                transition: `opacity .5s ease ${i * 0.06}s, transform .6s var(--ease) ${i * 0.06}s`,
              }}
            />
            {showLabel && (
              <g
                style={{
                  opacity: inView ? 1 : 0,
                  transition: `opacity .5s ease ${i * 0.06 + 0.25}s`,
                }}
              >
                <text
                  x={t.x + 14}
                  y={t.y + 30}
                  className="tm-label"
                  fill={fg}
                  fontSize={Math.min(20, Math.max(13, t.w / 9))}
                >
                  {/* An ellipsis with no way to see the rest is a dead end —
                      `Hotels - QSR/ Darshini…` never resolves. SVG <title>
                      gives it back on hover and to a screen reader. */}
                  {t.d.label.length > 24 && <title>{t.d.label}</title>}
                  {t.d.label.length > 24 ? `${t.d.label.slice(0, 22)}…` : t.d.label}
                </text>
                <text x={t.x + 14} y={t.y + 52} fill={fgSub} fontSize={13}>
                  {fmtIN(t.d.value)} · {((t.d.value / total) * 100).toFixed(1)}%
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}
