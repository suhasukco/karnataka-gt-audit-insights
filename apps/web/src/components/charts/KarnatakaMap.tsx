import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { geoMercator, geoPath } from 'd3-geo'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { CHOROPLETH_BANDS } from '@/lib/palette'
import { cn } from '@/lib/utils'
import karnatakaGeoRaw from '@/data/karnataka-districts.json'

// The minimal shape this map actually needs — both the mock `District` type
// and the live API's district rows satisfy this without any adapter object.
export interface MapDistrict {
  id: string
  name: string
  region?: string
  totalOutlets: number
}

const karnatakaGeo = karnatakaGeoRaw as unknown as FeatureCollection<Geometry, { district: string }>

const VIEW_WIDTH = 460
const VIEW_HEIGHT = 620

// Spelling differences between the boundary source and our district ids.
const NAME_OVERRIDES: Record<string, string> = {
  bagalkote: 'bagalkot',
  chamarajanagara: 'chamarajanagar',
}

// The boundary source predates the 2021 split of Ballari into Ballari + Vijayanagara,
// so the single "Ballari" polygon stands in for both districts combined.
const FEATURE_DISTRICT_IDS: Record<string, string[]> = {
  ballari: ['ballari', 'vijayanagara'],
}

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-')
}

function niceRound(value: number): number {
  return Math.round(value / 10) * 10
}

function quantileBreaks(values: number[], bands: number): number[] {
  const sorted = [...values].sort((a, b) => a - b)
  const breaks: number[] = []
  for (let i = 1; i < bands; i++) {
    const raw = sorted[Math.floor((sorted.length - 1) * (i / bands))]
    let rounded = niceRound(raw)
    if (breaks.length && rounded <= breaks[breaks.length - 1]) {
      rounded = breaks[breaks.length - 1] + 10
    }
    breaks.push(rounded)
  }
  return breaks
}

function bandColor(value: number, breaks: number[]): string {
  for (let i = 0; i < breaks.length; i++) {
    if (value <= breaks[i]) return CHOROPLETH_BANDS[i]
  }
  return CHOROPLETH_BANDS[CHOROPLETH_BANDS.length - 1]
}

interface MapFeature<T extends MapDistrict> {
  key: string
  name: string
  path: string
  centroid: [number, number]
  value: number
  districts: T[]
}

interface KarnatakaMapProps<T extends MapDistrict> {
  districts: T[]
  metric: (d: T) => number
  formatValue?: (d: T) => string
  height?: number
  navigable?: boolean
  legendLabel?: string
  legendFormat?: (value: number) => string
  aggregate?: 'sum' | 'avg'
  /** Stagger each district's fade-in on mount — for a hero moment, not a
   * repeated-render context (there's no "already seen" tracking). */
  animateIn?: boolean
  /** Hide the side legend — for tight hero placements where the caption below
   * the map already carries the headline number. */
  showLegend?: boolean
  /** Disable hover tracking entirely — for a quiet silhouette placement where
   * every district shares one uniform value and a hover tooltip would just
   * show a meaningless constant. */
  interactive?: boolean
  /** Skip the quantile-band choropleth and fill every district with this one
   * color — for a silhouette placement, not a data encoding. */
  fillOverride?: string
}

export function KarnatakaMap<T extends MapDistrict>({
  districts,
  metric,
  formatValue,
  height = 460,
  navigable = true,
  legendLabel = 'Value',
  legendFormat,
  aggregate = 'avg',
  animateIn = false,
  showLegend = true,
  interactive = true,
  fillOverride,
}: KarnatakaMapProps<T>) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState<MapFeature<T> | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const byId = useMemo(() => new Map(districts.map((d) => [d.id, d])), [districts])

  const { features, breaks } = useMemo(() => {
    const projection = geoMercator().fitSize([VIEW_WIDTH, VIEW_HEIGHT], karnatakaGeo)
    const pathGenerator = geoPath(projection)

    const built: MapFeature<T>[] = karnatakaGeo.features.map((feature: Feature<Geometry, { district: string }>, idx: number) => {
      const rawName = feature.properties?.district ?? `District ${idx}`
      const key = NAME_OVERRIDES[normalize(rawName)] ?? normalize(rawName)
      const districtIds = FEATURE_DISTRICT_IDS[key] ?? [key]
      const matched = districtIds.map((id) => byId.get(id)).filter((d): d is T => Boolean(d))

      const totalWeight = matched.reduce((sum, d) => sum + d.totalOutlets, 0)
      const value =
        matched.length === 0
          ? 0
          : aggregate === 'sum'
            ? matched.reduce((sum, d) => sum + metric(d), 0)
            : matched.reduce((sum, d) => sum + metric(d) * d.totalOutlets, 0) / (totalWeight || 1)

      const centroid = pathGenerator.centroid(feature)

      return {
        key,
        name: matched.length > 1 ? matched.map((d) => d.name).join(' + ') : (matched[0]?.name ?? rawName),
        path: pathGenerator(feature) ?? '',
        centroid: [Number.isFinite(centroid[0]) ? centroid[0] : 0, Number.isFinite(centroid[1]) ? centroid[1] : 0],
        value,
        districts: matched,
      }
    })

    return { features: built, breaks: quantileBreaks(built.map((f) => f.value), CHOROPLETH_BANDS.length) }
  }, [byId, metric, aggregate])

  const format = legendFormat ?? ((v: number) => v.toLocaleString('en-IN'))

  const handleSelect = (feature: MapFeature<T>) => {
    if (!navigable || feature.districts.length === 0) return
    const primary = [...feature.districts].sort((a, b) => b.totalOutlets - a.totalOutlets)[0]
    navigate(`/district-profile/${primary.id}`)
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="relative flex-1 overflow-hidden rounded-2xl">
        <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} width="100%" height={height} className="overflow-visible">
          <defs>
            <radialGradient id="mapGlow" cx="45%" cy="38%" r="70%">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#e0f2fe" stopOpacity={0} />
            </radialGradient>
            <filter id="mapShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.16" />
            </filter>
            <filter id="mapShadowHover" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#071A3D" floodOpacity="0.3" />
            </filter>
          </defs>
          <rect x={0} y={0} width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#mapGlow)" rx={24} />

          {features.map((feature, idx) => {
            const isHovered = hovered?.key === feature.key
            const shared = {
              d: feature.path,
              fill: fillOverride ?? bandColor(feature.value, breaks),
              stroke: isHovered ? '#071A3D' : '#ffffff',
              strokeWidth: isHovered ? 2 : 1,
              filter: isHovered ? 'url(#mapShadowHover)' : 'url(#mapShadow)',
              className: cn('transition-[filter] duration-200 ease-out', navigable && 'cursor-pointer'),
              style: isHovered ? { filter: 'brightness(0.94)' } : undefined,
              onMouseEnter: interactive ? () => setHovered(feature) : undefined,
              onMouseLeave: interactive ? () => setHovered(null) : undefined,
              onClick: interactive ? () => handleSelect(feature) : undefined,
            }

            return animateIn ? (
              <motion.path
                key={feature.key}
                {...shared}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: prefersReducedMotion ? 0.01 : 0.5,
                  delay: prefersReducedMotion ? 0 : idx * 0.018,
                  ease: 'easeOut',
                }}
              />
            ) : (
              <path key={feature.key} {...shared} />
            )
          })}
        </svg>

        {hovered && (
          <div className="pointer-events-none absolute left-3 top-3 min-w-42.5 rounded-xl border border-slate-200/70 bg-white/98 px-3.5 py-3 shadow-[0_0_0_1px_rgba(15,23,42,0.04),0_16px_32px_-8px_rgba(15,23,42,0.22)] backdrop-blur-md">
            <p className="text-[15px] font-semibold tracking-tight text-slate-800">{hovered.name}</p>
            {hovered.districts[0] && <p className="mt-0.5 text-[13px] text-slate-500">{hovered.districts[0].region}</p>}
            <p className="mt-2 text-lg font-bold tracking-tight text-navy-900">
              {hovered.districts.length === 1 && formatValue ? formatValue(hovered.districts[0]) : format(hovered.value)}
            </p>
            <p className="text-[12px] font-medium text-slate-400">{legendLabel}</p>
          </div>
        )}
      </div>

      {showLegend && (
        <div className="flex shrink-0 flex-col justify-center gap-2.5 sm:w-40">
          <p className="text-[12.5px] font-semibold uppercase tracking-widest text-slate-400">{legendLabel}</p>
          {[...CHOROPLETH_BANDS].reverse().map((color, i) => {
            const bandIdx = CHOROPLETH_BANDS.length - 1 - i
            const lower = bandIdx === 0 ? undefined : breaks[bandIdx - 1]
            const upper = bandIdx === breaks.length ? undefined : breaks[bandIdx]
            // `≤`, not `<`: bandColor() puts a district in band 0 when its
            // value is <= breaks[0], so `<` excluded exactly the districts
            // sitting on the boundary. With a filtered segment the first
            // quantile is often 0, which made the lowest row read "< 0" — a
            // band for negative outlet counts, while the districts genuinely
            // in it (zero outlets) matched no label at all.
            const label =
              bandIdx === CHOROPLETH_BANDS.length - 1
                ? `${format(breaks[breaks.length - 1])}+`
                : bandIdx === 0
                  ? `≤ ${format(breaks[0])}`
                  : `${format(lower!)} – ${format(upper!)}`
            return (
              <div key={color} className="flex items-center gap-2.5 text-[13px] font-medium text-slate-600">
                <span className="h-3 w-5 shrink-0 rounded-sm shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]" style={{ backgroundColor: color }} />
                {label}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
