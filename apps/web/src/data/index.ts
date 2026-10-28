import type { District, InsightItem, RankedDistrict } from '@/types'
import { generateCategories, generateCoverageTrend, generateDistricts, generateOutletTypeShare, generateTaluks, pickTopDistrictsBy } from './generate'
import { TOTAL_TALUKS } from './districtBase'

export { pickTopDistrictsBy }

export const DISTRICTS = generateDistricts()
export const TALUKS = generateTaluks(DISTRICTS)
export const CATEGORIES = generateCategories(DISTRICTS)
export const OUTLET_TYPE_SHARE = generateOutletTypeShare(DISTRICTS)

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0)
}
function weightedAvg(values: number[], weights: number[]): number {
  const totalWeight = sum(weights)
  return totalWeight === 0 ? 0 : sum(values.map((v, i) => v * weights[i])) / totalWeight
}

export const AGGREGATES = (() => {
  const totalOutlets = sum(DISTRICTS.map((d) => d.totalOutlets))
  const totalEstimated = sum(DISTRICTS.map((d) => d.estimatedOutlets))
  const weights = DISTRICTS.map((d) => d.totalOutlets)
  const ruralPercent = weightedAvg(DISTRICTS.map((d) => d.ruralPercent), weights)
  const urbanPercent = 100 - ruralPercent
  const avgCoverage = weightedAvg(DISTRICTS.map((d) => d.coveragePercent), weights)
  const refrigerator = weightedAvg(DISTRICTS.map((d) => d.infrastructure.refrigerator), weights)
  const deepFreezer = weightedAvg(DISTRICTS.map((d) => d.infrastructure.deepFreezer), weights)
  const digitalPayments = weightedAvg(DISTRICTS.map((d) => d.infrastructure.digitalPayments), weights)
  const billingSoftware = weightedAvg(DISTRICTS.map((d) => d.infrastructure.billingSoftware), weights)
  const internetConnection = weightedAvg(DISTRICTS.map((d) => d.infrastructure.internetConnection), weights)
  const avgCategoriesPerOutlet = weightedAvg(DISTRICTS.map((d) => d.avgCategoriesPerOutlet), weights)
  const categoryAvailability = weightedAvg(DISTRICTS.map((d) => d.categoryAvailability), weights)
  const infrastructureScore = weightedAvg(DISTRICTS.map((d) => d.infrastructureScore), weights)
  const digitalReadinessScore = weightedAvg(DISTRICTS.map((d) => d.digitalReadinessScore), weights)
  const totalRevenueOpportunity = sum(DISTRICTS.map((d) => d.estRevenueOpportunityCr))
  const totalFieldResearchers = sum(DISTRICTS.map((d) => d.fieldResearchers))
  const avgOutletsPerDistrict = totalOutlets / DISTRICTS.length
  const avgOutletsPerTaluk = totalOutlets / TOTAL_TALUKS

  const highOpportunity = DISTRICTS.filter((d) => d.opportunityScore >= 70).length
  const highOpportunityPercent = (highOpportunity / DISTRICTS.length) * 100

  return {
    totalDistricts: DISTRICTS.length,
    totalTaluks: TOTAL_TALUKS,
    totalOutlets,
    totalEstimatedOutlets: totalEstimated,
    ruralPercent: +ruralPercent.toFixed(1),
    urbanPercent: +urbanPercent.toFixed(1),
    avgCoverage: +avgCoverage.toFixed(1),
    refrigerator: +refrigerator.toFixed(1),
    deepFreezer: +deepFreezer.toFixed(1),
    digitalPayments: +digitalPayments.toFixed(1),
    billingSoftware: +billingSoftware.toFixed(1),
    internetConnection: +internetConnection.toFixed(1),
    avgCategoriesPerOutlet: +avgCategoriesPerOutlet.toFixed(1),
    categoryAvailability: +categoryAvailability.toFixed(1),
    infrastructureScore: Math.round(infrastructureScore),
    digitalReadinessScore: Math.round(digitalReadinessScore),
    totalRevenueOpportunityCr: Math.round(totalRevenueOpportunity),
    totalFieldResearchers,
    avgOutletsPerDistrict: Math.round(avgOutletsPerDistrict),
    avgOutletsPerTaluk: Math.round(avgOutletsPerTaluk),
    categoriesTracked: CATEGORIES.length,
    highOpportunityDistricts: highOpportunity,
    highOpportunityPercent: Math.round(highOpportunityPercent),
  }
})()

export const COVERAGE_TREND = generateCoverageTrend(AGGREGATES.avgCoverage)

export const OPPORTUNITY = (() => {
  const highOpportunityOutlets = DISTRICTS.filter((d) => d.opportunityScore >= 70).reduce((sum, d) => sum + d.totalOutlets, 0)
  const highOpportunityOutletPercent = Math.round((highOpportunityOutlets / AGGREGATES.totalOutlets) * 100)

  const highOpportunityTaluks = TALUKS.filter((t) => {
    const district = DISTRICTS.find((d) => d.id === t.districtId)!
    const taluksOpportunity = district.opportunityScore + (100 - t.coveragePercent) * 0.15
    return taluksOpportunity >= 72
  }).length

  const bands = [
    { label: 'High (70+)', min: 70, max: 101, color: '#059669' },
    { label: 'Medium (40–70)', min: 40, max: 70, color: '#D97706' },
    { label: 'Low (<40)', min: 0, max: 40, color: '#94A3B8' },
  ]
  const distribution = bands.map((b) => ({
    name: b.label,
    value: DISTRICTS.filter((d) => d.opportunityScore >= b.min && d.opportunityScore < b.max).length,
    outlets: DISTRICTS.filter((d) => d.opportunityScore >= b.min && d.opportunityScore < b.max).reduce((s, d) => s + d.totalOutlets, 0),
    color: b.color,
  }))

  return {
    totalRevenueOpportunityCr: AGGREGATES.totalRevenueOpportunityCr,
    highOpportunityDistricts: AGGREGATES.highOpportunityDistricts,
    highOpportunityTaluks,
    highOpportunityOutletPercent,
    distribution,
  }
})()

export interface CategoryDepthBucket {
  label: string
  percent: number
}

export const CATEGORY_DEPTH_BUCKETS: CategoryDepthBucket[] = (() => {
  const avg = AGGREGATES.avgCategoriesPerOutlet
  const bands = [
    { label: '1 – 5 Categories', mid: 3 },
    { label: '6 – 10 Categories', mid: 8 },
    { label: '11 – 16 Categories', mid: 13.5 },
    { label: '17 – 22 Categories', mid: 19.5 },
  ]
  const weights = bands.map((b) => Math.max(0.05, 1 - Math.abs(b.mid - avg) / 11))
  const total = weights.reduce((a, b) => a + b, 0)
  return bands.map((b, i) => ({ label: b.label, percent: Math.round((weights[i] / total) * 100) }))
})()

export function getDistrictById(id: string): District | undefined {
  return DISTRICTS.find((d) => d.id === id)
}

export function getTaluksForDistrict(districtId: string) {
  return TALUKS.filter((t) => t.districtId === districtId)
}

export function topDistricts(key: keyof District, count = 5): RankedDistrict[] {
  return pickTopDistrictsBy(DISTRICTS, key, count).map((d, i) => ({
    rank: i + 1,
    district: d.name,
    value: d[key] as number,
  }))
}

export function bottomDistrictsByCoverage(count = 5): RankedDistrict[] {
  return [...DISTRICTS]
    .sort((a, b) => a.coveragePercent - b.coveragePercent)
    .slice(0, count)
    .map((d, i) => ({ rank: i + 1, district: d.name, value: d.coveragePercent, suffix: '%' }))
}

export const EXECUTIVE_INSIGHTS: InsightItem[] = [
  {
    title: 'Rural outlets dominate the base',
    description: `${AGGREGATES.ruralPercent}% of surveyed outlets are rural, signalling deep last-mile reach beyond metro clusters.`,
    tone: 'positive',
  },
  {
    title: 'Digital payments outpacing billing software',
    description: `${AGGREGATES.digitalPayments.toFixed(0)}% of outlets accept digital payments vs only ${AGGREGATES.billingSoftware.toFixed(0)}% using billing software — a clear tooling gap.`,
    tone: 'warning',
  },
  {
    title: `${AGGREGATES.highOpportunityDistricts} districts score high opportunity`,
    description: `Districts with opportunity score above 70 represent concentrated white-space for FMCG expansion.`,
    tone: 'neutral',
  },
  {
    title: 'Coverage gap remains in remote taluks',
    description: `Average survey coverage stands at ${AGGREGATES.avgCoverage}% of estimated outlets, with several rural taluks below 55%.`,
    tone: 'critical',
  },
]
