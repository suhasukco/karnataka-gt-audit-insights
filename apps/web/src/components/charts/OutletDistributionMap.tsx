import { useMemo, useState } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import type { FeatureCollection, Geometry } from 'geojson'
import karnatakaGeoRaw from '@/data/karnataka-districts.json'
import { formatNumber } from '@/lib/utils'

const karnatakaGeo = karnatakaGeoRaw as unknown as FeatureCollection<Geometry, { district: string }>

const VIEW_WIDTH = 460
const VIEW_HEIGHT = 620

export interface OutletCluster {
  lat: number
  lng: number
  outlet_count: number
  district: string
}

interface OutletDistributionMapProps {
  points: OutletCluster[]
  height?: number
}

/** Plots real lat/long clusters as a dot-density map — distinct from
 * KarnatakaMap's district choropleth: this shows the *actual* geographic
 * shape of where outlets sit, not an aggregate colored by district.
 * District boundaries are drawn faintly underneath purely for orientation.
 */
export function OutletDistributionMap({ points, height = 460 }: OutletDistributionMapProps) {
  const [hovered, setHovered] = useState<OutletCluster | null>(null)

  const { boundaryPaths, dots, maxCount } = useMemo(() => {
    const projection = geoMercator().fitSize([VIEW_WIDTH, VIEW_HEIGHT], karnatakaGeo)
    const pathGenerator = geoPath(projection)
    const boundaryPaths = karnatakaGeo.features.map((f) => pathGenerator(f) ?? '').filter(Boolean)

    const maxCount = Math.max(...points.map((p) => p.outlet_count), 1)
    const dots = points
      .map((p) => {
        const projected = projection([p.lng, p.lat])
        if (!projected) return null
        const radius = 1.4 + Math.sqrt(p.outlet_count / maxCount) * 7.5
        return { ...p, x: projected[0], y: projected[1], radius }
      })
      .filter((d): d is OutletCluster & { x: number; y: number; radius: number } => d !== null)
      // Draw the biggest dots first so smaller, denser clusters stay visible on top.
      .sort((a, b) => b.radius - a.radius)

    return { boundaryPaths, dots, maxCount }
  }, [points])

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} width="100%" height={height} className="overflow-visible">
        <defs>
          <radialGradient id="distributionGlow" cx="45%" cy="38%" r="70%">
            <stop offset="0%" stopColor="#e0f2fe" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#e0f2fe" stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect x={0} y={0} width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#distributionGlow)" rx={24} />

        {boundaryPaths.map((d, i) => (
          <path key={i} d={d} fill="#F8FAFC" stroke="#E2E8F0" strokeWidth={1} />
        ))}

        {dots.map((dot, i) => {
          const isHovered = hovered === dot
          const intensity = dot.outlet_count / maxCount
          return (
            <circle
              key={i}
              cx={dot.x}
              cy={dot.y}
              r={dot.radius}
              fill="#0D9488"
              fillOpacity={0.18 + intensity * 0.55}
              stroke={isHovered ? '#071A3D' : '#0D9488'}
              strokeOpacity={isHovered ? 1 : 0.35}
              strokeWidth={isHovered ? 1.5 : 0.75}
              className="cursor-pointer transition-[fill-opacity] duration-150"
              onMouseEnter={() => setHovered(dot)}
              onMouseLeave={() => setHovered(null)}
            />
          )
        })}
      </svg>

      {hovered && (
        <div className="pointer-events-none absolute left-3 top-3 min-w-42.5 rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-lg backdrop-blur">
          <p className="text-sm font-semibold text-slate-800">{hovered.district}</p>
          <p className="mt-1.5 text-base font-bold text-navy-900">{formatNumber(hovered.outlet_count)} outlets in this cluster</p>
          <p className="text-[12px] text-slate-400">
            {hovered.lat.toFixed(3)}, {hovered.lng.toFixed(3)}
          </p>
        </div>
      )}

      <p className="mt-2 text-center text-[13px] text-slate-400">
        Each dot is a real geocoded cluster (~1.1km grid) — size and depth scale with outlet density.
      </p>
    </div>
  )
}
