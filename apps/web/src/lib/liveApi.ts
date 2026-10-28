// Typed client for the real FastAPI backend (apps/api) — every function here
// maps 1:1 to an endpoint documented in apps/api's routers. Distinct from
// src/data/* (the mock "2026 Report" dataset), which the Live Data pages do
// not use at all.

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

/** Settlement segment. `all` includes the 38 outlets whose coordinates could
 *  not be classified; they belong to neither of the other two. */
export type Segment =
  | 'all'
  | 'metro'
  | 'non-metro'
  | 'urban'
  | 'rural'
  | 'tier-1'
  | 'tier-2'
  | 'tier-3'

/** Appends `?metro=` only when a segment is actually selected, so the default
 *  request is byte-identical to what it was before the filter existed. */
function seg(path: string, segment: Segment = 'all'): string {
  if (segment === 'all') return path
  return `${path}${path.includes('?') ? '&' : '?'}segment=${segment}`
}

// ---- Geography ----
export interface DistrictGeo {
  district: string
  outlet_count: number
  taluk_count: number
  avg_lat: number
  avg_lng: number
}
export const getDistrictsGeo = (segment: Segment = 'all') =>
  get<DistrictGeo[]>(seg('/api/geography/districts', segment))

export interface OutletClusterPoint {
  lat: number
  lng: number
  outlet_count: number
  district: string
}
export const getOutletClusters = (precision = 2, segment: Segment = 'all') =>
  get<OutletClusterPoint[]>(seg(`/api/geography/clusters?precision=${precision}`, segment))

export interface TalukGeo {
  taluk: string
  outlet_count: number
  city_count: number
}
export const getTaluks = (district: string, segment: Segment = 'all') =>
  get<TalukGeo[]>(seg(`/api/geography/taluks?district=${encodeURIComponent(district)}`, segment))

export interface Whitespace {
  district: string
  taluk: string
  outlet_count: number
  district_median: number
}
export const getWhitespace = (segment: Segment = 'all') =>
  get<Whitespace[]>(seg('/api/geography/whitespace', segment))

// ---- Segmentation ----
export interface SegmentBucket {
  label: string
  outlet_count: number
}
export interface SegmentationSummary {
  outletType: SegmentBucket[]
  channel: SegmentBucket[]
  outletClass: SegmentBucket[]
  ownership: SegmentBucket[]
}
/** `district` scopes the whole breakdown server-side. The endpoint has always
 *  accepted it; nothing in the UI used it until the Geography drill-down. */
export const getSegmentationSummary = (segment: Segment = 'all', district?: string) =>
  get<SegmentationSummary>(
    seg(
      district
        ? `/api/segmentation/summary?district=${encodeURIComponent(district)}`
        : '/api/segmentation/summary',
      segment,
    ),
  )
export const getAgeDistribution = (segment: Segment = 'all') =>
  get<{ age_band: string; outlet_count: number }[]>(seg('/api/segmentation/age-distribution', segment))
export const getSizeProxy = (segment: Segment = 'all') =>
  get<{ size_band: string; outlet_count: number }[]>(seg('/api/segmentation/size-proxy', segment))

// ---- Infrastructure & digital ----
export interface InfraSummary {
  infrastructure: Record<string, number>
  digital: Record<string, number>
}
export const getInfrastructureSummary = (segment: Segment = 'all') =>
  get<InfraSummary>(seg('/api/infrastructure/summary', segment))
export const getInfrastructureByDistrict = (segment: Segment = 'all') =>
  get<Record<string, string | number>[]>(seg('/api/infrastructure/by-district', segment))
export const getInfrastructureByOutletType = (segment: Segment = 'all') =>
  get<Record<string, string | number>[]>(seg('/api/infrastructure/by-outlet-type', segment))
export const getSalesCorrelation = (segment: Segment = 'all') =>
  get<{ flag: string; avg_sales_with: number; avg_sales_without: number; outlets_with: number }[]>(
    seg('/api/infrastructure/sales-correlation', segment),
  )

// ---- Categories ----
export interface CategoryAvailability {
  category_name: string
  display_order: number
  availability_pct: number
  avg_sku_count: number | null
}
export const getCategoryAvailability = (segment: Segment = 'all') =>
  get<CategoryAvailability[]>(seg('/api/categories/availability', segment))
export const getCategoryWhitespace = (limit = 6, segment: Segment = 'all') =>
  get<{ category_name: string; availability_pct: number; white_space_pct: number }[]>(
    seg(`/api/categories/whitespace?limit=${limit}`, segment),
  )
export interface CategoryHeatmap {
  districts: string[]
  categories: string[]
  matrix: number[][]
}
export const getCategoryByDistrict = (limitDistricts = 8, segment: Segment = 'all') =>
  get<CategoryHeatmap>(seg(`/api/categories/by-district?limit_districts=${limitDistricts}`, segment))
export const getCategoryCoOccurrence = (limit = 10, segment: Segment = 'all') =>
  get<{ category_a: string; category_b: string; outlet_count: number }[]>(
    seg(`/api/categories/co-occurrence?limit=${limit}`, segment),
  )

// ---- Brands ----
export interface BrandPenetration {
  totalOutlets: number
  brands: { brand_name: string; outlet_count: number; penetration_pct: number }[]
  noTrackedBrandCount: number
  noTrackedBrandPct: number
}
export const getBrandPenetration = (segment: Segment = 'all') =>
  get<BrandPenetration>(seg('/api/brands/penetration', segment))
export const getBrandWhitespace = (segment: Segment = 'all') =>
  get<{ district: string; outlet_count: number; no_tracked_brand_count: number; no_tracked_brand_pct: number }[]>(
    seg('/api/brands/whitespace', segment),
  )
export const getBrandCoOccurrence = (segment: Segment = 'all') =>
  get<{ brand_a: string; brand_b: string; outlet_count: number }[]>(
    seg('/api/brands/co-occurrence', segment),
  )

// ---- Sales ----
export interface SalesSummary {
  outlets_reporting: number
  mean: number
  median: number
  p25: number
  p75: number
  total_monthly_sales: number
}
export const getSalesSummary = (segment: Segment = 'all') =>
  get<SalesSummary>(seg('/api/sales/summary', segment))
export const getSalesByDistrict = (segment: Segment = 'all') =>
  get<{ district: string; avg_monthly_sales: number; total_monthly_sales: number; outlets_reporting: number }[]>(
    seg('/api/sales/by-district', segment),
  )
export const getSalesByOutletType = (segment: Segment = 'all') =>
  get<{ outlet_type: string; avg_monthly_sales: number; outlet_count: number }[]>(
    seg('/api/sales/by-outlet-type', segment),
  )
export const getTopOutlets = (limit = 20, segment: Segment = 'all') =>
  get<{ outlet_id: number; outlet_name: string; district: string; taluk: string; outlet_type: string; sales_monthly_avg: number }[]>(
    seg(`/api/sales/top-outlets?limit=${limit}`, segment),
  )
export const getCategoryDepthCorrelation = (segment: Segment = 'all') =>
  get<{ category_depth_band: string; avg_monthly_sales: number; outlet_count: number }[]>(
    seg('/api/sales/category-depth-correlation', segment),
  )

// ---- Opportunity ----
export interface OpportunityDistrict {
  district: string
  outlet_count: number
  infra_score: number
  digital_score: number
  category_score: number
  brand_whitespace_pct: number
  outlets_per_taluk: number
  infrastructureGap: number
  categoryGap: number
  digitalGap: number
  brandWhitespaceScore: number
  densityScore: number
  opportunityScore: number
}
export const getOpportunityDistricts = (segment: Segment = 'all') =>
  get<OpportunityDistrict[]>(seg('/api/opportunity/districts', segment))
