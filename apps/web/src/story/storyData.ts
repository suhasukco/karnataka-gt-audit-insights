/**
 * The story's single source of truth — derived live, not transcribed.
 *
 * The original brief listed fixed figures (1,03,622 outlets, Bengaluru Urban at
 * 60,818, "nearly 6 in 10"). Those are all correct for the unfiltered census,
 * but they are only correct there: the segment control can restrict the page to
 * Metro, Rural, Tier 2 and so on, and every one of those claims changes. So the
 * story reads the same live endpoints the dashboards do and recomputes its own
 * headline from whatever is on screen.
 *
 * That also fixes a discrepancy in the brief's own numbers. It paired
 * "General Store — 26.4K · 29.7%", but 26,400 is 25.5% of the census; 29.7% is
 * its share of the top eight types only. Deriving the percentage from the same
 * total the count came from means the two can never disagree again.
 */

import { useMemo } from 'react'
import * as api from '@/lib/liveApi'
import type { Segment } from '@/lib/liveApi'
import { useLiveQuery } from '@/lib/useLiveQuery'

/** Karnataka has 31 districts; the census reached 29 of them. A constant, not
 *  a measurement — it is the denominator the coverage claim is made against. */
export const KARNATAKA_DISTRICTS = 31

export interface Slice {
  label: string
  count: number
  /** Share of the segment's full total — never of a truncated top-N. */
  pct: number
}

export interface DistrictBar {
  district: string
  outlets: number
  /** Share of the segment total, for the concentration claim. */
  pct: number
}

export interface StoryData {
  totalOutlets: number
  districtsCovered: number
  districtsTotal: number
  taluks: number

  /** Descending. The whole concentration story is the shape of this list. */
  districts: DistrictBar[]
  /** The single most concentrated district in the current segment. */
  leader: DistrictBar | null
  /** "Nearly 6 in 10" as a number: how many outlets in 10 sit in the leader. */
  leaderPerTen: number

  outletType: Slice[]
  channel: Slice[]
  outletClass: Slice[]
  ownership: Slice[]

  /** The Act 4 sentence, assembled from the modal value of each dimension so it
   *  stays true under any segment rather than asserting "small, rented,
   *  medium-class" from memory. */
  typicalOutlet: string | null
}

function toSlices(rows: { label: string; outlet_count: number }[] | undefined): Slice[] {
  if (!rows?.length) return []
  // Denominator is every row, including the long tail, so a slice's percentage
  // always means "share of all outlets in this segment".
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

/** Ownership arrives with both "No" and "Yes" alongside Rented/Own — data-entry
 *  artefacts of a couple of hundred rows. Folded into one honest bucket rather
 *  than silently dropped, so the slices still sum to the total. */
function foldOwnership(slices: Slice[]): Slice[] {
  const known = slices.filter((s) => /rented|own/i.test(s.label))
  const rest = slices.filter((s) => !/rented|own/i.test(s.label))
  if (!rest.length) return known
  const other = rest.reduce(
    (acc, s) => ({ label: 'Not recorded', count: acc.count + s.count, pct: acc.pct + s.pct }),
    { label: 'Not recorded', count: 0, pct: 0 },
  )
  return [...known, { ...other, pct: Math.round(other.pct * 10) / 10 }]
}

export interface StoryState {
  data: StoryData | null
  loading: boolean
  error: string | null
}

export function useStoryData(segment: Segment): StoryState {
  const geo = useLiveQuery(() => api.getDistrictsGeo(segment), [segment])
  const seg = useLiveQuery(() => api.getSegmentationSummary(segment), [segment])

  const loading = geo.loading || seg.loading
  const error = geo.error ?? seg.error

  const data = useMemo<StoryData | null>(() => {
    if (!geo.data || !seg.data) return null

    const totalOutlets = geo.data.reduce((s, d) => s + d.outlet_count, 0)
    const districts: DistrictBar[] = [...geo.data]
      .sort((a, b) => b.outlet_count - a.outlet_count)
      .map((d) => ({
        district: d.district,
        outlets: d.outlet_count,
        pct: totalOutlets ? Math.round((d.outlet_count / totalOutlets) * 1000) / 10 : 0,
      }))

    const leader = districts[0] ?? null

    const outletType = toSlices(seg.data.outletType)
    const channel = toSlices(seg.data.channel)
    const outletClass = toSlices(seg.data.outletClass)
    const ownership = foldOwnership(toSlices(seg.data.ownership))

    // Assembled, not asserted: each clause is the modal value of its dimension
    // in the current segment.
    const modal = (s: Slice[]) => s[0]?.label.toLowerCase() ?? null
    const cls = modal(outletClass)
    const own = modal(ownership)
    const type = outletType[0]?.label
    const typicalOutlet =
      cls && own && type
        ? `The typical outlet here is a ${own}, ${cls}-class ${type.toLowerCase()}.`
        : null

    return {
      totalOutlets,
      districtsCovered: geo.data.length,
      districtsTotal: KARNATAKA_DISTRICTS,
      taluks: geo.data.reduce((s, d) => s + d.taluk_count, 0),
      districts,
      leader,
      leaderPerTen: leader ? Math.round(leader.pct / 10) : 0,
      outletType,
      channel,
      outletClass,
      ownership,
      typicalOutlet,
    }
  }, [geo.data, seg.data])

  return { data, loading, error }
}

/** Indian grouping (1,03,622), used everywhere a figure appears. */
export function formatIndian(n: number): string {
  return Math.round(n).toLocaleString('en-IN')
}
