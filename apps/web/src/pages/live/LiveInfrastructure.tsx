import { motion } from "framer-motion";
import { CreditCard, Refrigerator, Smartphone, Snowflake } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageLoader } from "@/components/shared/PageLoader";
import {
  LiveErrorState,
  slugifyDistrict,
} from "@/components/shared/LiveDataState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SegmentToggle, useSegment } from "@/components/shared/SegmentToggle";
import { KpiCard } from "@/components/charts/KpiCard";
import { KarnatakaMap } from "@/components/charts/KarnatakaMap";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";
import { useLiveQuery } from "@/lib/useLiveQuery";
import * as api from "@/lib/liveApi";
import { formatNumber, formatPercent } from "@/lib/utils";
import { fadeUpInView, fadeUpInViewDelay } from "@/lib/motion";

const INFRA_LABELS: Record<string, string> = {
  fridge_flag: "Refrigerator",
  cooler_flag: "Cooler",
  deep_freezer_flag: "Deep Freezer",
  display_rack_flag: "Display Rack",
  chips_stand_flag: "Chips Stand",
  hanger_flag: "Hanger",
  cash_counter_display_flag: "Cash Counter Display",
  poster_dangler_flag: "Poster/Dangler",
  promoter_flag: "Promoter Present",
  sampling_area_flag: "Sampling Area",
  ac_flag: "Air Conditioning",
  name_board_flag: "Name Board",
  cadbury_display_flag: "Branded Display Unit",
};
const DIGITAL_LABELS: Record<string, string> = {
  billing_software_flag: "Billing Software",
  digital_payment_flag: "Digital Payment",
  card_accepted_flag: "Card Accepted",
  gift_coupon_sodexo_flag: "Gift Coupon/Sodexo",
  door_delivery_flag: "Door Delivery",
  online_sales_flag: "Online Sales",
  company_tieup_flag: "Company Tie-up",
  b2b_purchase_flag: "B2B Purchase",
};

export default function LiveInfrastructure() {
  const [segment, setSegment] = useSegment();
  // `[segment]` is the refetch key — without it useLiveQuery would keep the
  // first segment's response when the toggle changes.
  const summary = useLiveQuery(() => api.getInfrastructureSummary(segment), [segment]);
  const byDistrict = useLiveQuery(() => api.getInfrastructureByDistrict(segment), [segment]);
  const byOutletType = useLiveQuery(() => api.getInfrastructureByOutletType(segment), [segment]);
  const salesCorrelation = useLiveQuery(() => api.getSalesCorrelation(segment), [segment]);

  if (summary.loading || byDistrict.loading) return <PageLoader />;
  if (summary.error) return <LiveErrorState message={summary.error} onRetry={summary.refetch} />;
  if (!summary.data || !byDistrict.data) return null;

  const mapDistricts = byDistrict.data.map((d) => ({
    id: slugifyDistrict(String(d.district)),
    name: String(d.district),
    totalOutlets: 1,
  }));
  const scoreByDistrict = new Map(
    byDistrict.data.map((d) => [
      slugifyDistrict(String(d.district)),
      Number(d.composite_score),
    ]),
  );

  const infraBars = Object.entries(summary.data.infrastructure).map(
    ([key, value]) => ({
      label: INFRA_LABELS[key] ?? key,
      value: Number(value),
      adoption: `${Number(value)}%`,
    }),
  );
  const digitalBars = Object.entries(summary.data.digital).map(
    ([key, value]) => ({
      label: DIGITAL_LABELS[key] ?? key,
      value: Number(value),
      adoption: `${Number(value)}%`,
    }),
  );

  const topCorrelations = (salesCorrelation.data ?? [])
    .filter((c) => c.avg_sales_with != null && c.avg_sales_without != null)
    .map((c) => ({
      ...c,
      label: INFRA_LABELS[c.flag] ?? DIGITAL_LABELS[c.flag] ?? c.flag,
      lift: Number(c.avg_sales_with) - Number(c.avg_sales_without),
    }))
    .sort((a, b) => b.lift - a.lift)
    .slice(0, 8);

  return (
    <div className="space-y-8">
      <PageHeader
        // eyebrow="Live Data · Real Census"
        title="Infrastructure & Digital Readiness"
        // description="Real fixture and digital-commerce penetration across the surveyed outlet base."
        actions={<SegmentToggle value={segment} onChange={setSegment} />}
      />

      <motion.section
        {...fadeUpInView}
        className="grid grid-cols-2 gap-5 lg:grid-cols-4"
      >
        <KpiCard
          label="Have Refrigerator"
          value={formatPercent(summary.data.infrastructure.fridge_flag)}
          icon={Refrigerator}
          tone="blue"
        />
        <KpiCard
          label="Have Cooler"
          value={formatPercent(summary.data.infrastructure.cooler_flag)}
          icon={Snowflake}
          tone="indigo"
        />
        <KpiCard
          label="Accept Digital Payment"
          value={formatPercent(summary.data.digital.digital_payment_flag)}
          icon={CreditCard}
          tone="emerald"
        />
        <KpiCard
          label="Use Billing Software"
          value={formatPercent(summary.data.digital.billing_software_flag)}
          icon={Smartphone}
          tone="amber"
        />
      </motion.section>

      <motion.section
        {...fadeUpInViewDelay(1)}
        className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
      >
        <Card className="transition-shadow duration-300 hover:shadow-card-hover">
          <CardHeader>
            <CardTitle>Infrastructure Adoption</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart
              data={infraBars}
              labelKey="label"
              valueKey="value"
              tooltipKeys={['adoption']}
              xAxisLabel="% of outlets"
              colors={['#7C3AED']}
            />
          </CardContent>
        </Card>

        <Card className="transition-shadow duration-300 hover:shadow-card-hover">
          <CardHeader>
            <CardTitle>Digital Commerce Adoption</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart
              data={digitalBars}
              labelKey="label"
              valueKey="value"
              tooltipKeys={['adoption']}
              xAxisLabel="% of outlets"
              colors={['#2563EB']}
            />
          </CardContent>
        </Card>
        {/* <Card className="transition-shadow duration-300 hover:shadow-card-hover">
          <CardHeader>
            <div>
              <CardTitle>Composite Infra Score by District</CardTitle>
              <CardDescription>Mean of 21 real infra + digital flags.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <KarnatakaMap
              districts={mapDistricts}
              metric={(d) => scoreByDistrict.get(d.id) ?? 0}
              formatValue={(d) => `${(scoreByDistrict.get(d.id) ?? 0).toFixed(1)} / 100`}
              legendLabel="Infra Score"
              legendFormat={(v) => v.toFixed(0)}
              navigable={false}
              height={380}
            />
          </CardContent>
        </Card> */}
      </motion.section>

      {/* An empty animated <section> used to sit here. It rendered at height 0,
          but `space-y-8` still put a gap either side of it, so the run from the
          chart row to the table measured 64px against the 32px used everywhere
          else. The cards it once held are kept below for reference only. */}
        {/* <Card className="transition-shadow duration-300 hover:shadow-card-hover">
          <CardHeader>
            <CardTitle>Digital Commerce Adoption</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={digitalBars} color="#2563EB" />
          </CardContent>
        </Card> */}
        {/* <Card className="transition-shadow duration-300 hover:shadow-card-hover">
          <CardHeader>
            <div>
              <CardTitle>What Actually Correlates with Higher Sales</CardTitle>
              <CardDescription>Avg. monthly sales lift for outlets WITH each flag vs. without.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {topCorrelations.map((c) => (
              <div key={c.flag} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <span className="text-slate-600">{c.label}</span>
                <span className={`font-semibold ${c.lift >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {c.lift >= 0 ? '+' : ''}
                  ₹{formatNumber(Math.round(c.lift))}/mo
                </span>
              </div>
            ))}
          </CardContent>
        </Card> */}

      {byOutletType.data && (
        <motion.div {...fadeUpInViewDelay(3)}>
          <Card className="transition-shadow duration-300 hover:shadow-card-hover">
            <CardHeader>
              <div>
                <CardTitle>Infrastructure by Outlet Type</CardTitle>
                <CardDescription> Adoption rates</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-160 text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 text-[13px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="py-2.5 font-semibold">Outlet Type</th>
                    <th className="py-2.5 text-center font-semibold">Outlets</th>
                    <th className="py-2.5 text-center font-semibold">Fridge</th>
                    <th className="py-2.5 text-center font-semibold">Cooler</th>
                    <th className="py-2.5 text-center font-semibold">
                      Deep Freezer
                    </th>
                    <th className="py-2.5 text-center font-semibold">Billing SW</th>
                    <th className="py-2.5 text-center font-semibold">
                      Digital Pay
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {byOutletType.data.slice(0, 12).map((row) => (
                    <tr
                      key={String(row.outlet_type)}
                      className="border-b border-slate-100 transition-colors duration-150 last:border-0 hover:bg-slate-50/60"
                    >
                      <td className="py-2.5 font-semibold text-slate-700">
                        {row.outlet_type}
                      </td>
                      <td className="nums py-2.5 text-center text-slate-500">
                        {formatNumber(Number(row.outlet_count))}
                      </td>
                      <td className="nums py-2.5 text-center text-slate-600">{row.fridge_flag}%</td>
                      <td className="nums py-2.5 text-center text-slate-600">{row.cooler_flag}%</td>
                      <td className="nums py-2.5 text-center text-slate-600">
                        {row.deep_freezer_flag}%
                      </td>
                      <td className="nums py-2.5 text-center text-slate-600">
                        {row.billing_software_flag}%
                      </td>
                      <td className="nums py-2.5 text-center text-slate-600">
                        {row.digital_payment_flag}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
