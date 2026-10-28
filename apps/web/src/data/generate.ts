import type { Category, CoverageTrendPoint, District, OutletSize, OutletTypeShare, Taluk } from '@/types'
import { DISTRICT_BASE } from './districtBase'
import { CATEGORY_BASE } from './categoryBase'
import { randRange, seededRandom } from './seed'
import { OUTLET_TYPE_COLORS } from '@/lib/palette'

const TARGET_TOTAL_OUTLETS = 103400
const TARGET_REVENUE_CR = 8650
const CATEGORIES_TRACKED = CATEGORY_BASE.length

function normalize(values: number[]): number[] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return values.map(() => 50)
  return values.map((v) => ((v - min) / (max - min)) * 100)
}

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step
}

interface RawDistrict {
  id: string
  rawOutlets: number
  urbanPercent: number
  coveragePercent: number
  infra: District['infrastructure']
  infrastructureScore: number
  avgCategoriesPerOutlet: number
  categoryAvailability: number
  categoryDepthScore: number
  digitalReadinessScore: number
}

function buildRaw(): RawDistrict[] {
  return DISTRICT_BASE.map((base) => {
    const rng = seededRandom(base.id)
    const densityFactor = randRange(rng, 0.0085, 0.012) + base.urbanBaseline * 0.0035
    const rawOutlets = base.population * densityFactor

    const urbanPercent = Math.max(6, Math.min(94, base.urbanBaseline * 100 + randRange(rng, -4, 4)))
    const coveragePercent = Math.max(48, Math.min(96, randRange(rng, 52, 90) + (base.urbanBaseline - 0.3) * 12))

    const refrigerator = Math.max(12, Math.min(95, 28 + urbanPercent * 0.38 + randRange(rng, -7, 7)))
    const deepFreezer = Math.max(6, Math.min(82, refrigerator * 0.58 + randRange(rng, -6, 6)))
    const cooler = Math.max(10, Math.min(90, refrigerator * 0.86 + randRange(rng, -5, 5)))
    const internetConnection = Math.max(18, Math.min(98, 42 + urbanPercent * 0.48 + randRange(rng, -8, 8)))
    const digitalPayments = Math.max(10, Math.min(96, internetConnection * 0.84 + randRange(rng, -7, 7)))
    const billingSoftware = Math.max(3, Math.min(62, 6 + urbanPercent * 0.28 + randRange(rng, -5, 5)))

    const infrastructureScore =
      refrigerator * 0.24 + deepFreezer * 0.16 + cooler * 0.16 + internetConnection * 0.2 + digitalPayments * 0.14 + billingSoftware * 0.1

    const avgCategoriesPerOutlet = Math.max(6, Math.min(CATEGORIES_TRACKED, 9 + urbanPercent * 0.11 + randRange(rng, -1.5, 1.5)))
    const categoryAvailability = Math.max(28, Math.min(92, 46 + urbanPercent * 0.32 + randRange(rng, -9, 9)))
    const categoryDepthScore = (avgCategoriesPerOutlet / CATEGORIES_TRACKED) * 60 + categoryAvailability * 0.4
    const digitalReadinessScore = internetConnection * 0.4 + digitalPayments * 0.4 + Math.min(billingSoftware * 1.4, 100) * 0.2

    return {
      id: base.id,
      rawOutlets,
      urbanPercent,
      coveragePercent,
      infra: { refrigerator, deepFreezer, cooler, internetConnection, digitalPayments, billingSoftware },
      infrastructureScore,
      avgCategoriesPerOutlet,
      categoryAvailability,
      categoryDepthScore,
      digitalReadinessScore,
    }
  })
}

function buildOutletTypeMix(rng: () => number, urbanPercent: number): Record<OutletSize, number> {
  const kirana = Math.max(38, Math.min(78, 70 - urbanPercent * 0.14 + randRange(rng, -4, 4)))
  const large = Math.max(2, Math.min(20, 4 + urbanPercent * 0.14 + randRange(rng, -2, 2)))
  const others = Math.max(2, Math.min(10, 5 + randRange(rng, -1.5, 1.5)))
  const medium = Math.max(10, 100 - kirana - large - others)
  const total = kirana + medium + large + others
  const scale = 100 / total
  return {
    'Kirana / Small': +(kirana * scale).toFixed(1),
    Medium: +(medium * scale).toFixed(1),
    Large: +(large * scale).toFixed(1),
    Others: +(others * scale).toFixed(1),
  }
}

export function generateDistricts(): District[] {
  const raw = buildRaw()
  const rawOutletsArr = raw.map((r) => r.rawOutlets)
  const scale = TARGET_TOTAL_OUTLETS / rawOutletsArr.reduce((a, b) => a + b, 0)
  const scaledOutlets = raw.map((r) => roundToNearest(r.rawOutlets * scale, 10))

  const densityRaw = raw.map((_r, i) => scaledOutlets[i] / DISTRICT_BASE[i].taluks.length)
  const densityScores = normalize(densityRaw)

  const popPerOutletRaw = raw.map((_r, i) => DISTRICT_BASE[i].population / scaledOutlets[i])
  const populationPotentialScores = normalize(popPerOutletRaw)

  const rawOpportunity = raw.map((r, i) => {
    const infraGap = 100 - r.infrastructureScore
    const categoryGap = 100 - r.categoryAvailability
    const digitalGap = 100 - r.digitalReadinessScore
    return infraGap * 0.22 + categoryGap * 0.24 + digitalGap * 0.16 + densityScores[i] * 0.16 + populationPotentialScores[i] * 0.22
  })
  // Blending several independently-normalized components clusters raw scores near the mean
  // (regression to the mean), so stretch across a wide band to keep the "high opportunity"
  // (70+) tier meaningful instead of empty. Compressed to [5, 98] so the extremes read as
  // genuinely low/high rather than a literal 0/100 that looks like a data error.
  const opportunityScores = normalize(rawOpportunity).map((v) => 5 + (v / 100) * 93)
  const revenueRaw = opportunityScores.map((opp, i) => ({ opp, revenue: scaledOutlets[i] * (opp / 100) * 0.62 }))
  const revenueScale = TARGET_REVENUE_CR / revenueRaw.reduce((a, b) => a + b.revenue, 0)

  return DISTRICT_BASE.map((base, i) => {
    const r = raw[i]
    const rng = seededRandom(`${base.id}-mix`)
    const totalOutlets = scaledOutlets[i]
    const estimatedOutlets = Math.round(totalOutlets / (r.coveragePercent / 100))
    const urbanPercent = +r.urbanPercent.toFixed(1)
    const ruralPercent = +(100 - urbanPercent).toFixed(1)
    const urbanOutlets = Math.round((totalOutlets * urbanPercent) / 100)
    const ruralOutlets = totalOutlets - urbanOutlets
    const opp = revenueRaw[i].opp
    const opportunityScore = Math.round(Math.max(0, Math.min(100, opp)))

    return {
      id: base.id,
      name: base.name,
      region: base.region,
      headquarters: base.headquarters,
      lat: base.lat,
      lng: base.lng,
      totalOutlets,
      estimatedOutlets,
      ruralOutlets,
      urbanOutlets,
      ruralPercent,
      urbanPercent,
      taluksCovered: base.taluks.length,
      totalTaluks: base.taluks.length,
      coveragePercent: +r.coveragePercent.toFixed(1),
      population: base.population,
      outletTypeMix: buildOutletTypeMix(rng, urbanPercent),
      infrastructure: {
        refrigerator: +r.infra.refrigerator.toFixed(1),
        deepFreezer: +r.infra.deepFreezer.toFixed(1),
        cooler: +r.infra.cooler.toFixed(1),
        internetConnection: +r.infra.internetConnection.toFixed(1),
        digitalPayments: +r.infra.digitalPayments.toFixed(1),
        billingSoftware: +r.infra.billingSoftware.toFixed(1),
      },
      categoriesTracked: CATEGORIES_TRACKED,
      avgCategoriesPerOutlet: +r.avgCategoriesPerOutlet.toFixed(1),
      categoryAvailability: +r.categoryAvailability.toFixed(1),
      opportunityScore,
      opportunityDrivers: {
        infrastructureGap: Math.round(100 - r.infrastructureScore),
        categoryGap: Math.round(100 - r.categoryAvailability),
        digitalReadiness: Math.round(100 - r.digitalReadinessScore),
        outletDensity: Math.round(densityScores[i]),
        populationPotential: Math.round(populationPotentialScores[i]),
      },
      infrastructureScore: Math.round(r.infrastructureScore),
      categoryDepthScore: Math.round(r.categoryDepthScore),
      digitalReadinessScore: Math.round(r.digitalReadinessScore),
      estRevenueOpportunityCr: roundToNearest(revenueRaw[i].revenue * revenueScale, 5),
      fieldResearchers: Math.max(2, Math.round(totalOutlets / 850)),
    }
  })
}

export function generateTaluks(districts: District[]): Taluk[] {
  const taluks: Taluk[] = []
  districts.forEach((district) => {
    const base = DISTRICT_BASE.find((d) => d.id === district.id)!
    const rng = seededRandom(`${district.id}-taluks`)
    const weights = base.taluks.map(() => randRange(rng, 0.6, 1.6))
    const weightSum = weights.reduce((a, b) => a + b, 0)

    base.taluks.forEach((name, idx) => {
      const share = weights[idx] / weightSum
      const totalOutlets = Math.max(120, Math.round(district.totalOutlets * share))
      const coveragePercent = Math.max(35, Math.min(98, district.coveragePercent + randRange(rng, -14, 14)))
      const estimatedTotal = Math.round(totalOutlets / (coveragePercent / 100))
      const urbanShare = Math.max(4, Math.min(96, district.urbanPercent + randRange(rng, -12, 12)))
      taluks.push({
        id: `${district.id}-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        districtId: district.id,
        totalOutlets,
        urbanOutlets: Math.round((totalOutlets * urbanShare) / 100),
        ruralOutlets: totalOutlets - Math.round((totalOutlets * urbanShare) / 100),
        coveragePercent: +coveragePercent.toFixed(1),
        surveyed: totalOutlets,
        estimatedTotal,
      })
    })
  })
  return taluks
}

export function generateCategories(districts: District[]): Category[] {
  return CATEGORY_BASE.map((base) => {
    const rng = seededRandom(base.id)
    const avgAvailability = districts.reduce((sum) => {
      const noise = randRange(rng, -6, 6)
      return sum + Math.max(4, Math.min(98, base.baseAvailability + noise))
    }, 0) / districts.length

    return {
      id: base.id,
      name: base.name,
      group: base.group,
      availabilityPercent: +avgAvailability.toFixed(1),
      avgOutletsStockingPercent: +Math.max(4, Math.min(98, base.baseAvailability + randRange(rng, -3, 3))).toFixed(1),
      whiteSpaceScore: +Math.max(0, 100 - avgAvailability).toFixed(1),
    }
  })
}

export function generateOutletTypeShare(districts: District[]): OutletTypeShare[] {
  const totals: Record<OutletSize, number> = { 'Kirana / Small': 0, Medium: 0, Large: 0, Others: 0 }
  let grandTotal = 0
  districts.forEach((d) => {
    (Object.keys(totals) as OutletSize[]).forEach((key) => {
      const value = (d.outletTypeMix[key] / 100) * d.totalOutlets
      totals[key] += value
      grandTotal += value
    })
  })
  return (Object.keys(totals) as OutletSize[]).map((type) => ({
    type,
    value: +((totals[type] / grandTotal) * 100).toFixed(1),
    color: OUTLET_TYPE_COLORS[type],
  }))
}

export function generateCoverageTrend(finalCoverage: number): CoverageTrendPoint[] {
  const months = ['Apr 25', 'May 25', 'Jun 25', 'Jul 25', 'Aug 25', 'Sep 25', 'Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26']
  const rng = seededRandom('coverage-trend')
  return months.map((month, i) => {
    const t = (i + 1) / months.length
    const planned = Math.round(Math.min(100, t * 105))
    const actual = Math.round(Math.min(finalCoverage, planned - randRange(rng, 2, 9) * (1 - t * 0.4)))
    return { month, planned: Math.min(planned, 100), actual: Math.max(actual, 0) }
  })
}

export function pickTopDistrictsBy<K extends keyof District>(districts: District[], key: K, count = 5): District[] {
  return [...districts].sort((a, b) => (b[key] as number) - (a[key] as number)).slice(0, count)
}

export function generateSparkline(seedKey: string, finalValue: number, points = 8): number[] {
  const rng = seededRandom(seedKey)
  const values: number[] = []
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1)
    const target = finalValue * (0.72 + t * 0.28)
    const noise = randRange(rng, -6, 6) * (1 - t * 0.6)
    values.push(Math.max(2, target + noise))
  }
  values[values.length - 1] = finalValue
  return values
}
