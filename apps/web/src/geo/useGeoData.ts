import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as api from '@/lib/liveApi'
import type { Segment } from '@/lib/liveApi'
import { useLiveQuery } from '@/lib/useLiveQuery'

/**
 * Everything the Geography page shows, derived live from two scopes:
 *
 *   segment   — Metro / Rural / Tier N …  (existing, page-wide)
 *   district  — the click-to-scope selection
 *
 * Both live in the URL, so a filtered view is shareable and survives reload.
 *
 * The district scope is not decoration: `/segmentation/summary` and
 * `/geography/taluks` both already accept `?district=`, so selecting one
 * genuinely re-queries the warehouse rather than filtering a cached array in
 * the browser. That is why the whole page can rescope honestly.
 */

export const KARNATAKA_DISTRICTS = 31

/** Ownership arrives with stray "No"/"Yes" rows — a couple of hundred rows of
 *  data-entry artefact. Folded into one honest bucket rather than shown as a
 *  mystery bar, and never silently dropped, so shares still sum to the total. */
function foldOwnership(rows: api.SegmentBucket[]): api.SegmentBucket[] {
  const known = rows.filter((r) => /rented|own/i.test(r.label))
  const rest = rows.filter((r) => !/rented|own/i.test(r.label))
  if (!rest.length) return known
  return [
    ...known,
    { label: 'Not recorded', outlet_count: rest.reduce((s, r) => s + r.outlet_count, 0) },
  ]
}

export interface Share {
  label: string
  count: number
  /** Share of the scope's full total — never of a truncated top-N. */
  pct: number
}

function toShares(rows: api.SegmentBucket[] | undefined): Share[] {
  if (!rows?.length) return []
  const total = rows.reduce((s, r) => s + r.outlet_count, 0)
  if (!total) return []
  return rows
    .filter((r) => r.label)
    .map((r) => ({
      label: r.label,
      count: r.outlet_count,
      pct: Math.round((r.outlet_count / total) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count)
}

export interface DistrictRow {
  district: string
  outlets: number
  taluks: number
  pct: number
}

export interface GeoData {
  /** Total for the current segment, before any district scope. */
  stateTotal: number
  districtsCovered: number
  districtsTotal: number
  /** The two (or however many) Karnataka districts the census did not reach. */
  taluksTotal: number

  /** Descending by outlets. The concentration story is this list's shape. */
  districts: DistrictRow[]
  leader: DistrictRow | null
  /** Leader's multiple of the runner-up — the sharpest single figure here. */
  leaderMultiple: number | null

  /** Null when nothing is scoped. */
  scoped: DistrictRow | null

  outletType: Share[]
  channel: Share[]
  outletClass: Share[]
  ownership: Share[]
  ageBands: Share[]

  /** Assembled from modal values so it stays true under any scope. */
  typicalOutlet: string | null

  /** Taluks inside the scoped district, or [] when unscoped. */
  taluks: { taluk: string; outlets: number; cities: number }[]
  /** Under-covered taluks — statewide, or filtered to the scope. */
  underCovered: { district: string; taluk: string; outlets: number; median: number }[]
}

export function useDistrictScope(): [string | null, (d: string | null) => void] {
  const [params, setParams] = useSearchParams()
  const district = params.get('district')

  const setDistrict = useCallback(
    (next: string | null) => {
      const p = new URLSearchParams(params)
      if (!next) p.delete('district')
      else p.set('district', next)
      setParams(p, { replace: true })
    },
    [params, setParams],
  )

  return [district, setDistrict]
}

export interface GeoState {
  data: GeoData | null
  loading: boolean
  /** True only on the very first load — a rescope keeps the old data on screen
   *  so panels can animate to new values instead of flashing empty. */
  rescoping: boolean
  error: string | null
}

export function useGeoData(segment: Segment, district: string | null): GeoState {
  // District list is segment-scoped but never district-scoped — it is the thing
  // you pick from, so it must keep showing every district.
  const districts = useLiveQuery(() => api.getDistrictsGeo(segment), [segment])

  const seg = useLiveQuery(
    () => api.getSegmentationSummary(segment, district ?? undefined),
    [segment, district],
  )
  const age = useLiveQuery(() => api.getAgeDistribution(segment), [segment])
  const taluks = useLiveQuery(
    () => (district ? api.getTaluks(district, segment) : Promise.resolve([])),
    [segment, district],
  )
  const whitespace = useLiveQuery(() => api.getWhitespace(segment), [segment])

  const data = useMemo<GeoData | null>(() => {
    if (!districts.data || !seg.data) return null

    const stateTotal = districts.data.reduce((s, d) => s + d.outlet_count, 0)
    const rows: DistrictRow[] = [...districts.data]
      .sort((a, b) => b.outlet_count - a.outlet_count)
      .map((d) => ({
        district: d.district,
        outlets: d.outlet_count,
        taluks: d.taluk_count,
        pct: stateTotal ? Math.round((d.outlet_count / stateTotal) * 1000) / 10 : 0,
      }))

    const leader = rows[0] ?? null
    const runnerUp = rows[1] ?? null
    const leaderMultiple =
      leader && runnerUp && runnerUp.outlets
        ? Math.round((leader.outlets / runnerUp.outlets) * 10) / 10
        : null

    const outletType = toShares(seg.data.outletType)
    const channel = toShares(seg.data.channel)
    const outletClass = toShares(seg.data.outletClass)
    const ownership = toShares(foldOwnership(seg.data.ownership))

    const modal = (s: Share[]) => s[0]?.label ?? null
    const cls = modal(outletClass)
    const own = modal(ownership)
    const type = modal(outletType)
    const where = district ?? 'Karnataka'
    const typicalOutlet =
      cls && own && type
        ? `The typical ${where} outlet is a ${own.toLowerCase()}, ${cls.toLowerCase()}-class ${type.toLowerCase()}.`
        : null

    const under = (whitespace.data ?? [])
      .map((w) => ({
        district: w.district,
        taluk: w.taluk,
        outlets: w.outlet_count,
        median: w.district_median,
      }))
      .filter((w) => !district || w.district === district)

    return {
      stateTotal,
      districtsCovered: rows.length,
      districtsTotal: KARNATAKA_DISTRICTS,
      taluksTotal: districts.data.reduce((s, d) => s + d.taluk_count, 0),
      districts: rows,
      leader,
      leaderMultiple,
      scoped: district ? rows.find((r) => r.district === district) ?? null : null,
      outletType,
      channel,
      outletClass,
      ownership,
      ageBands: toShares(
        (age.data ?? []).map((a) => ({ label: a.age_band, outlet_count: a.outlet_count })),
      ),
      typicalOutlet,
      taluks: (taluks.data ?? []).map((t) => ({
        taluk: t.taluk,
        outlets: t.outlet_count,
        cities: t.city_count,
      })),
      underCovered: under,
    }
  }, [districts.data, seg.data, age.data, taluks.data, whitespace.data, district])

  return {
    data,
    loading: districts.loading && !districts.data,
    rescoping: seg.loading || taluks.loading,
    error: districts.error ?? seg.error,
  }
}
