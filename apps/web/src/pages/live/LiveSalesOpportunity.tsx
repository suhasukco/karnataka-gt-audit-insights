import { motion } from 'framer-motion'
import { IndianRupee, MapPinned, Target, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoader } from '@/components/shared/PageLoader'
import { LiveErrorState, slugifyDistrict } from '@/components/shared/LiveDataState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SegmentToggle, useSegment } from '@/components/shared/SegmentToggle'
import { KpiCard } from '@/components/charts/KpiCard'
import { KarnatakaMap } from '@/components/charts/KarnatakaMap'
import BarChart from '@/components/charts/BarChart'
import DonutChart from '@/components/charts/DonutChart'
import { useLiveQuery } from '@/lib/useLiveQuery'
import * as api from '@/lib/liveApi'
import { cn, formatNumber } from '@/lib/utils'
import { fadeUpInView, fadeUpInViewDelay } from '@/lib/motion'

/** Single series — no categorical separation to preserve, so one hue.
 *  Validated light-surface: all six checks PASS. */
const SALES_BAR = '#3A72E5'

/** The four depth bands are ORDERED (1-5 → 16-22), so this is a sequential
 *  ramp, not a categorical set: light → dark, ending on the brand #0B0445.
 *  It steps hue blue→indigo as well as lightness, because four steps in a
 *  single hue could not clear the ΔE 15 normal-vision floor while every step
 *  also held ≥3:1 against the card surface.
 *  Validated: CVD separation PASS (worst ΔE 12.8), normal-vision PASS (16.6),
 *  contrast PASS (all ≥3:1). The lone remaining validator FAIL is the
 *  categorical "lightness band", which a sequential ramp is meant to exit. */
const DEPTH_RAMP = ['#3E92DE', '#5B4BE8', '#3A2596', '#0B0445']

export default function LiveSalesOpportunity() {
  const [segment, setSegment] = useSegment()
  // `[segment]` is the refetch key — without it useLiveQuery would keep the
  // first segment's response when the toggle changes.
  const salesSummary = useLiveQuery(() => api.getSalesSummary(segment), [segment])
  const salesByDistrict = useLiveQuery(() => api.getSalesByDistrict(segment), [segment])
  const depthCorrelation = useLiveQuery(() => api.getCategoryDepthCorrelation(segment), [segment])
  const topOutlets = useLiveQuery(() => api.getTopOutlets(10, segment), [segment])
  const opportunity = useLiveQuery(() => api.getOpportunityDistricts(segment), [segment])

  if (salesSummary.loading || opportunity.loading) return <PageLoader />
  if (salesSummary.error) return <LiveErrorState message={salesSummary.error} onRetry={salesSummary.refetch} />
  if (!salesSummary.data || !opportunity.data) return null

  const mapDistricts = opportunity.data.map((d) => ({
    id: slugifyDistrict(d.district),
    name: d.district,
    totalOutlets: d.outlet_count,
  }))
  const scoreById = new Map(opportunity.data.map((d) => [slugifyDistrict(d.district), d.opportunityScore]))
  const highOpportunity = opportunity.data.filter((d) => d.opportunityScore >= 70).length

  const topOpportunityDistricts = [...opportunity.data].sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 8)

  return (
    <div className="space-y-8">
      <PageHeader
        // eyebrow="Live Data · Real Census"
        title="Sales & Opportunity Engine"
        description="Sales Monthly Avg figures, and a composite opportunity score built from  infra/category/digital/brand gaps."
        actions={<SegmentToggle value={segment} onChange={setSegment} />}
      />

      <motion.section {...fadeUpInView} className="grid grid-cols-2 gap-5 lg:grid-cols-3">
        <KpiCard label="Total Reported Monthly Sales" value={`₹${formatNumber(Math.round(salesSummary.data.total_monthly_sales / 100000))}L`} icon={IndianRupee} tone="emerald" />
        <KpiCard label="Median Monthly Sales / Outlet" value={`₹${formatNumber(salesSummary.data.median)}`} icon={TrendingUp} tone="blue" />
        {/* <KpiCard label="High Opportunity Districts" value={`${highOpportunity} / ${opportunity.data.length}`} icon={Target} tone="purple" /> */}
        <KpiCard label="Outlets Reporting Sales" value={formatNumber(salesSummary.data.outlets_reporting)} icon={MapPinned} tone="amber" />
      </motion.section>

      {/* An empty animated <section> used to sit here. It rendered at height 0,
          but `space-y-8` still put a gap either side of it, so the run from the
          KPI row to the chart row measured 64px against the 32px used
          everywhere else. Its cards are kept below for reference only. */}
        {/* <Card className="transition-shadow duration-300 hover:shadow-card-hover">
          <CardHeader>
            <div>
              <CardTitle> Opportunity Score by District</CardTitle>
              <CardDescription>Composite of  infrastructure gap, category gap, digital gap, brand white-space & density.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <KarnatakaMap
              districts={mapDistricts}
              metric={(d) => scoreById.get(d.id) ?? 0}
              formatValue={(d) => `${(scoreById.get(d.id) ?? 0).toFixed(1)} / 100`}
              legendLabel="Opportunity Score"
              legendFormat={(v) => v.toFixed(0)}
              navigable={false}
            />
          </CardContent>
        </Card> */}

        {/* <Card className="transition-shadow duration-300 hover:shadow-card-hover">
          <CardHeader>
            <CardTitle>Top Districts by Opportunity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {topOpportunityDistricts.map((d, i) => (
              <div key={d.district} className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold',
                    i < 3 ? 'bg-navy-900 text-white shadow-[0_2px_6px_-1px_rgba(7,26,61,0.4)]' : 'bg-slate-100 text-slate-500',
                  )}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-[15px]">
                    <span className="truncate font-medium text-slate-700">{d.district}</span>
                    <span className="font-semibold text-navy-900">{d.opportunityScore.toFixed(1)}</span>
                  </div>
                  <div className="mt-1.5 h-1.75 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${d.opportunityScore}%`, background: 'linear-gradient(90deg, #4F46E599, #4F46E5)' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card> */}

      <motion.section {...fadeUpInViewDelay(2)} className="grid gap-5 lg:grid-cols-2">
        <Card className="transition-shadow duration-300 hover:shadow-card-hover">
          <CardHeader>
            <div>
              <CardTitle>Avg Monthly Sales by District</CardTitle>
              {/* The chart has always shown 12 of 29 districts. Saying so beats
                  a title that implies the whole state is on screen. */}
              <CardDescription>
                Top 6 of 29 districts, by average reported monthly sales (₹K).
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {!salesByDistrict.loading && salesByDistrict.data && (
              /* 6, not 12. BarChart pins x-axis ticks at maxRotation:0, so each
                 district label needs its full horizontal width (~90px for
                 "Bengaluru Rural"). At 12 the axis auto-skipped two thirds of
                 the names and the plot overflowed into a scrollbar; at 8 it
                 still dropped every other one. 6 is what this half-width card
                 can label honestly. */
              <BarChart
                data={salesByDistrict.data.slice(0, 6).map((d) => ({
                  district: d.district,
                  sales: Math.round(d.avg_monthly_sales / 1000),
                }))}
                xKey="district"
                series={[{ dataKey: 'sales', name: 'Avg monthly sales (₹K)' }]}
                tooltipKeys={['sales']}
                colors={[SALES_BAR]}
                height={320}
              />
            )}
          </CardContent>
        </Card>

        <Card className="transition-shadow duration-300 hover:shadow-card-hover">
          <CardHeader>
            <div>
              <CardTitle>Sales vs. Category Depth</CardTitle>
              <CardDescription>
                Share of outlets by assortment depth — hover a band for its
                average monthly sales.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {!depthCorrelation.loading && depthCorrelation.data && (
              /* The ring encodes outlet_count, NOT avg_monthly_sales. A donut
                 is a part-to-whole form, and outlet counts genuinely sum to the
                 1,02,104 outlets reporting sales. Averages do not compose a
                 whole — ringing them would have implied "this band is 29% of
                 sales", which is not what an average means. The sales figure
                 rides in the tooltip instead, so depth↔sales stays readable. */
              <DonutChart
                data={depthCorrelation.data.map((d) => ({
                  band: `${d.category_depth_band} categories`,
                  outlets: d.outlet_count,
                  'avg monthly sales': `₹${Math.round(d.avg_monthly_sales / 1000)}K`,
                }))}
                labelKey="band"
                valueKey="outlets"
                tooltipKeys={['avg monthly sales']}
                palette={DEPTH_RAMP}
                innerRadius={64}
                height={320}
              />
            )}
          </CardContent>
        </Card>
      </motion.section>

      {/* <motion.div {...fadeUpInViewDelay(3)}>
        <Card className="transition-shadow duration-300 hover:shadow-card-hover">
          <CardHeader>
            <div>
              <CardTitle>Top Outlets by Reported Sales</CardTitle>
              <CardDescription>Real Sales Monthly Avg — priority-servicing / key-account candidates.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {!topOutlets.loading && topOutlets.data && (
              <table className="w-full min-w-130 text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-500">
                    <th className="py-2 font-medium">Outlet</th>
                    <th className="py-2 font-medium">District / Taluk</th>
                    <th className="py-2 font-medium">Type</th>
                    <th className="py-2 text-right font-medium">Monthly Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {topOutlets.data.map((o) => (
                    <tr key={o.outlet_id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5 font-semibold text-slate-700">{o.outlet_name}</td>
                      <td className="py-2.5 text-slate-500">
                        {o.district} · {o.taluk}
                      </td>
                      <td className="py-2.5 text-slate-500">{o.outlet_type}</td>
                      <td className="py-2.5 text-right font-semibold text-emerald-700">₹{formatNumber(o.sales_monthly_avg)}</td>
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
