export type Region = 'North Karnataka' | 'Central Karnataka' | 'South Karnataka' | 'Coastal Karnataka' | 'Bengaluru Region'

export type OutletSize = 'Kirana / Small' | 'Medium' | 'Large' | 'Others'

export interface InfrastructureMetrics {
  refrigerator: number
  deepFreezer: number
  cooler: number
  internetConnection: number
  digitalPayments: number
  billingSoftware: number
}

export interface OpportunityDrivers {
  infrastructureGap: number
  categoryGap: number
  digitalReadiness: number
  outletDensity: number
  populationPotential: number
}

export interface Taluk {
  id: string
  name: string
  districtId: string
  totalOutlets: number
  ruralOutlets: number
  urbanOutlets: number
  coveragePercent: number
  surveyed: number
  estimatedTotal: number
}

export interface District {
  id: string
  name: string
  region: Region
  headquarters: string
  lat: number
  lng: number
  totalOutlets: number
  estimatedOutlets: number
  ruralOutlets: number
  urbanOutlets: number
  ruralPercent: number
  urbanPercent: number
  taluksCovered: number
  totalTaluks: number
  coveragePercent: number
  population: number
  outletTypeMix: Record<OutletSize, number>
  infrastructure: InfrastructureMetrics
  categoriesTracked: number
  avgCategoriesPerOutlet: number
  categoryAvailability: number
  opportunityScore: number
  opportunityDrivers: OpportunityDrivers
  infrastructureScore: number
  categoryDepthScore: number
  digitalReadinessScore: number
  estRevenueOpportunityCr: number
  fieldResearchers: number
}

export interface Category {
  id: string
  name: string
  group: 'Food' | 'Beverages' | 'Personal Care' | 'Home Care' | 'Others'
  availabilityPercent: number
  avgOutletsStockingPercent: number
  whiteSpaceScore: number
}

export interface OutletTypeShare {
  type: OutletSize
  value: number
  color: string
}

export interface CoverageTrendPoint {
  month: string
  planned: number
  actual: number
}

export interface KpiDatum {
  label: string
  value: string
  delta?: string
  trend?: 'up' | 'down' | 'flat'
  icon?: string
}

export interface RankedDistrict {
  rank: number
  district: string
  value: number
  suffix?: string
}

export interface InsightItem {
  title: string
  description: string
  tone: 'positive' | 'warning' | 'neutral' | 'critical'
}
