import { useMemo } from 'react'
import * as api from '@/lib/liveApi'
import type { Segment } from '@/lib/liveApi'
import { useLiveQuery } from '@/lib/useLiveQuery'

/**
 * The constellation's geometry — real geocoded cells, not a generated field.
 *
 * /geography/clusters buckets the census into ~110m grid cells at precision 3,
 * which yields ~11.5k points. That is the band the brief asks for ("a few
 * thousand rendered points that represent the 103,622, not one mesh each") and
 * it means the shape on screen is Karnataka's actual outlet distribution: the
 * Bengaluru blaze is where the outlets genuinely are, not where we put it.
 *
 * Honest caveat: the endpoint drops cells holding fewer than 3 outlets, so the
 * field represents ~84.6k of the 1,03,622. The hero figure is the true total
 * from the districts endpoint; the point field is a representation of it, and
 * nothing on the page claims one point equals one outlet.
 */

const PRECISION = 3

/** Karnataka's bounding box, from the census itself rather than a gazetteer. */
interface Bounds {
  latMin: number
  latMax: number
  lngMin: number
  lngMax: number
}

export interface ConstellationGeometry {
  /** Projected xy in normalised space, aspect-preserved. [x,y, x,y, ...] */
  positions: Float32Array
  /** A stable pseudo-random scatter position per point, for the Act 1 morph. */
  scatter: Float32Array
  /** 0..1 — relative density of the cell, drives size and brightness. */
  intensity: Float32Array
  /** 1 where the cell belongs to the leading district, else 0. */
  isLeader: Float32Array
  count: number
  leaderDistrict: string | null
  /** Projected centre of the leading district — Act 2 collapses toward it. */
  leaderCentre: [number, number]
}

/** Equirectangular, with an x correction for latitude so the state is not
 *  stretched. Shared by both renderers so they cannot drift apart. */
function project(lat: number, lng: number, b: Bounds): [number, number] {
  const midLat = (b.latMin + b.latMax) / 2
  const kx = Math.cos((midLat * Math.PI) / 180)
  const spanX = (b.lngMax - b.lngMin) * kx
  const spanY = b.latMax - b.latMin
  const span = Math.max(spanX, spanY)
  // Centre on 0 and scale by the larger span, so aspect is preserved.
  const x = (((lng - b.lngMin) * kx - spanX / 2) / span) * 2
  const y = ((lat - b.latMin - spanY / 2) / span) * 2
  return [x, y]
}

/** Deterministic hash → [0,1). Keeps the scatter identical across re-renders,
 *  so the morph does not reshuffle when React re-mounts the canvas. */
function rand(i: number, salt: number): number {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return s - Math.floor(s)
}

export interface ConstellationState {
  geometry: ConstellationGeometry | null
  loading: boolean
  error: string | null
}

export function useConstellationPoints(segment: Segment): ConstellationState {
  const clusters = useLiveQuery(
    () => api.getOutletClusters(PRECISION, segment),
    [segment],
  )
  const districts = useLiveQuery(() => api.getDistrictsGeo(segment), [segment])

  const geometry = useMemo<ConstellationGeometry | null>(() => {
    const rows = clusters.data
    if (!rows?.length) return null

    const leaderDistrict =
      [...(districts.data ?? [])].sort((a, b) => b.outlet_count - a.outlet_count)[0]
        ?.district ?? null

    const bounds: Bounds = {
      latMin: Math.min(...rows.map((r) => r.lat)),
      latMax: Math.max(...rows.map((r) => r.lat)),
      lngMin: Math.min(...rows.map((r) => r.lng)),
      lngMax: Math.max(...rows.map((r) => r.lng)),
    }

    const maxCount = Math.max(...rows.map((r) => r.outlet_count))
    const n = rows.length

    const positions = new Float32Array(n * 2)
    const scatter = new Float32Array(n * 2)
    const intensity = new Float32Array(n)
    const isLeader = new Float32Array(n)

    let lx = 0
    let ly = 0
    let lw = 0

    rows.forEach((r, i) => {
      const [x, y] = project(r.lat, r.lng, bounds)
      positions[i * 2] = x
      positions[i * 2 + 1] = y

      // Scatter starts as a ring rather than a uniform box: a box reads as
      // static noise, a ring reads as something about to resolve.
      const a = rand(i, 1) * Math.PI * 2
      const rad = 0.75 + rand(i, 2) * 0.75
      scatter[i * 2] = Math.cos(a) * rad
      scatter[i * 2 + 1] = Math.sin(a) * rad

      // sqrt so the densest cell does not flatten everything else to nothing —
      // the range 3..976 outlets per cell is very skewed.
      intensity[i] = Math.sqrt(r.outlet_count / maxCount)

      const leads = leaderDistrict != null && r.district === leaderDistrict
      isLeader[i] = leads ? 1 : 0
      if (leads) {
        lx += x * r.outlet_count
        ly += y * r.outlet_count
        lw += r.outlet_count
      }
    })

    return {
      positions,
      scatter,
      intensity,
      isLeader,
      count: n,
      leaderDistrict,
      leaderCentre: lw ? [lx / lw, ly / lw] : [0, 0],
    }
  }, [clusters.data, districts.data])

  return {
    geometry,
    loading: clusters.loading || districts.loading,
    error: clusters.error ?? districts.error,
  }
}
