import { motion } from 'framer-motion'
import { Boxes, Layers3, PackageSearch, Tag } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoader } from '@/components/shared/PageLoader'
import { LiveErrorState } from '@/components/shared/LiveDataState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SegmentToggle, useSegment } from '@/components/shared/SegmentToggle'
import { KpiCard } from '@/components/charts/KpiCard'
import { HorizontalBarChart } from '@/components/charts/HorizontalBarChart'
import BarChart from '@/components/charts/BarChart'
import { HeatmapGrid } from '@/components/charts/HeatmapGrid'
import { useLiveQuery } from '@/lib/useLiveQuery'
import * as api from '@/lib/liveApi'
import { formatNumber, formatPercent } from '@/lib/utils'
import { fadeUpInView, fadeUpInViewDelay } from '@/lib/motion'

const CATEGORY_BASKETS = [
  {
    name: 'Staples',
    categories: ['Atta Flour', 'Rice', 'Dal Pulses', 'Branded Staple', 'Masala Mix', 'Papad'],
    measures: 'Household necessity · Market reach · Distribution depth',
  },
  {
    name: 'Food & Beverage',
    categories: ['Snacks', 'Ready to Cook', 'Beverages', 'Fruit Juice', 'Health Mix', 'Milk Products', 'Dry Fruits', 'Frozen Food', 'Spreads & Sauces'],
    measures: 'Premiumization · Consumption opportunity · Shelf expansion',
  },
  {
    name: 'Home & Personal Care',
    categories: ['Personal Care', 'Home Care', 'OTC Products'],
    measures: 'High margin · Modern retail indicator · Consumer upgrading',
  },
  {
    name: 'Fresh & Others',
    categories: ['Vegetables', 'Egg', 'Pooja Category', 'Stationery'],
    measures: 'Local demand · Daily footfall · Traditional retail behavior',
  },
]

export default function LiveCategoryBrand() {
  const [segment, setSegment] = useSegment()
  // `[segment]` is the refetch key — without it useLiveQuery would keep the
  // first segment's response when the toggle changes.
  const availability = useLiveQuery(() => api.getCategoryAvailability(segment), [segment])
  const whitespace = useLiveQuery(() => api.getCategoryWhitespace(6, segment), [segment])
  const heatmap = useLiveQuery(() => api.getCategoryByDistrict(8, segment), [segment])
  const coOccurrence = useLiveQuery(() => api.getCategoryCoOccurrence(8, segment), [segment])
  const brands = useLiveQuery(() => api.getBrandPenetration(segment), [segment])
  const brandWhitespace = useLiveQuery(() => api.getBrandWhitespace(segment), [segment])

  if (availability.loading || brands.loading) return <PageLoader />
  if (availability.error) return <LiveErrorState message={availability.error} onRetry={availability.refetch} />
  if (!availability.data || !brands.data) return null

  const avgSku = availability.data.reduce((s, c) => s + (c.avg_sku_count ?? 0), 0) / availability.data.length
  const topBrand = brands.data.brands[0]

  const basketAvailability = CATEGORY_BASKETS.map((basket) => {
    const rows = availability.data!.filter((c) => basket.categories.includes(c.category_name))
    const avgPct = rows.length ? rows.reduce((s, r) => s + r.availability_pct, 0) / rows.length : 0
    return {
      label: basket.name,
      value: Math.round(avgPct * 10) / 10,
      availability: `${Math.round(avgPct * 10) / 10}%`,
      categories: `${rows.length} categories`,
      measures: basket.measures,
    }
  })

  return (
    <div className="space-y-8">
      <PageHeader
        // eyebrow="Live Data · Real Census"
        title="Category & Brand Intelligence"
        description="Real category availability, sub-type depth, and distribution penetration for the tracked brand portfolio."
        actions={<SegmentToggle value={segment} onChange={setSegment} />}
      />

      <motion.section {...fadeUpInView} className="grid grid-cols-2 gap-5 lg:grid-cols-3">
        <KpiCard label="Categories Tracked" value="22" icon={Boxes} tone="blue" />
        {/* <KpiCard label="Avg Sub-Types / Category" value={avgSku.toFixed(1)} icon={Layers3} tone="indigo" /> */}
        <KpiCard label={`Top Brand: ${topBrand?.brand_name ?? '—'}`} value={formatPercent(topBrand?.penetration_pct ?? 0)} icon={Tag} tone="purple" />
        <KpiCard label="No Tracked Brand" value={formatPercent(brands.data.noTrackedBrandPct)} icon={PackageSearch} tone="amber" />
      </motion.section>

      <motion.section {...fadeUpInViewDelay(1)} className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="transition-shadow duration-300 hover:shadow-card-hover">
          <CardHeader>
            <div>
              <CardTitle>Category Availability</CardTitle>
              <CardDescription>Share of outlets stocking each category, statewide.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart
              data={availability.data.map((c) => ({ label: c.category_name, value: c.availability_pct, availability: `${c.availability_pct}%` }))}
              labelKey="label"
              valueKey="value"
              tooltipKeys={['availability']}
              xAxisLabel="% of outlets stocking"
              colors={['#2563EB']}
            />
          </CardContent>
        </Card>
        <Card className="transition-shadow duration-300 hover:shadow-card-hover">
          <CardHeader>
            <CardTitle>White Space (Lowest Availability)</CardTitle>
          </CardHeader>
          <CardContent>
            {!whitespace.loading && whitespace.data && (
              <HorizontalBarChart
                data={whitespace.data.map((c) => ({ label: c.category_name, value: c.availability_pct, availability: `${c.availability_pct}%` }))}
                labelKey="label"
                valueKey="value"
                tooltipKeys={['availability']}
              xAxisLabel="% of outlets stocking"
                colors={['#D97706']}
              />
            )}
          </CardContent>
        </Card>
      </motion.section>

      {/* One card, so no column split — `lg:grid-cols-2` left the whole right
          half of the row empty at desktop width. Delay stepped to 2 as well:
          this was the second section running at delay 1, so the two of them
          animated in together instead of in sequence. */}
      <motion.section {...fadeUpInViewDelay(2)} className="grid gap-5">
        <Card className="transition-shadow duration-300 hover:shadow-card-hover">
          <CardHeader>
            <div>
              <CardTitle>Category Basket Availability</CardTitle>
              <CardDescription>All 22 categories rolled up into 4 FMCG baskets, by average availability.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <BarChart
              data={basketAvailability}
              xKey="label"
              series={[{ dataKey: 'value', name: 'Availability %' }]}
              tooltipKeys={['availability']}
              xAxisLabel="% of outlets stocking"
              // Single series, so there is no categorical separation to
              // preserve and the hue is pure identity — it was the last teal
              // bar left on a page that is otherwise blue. Validated
              // light-surface: all six checks PASS.
              colors={['#3A72E5']}
              yAxisLabel="Availability %"
            />
            {/* <div className="mt-5 grid gap-x-8 gap-y-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
              {CATEGORY_BASKETS.map((basket) => (
                <div key={basket.name}>
                  <p className="text-[13.5px] font-semibold text-navy-900">{basket.name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{basket.measures}</p>
                </div>
              ))}
            </div> */}
          </CardContent>
        </Card>
      </motion.section>

      <motion.div {...fadeUpInViewDelay(3)}>
        <Card className="transition-shadow duration-300 hover:shadow-card-hover">
          <CardHeader>
            <div>
              <CardTitle>Availability by District (Top 8)</CardTitle>
              <CardDescription>Real availability % — the 6 largest districts by outlet count.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {!heatmap.loading && heatmap.data && (
              <HeatmapGrid rows={heatmap.data.categories} columns={heatmap.data.districts} values={heatmap.data.matrix} formatValue={(v) => `${v}%`} />
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.section {...fadeUpInViewDelay(4)} className="grid gap-5 lg:grid-cols-2">
        <Card className="transition-shadow duration-300 hover:shadow-card-hover">
          <CardHeader>
            <div>
              <CardTitle>Category Basket Adjacency</CardTitle>
              <CardDescription>Category pairs found together in the same outlet most often.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {!coOccurrence.loading &&
              coOccurrence.data?.map((pair) => (
                <div
                  key={`${pair.category_a}-${pair.category_b}`}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5 text-sm transition-colors duration-150 hover:border-slate-200 hover:bg-slate-50/60"
                >
                  <span className="text-slate-600">
                    {pair.category_a} <span className="text-slate-300">×</span> {pair.category_b}
                  </span>
                  <span className="font-semibold text-navy-900">{formatNumber(pair.outlet_count)}</span>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card className="transition-shadow duration-300 hover:shadow-card-hover">
          <CardHeader>
            <div>
              <CardTitle>Tracked Brand Distribution</CardTitle>
              <CardDescription>Ullas Agarabatti, Indira Foods, Nirantara Oil, Naturo, Gusto, Hangyo Ice Cream.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart
              data={brands.data.brands.map((b) => ({ label: b.brand_name, value: b.penetration_pct, penetration: `${b.penetration_pct}%` }))}
              labelKey="label"
              valueKey="value"
              tooltipKeys={['penetration']}
              xAxisLabel="% of outlets carrying the brand"
              colors={['#7C3AED']}
            />
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-800 ring-1 ring-inset ring-amber-200/60">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              <span>
                <strong className="font-semibold">{formatPercent(brands.data.noTrackedBrandPct)}</strong> of outlets ({formatNumber(brands.data.noTrackedBrandCount)}) stock none of
                these brands — the clearest distribution white-space signal in this dataset.
              </span>
            </p>
          </CardContent>
        </Card>
      </motion.section>

      {/* <motion.div {...fadeUpInViewDelay(4)}>
        <Card className="transition-shadow duration-300 hover:shadow-card-hover">
          <CardHeader>
            <div>
              <CardTitle>Brand White Space by District</CardTitle>
              <CardDescription>Districts with the highest share of outlets carrying none of the tracked brands.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {!brandWhitespace.loading && brandWhitespace.data && (
              <table className="w-full min-w-130 text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-500">
                    <th className="py-2 font-medium">District</th>
                    <th className="py-2 text-center font-medium">Outlets</th>
                    <th className="py-2 text-center font-medium">No Tracked Brand</th>
                    <th className="py-2 text-center font-medium">White Space %</th>
                  </tr>
                </thead>
                <tbody>
                  {brandWhitespace.data.slice(0, 10).map((row) => (
                    <tr key={row.district} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5 font-semibold text-slate-700">{row.district}</td>
                      <td className="py-2.5 text-center text-slate-500">{formatNumber(row.outlet_count)}</td>
                      <td className="py-2.5 text-center text-slate-500">{formatNumber(row.no_tracked_brand_count)}</td>
                      <td className="py-2.5 text-center font-semibold text-amber-700">{formatPercent(row.no_tracked_brand_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </motion.div> */}
    </div>
  )
}
