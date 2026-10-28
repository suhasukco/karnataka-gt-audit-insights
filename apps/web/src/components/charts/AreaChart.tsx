
import React from "react";
import ReactApexChart from "react-apexcharts";
import { BrandThemeContext,} from "../../../src/providers/components/BrandTheme";

export interface AreaChartProps {
  title?: string;
  data: Array<Record<string, any>>;
  xKey: string;
  yKeys: string[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  tooltipKeys?: string[];
  smooth?: boolean;
  colors?: string[];
  stacked?: boolean;
  headerActions?: React.ReactNode;
  showTitleInCanvas?: boolean;
}

interface AreaChartState {
  chartOptions: ApexCharts.ApexOptions;
  chartData: { name: string; data: number[] }[];
}

/* ---------- helpers ---------- */

function toNumber(v: any): number {
  if (v == null || v === "") return 0;
  const cleaned = String(v).replace(/[^0-9.\-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function isPercentString(v: any): boolean {
  return typeof v === "string" && v.includes("%");
}

function hadDecimals(v: any): boolean {
  if (typeof v === "number") return !Number.isInteger(v);
  if (v == null) return false;
  return /\d\.\d/.test(String(v).replace(/,/g, ""));
}

function containsCurrency(v: any): boolean {
  if (v == null) return false;
  return /₹|rs\.?|inr/i.test(String(v));
}

function fmtIndian(num: number, decimals = 2): string {
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatAxisIndianShort(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? "");

  const abs = Math.abs(n);

  if (abs >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`; // >= 1 crore
  if (abs >= 1e5) return `${(n / 1e5).toFixed(2)} L`; // >= 1 lakh

  return n.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

const humanize = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

/* -------------------- Component -------------------- */

class AreaChart extends React.PureComponent<AreaChartProps, AreaChartState> {
  static contextType = BrandThemeContext;
  declare context: React.ContextType<typeof BrandThemeContext>;

  constructor(props: AreaChartProps) {
    super(props);
    this.state = {
      chartOptions: {},
      chartData: [],
    };
  }

  componentDidMount() {
    this.generateChartData();
  }

  componentDidUpdate(prevProps: AreaChartProps) {
    if (
      prevProps.data !== this.props.data ||
      prevProps.yKeys !== this.props.yKeys ||
      prevProps.colors !== this.props.colors ||
      prevProps.smooth !== this.props.smooth ||
      prevProps.tooltipKeys !== this.props.tooltipKeys ||
      prevProps.xAxisLabel !== this.props.xAxisLabel ||
      prevProps.yAxisLabel !== this.props.yAxisLabel ||
      prevProps.xKey !== this.props.xKey ||
      prevProps.stacked !== this.props.stacked
    ) {
      this.generateChartData();
    }
  }

  generateChartData() {
    const {
      data = [],
      xKey,
      yKeys = [],
      xAxisLabel,
      yAxisLabel,
      smooth = true,
      tooltipKeys = [],
      stacked = false,
    } = this.props;

    const theme = this.context;

    const fallbackPalette =
      theme && Array.isArray(theme.chartPalette) ? theme.chartPalette : [];

    const brandPrimary = theme?.primary || fallbackPalette[0] || "#4F46E5";
    const red = "#1378C2"; 

    const effectiveColors =
      this.props.colors && this.props.colors.length
        ? this.props.colors
        : [
            brandPrimary,
            red,
            ...fallbackPalette.filter((c) => c !== brandPrimary && c !== red),
          ];

    const rawData = Array.isArray(data) ? data.filter(Boolean) : [];
    const SLATE_900 = "#0f172a";

    const categories = rawData.map((d) => String(d?.[xKey] ?? ""));

    const series = yKeys.map((key) => ({
      name: humanize(key),
      data: rawData.map((row) => {
        const val = toNumber(row?.[key]);
        return Number.isFinite(val) ? val : 0;
      }),
    }));

    const validatedSeries = series.map((s) => ({
      ...s,
      data: s.data.map((v) => (Number.isFinite(v) ? v : 0)),
    }));

    const chartOptions: ApexCharts.ApexOptions = {
      chart: {
        id: `${xKey}-${yKeys.join("-")}`,
        animations: {
          enabled: false,
        },
        type: "area",
        stacked,
        fontFamily: "inherit",
        toolbar: { show: false },
        zoom: { enabled: false },
        offsetX: 8,
      },

      stroke: {
        curve: smooth ? "smooth" : "straight",
        width: 2,
      },
      fill: {
        opacity: 0.3,
      },
      colors: effectiveColors,

      xaxis: {
        type: "category",
        categories,
        labels: { rotate: -45 },
        offsetY: -10,

        title: {
          text: xAxisLabel,
          offsetX: -250,
          offsetY: 0,
          style: {
            fontSize: "12px",
            fontWeight: 600,
            color: "#0f172a",
          },
        },
      },

      yaxis: {
        title: { text: yAxisLabel },
        labels: {
          formatter: (val: number) => formatAxisIndianShort(val),
        },
      },

      dataLabels: {
        enabled: true,
        offsetY: -6,
        background: { enabled: false },
        style: {
          fontSize: "11px",
          fontWeight: 600,
          colors: ["#0f172a"],
        },
        formatter: (val: number) => {
          if (!Number.isFinite(val)) return "";
          return formatAxisIndianShort(val);
        },
      },

      tooltip: {
        theme: "light",
        shared: true,
        intersect: false,
        custom: ({ dataPointIndex }) => {
          const item = rawData[dataPointIndex];
          if (!item) return "";
          const head = item?.[xKey] ?? "";
          const rows = (tooltipKeys ?? []).map((k) => {
            const raw = item?.[k];
            const num = toNumber(raw);
            let display: string;

            if (isPercentString(raw)) {
              display = String(raw).trim();
            } else if (!Number.isFinite(num)) {
              display = raw == null ? "—" : String(raw);
            } else if (containsCurrency(raw)) {
              display = `₹${fmtIndian(num, 2)}`;
            } else if (hadDecimals(raw)) {
              display = fmtIndian(num, 2);
            } else {
              display = num.toLocaleString("en-IN");
            }

            return `
              <div style="display:flex; justify-content:space-between; gap:12px; margin:2px 0;">
                <span style="font-weight:600;color:${SLATE_900}">${humanize(
              k
            )}:</span>
                <span style="color:${SLATE_900}">${display}</span>
              </div>`;
          });

          return `
            <div style="padding:8px; font-family:inherit; color:${SLATE_900}">
              <div style="font-weight:bold; margin-bottom:6px; color:${SLATE_900}">${head}</div>
              ${rows.join("")}
            </div>`;
        },
      },

      legend: {
        show: false,
        position: "top",
        horizontalAlign: "left",
        markers: {  size:10},
        itemMargin: { horizontal: 10, vertical: 4 },
      },

      grid: {
        strokeDashArray: 3,
        padding: {
          left: 28,
          right: 8,
          top: 8,
          bottom: 0,
        },
      },
    };

    this.setState({ chartOptions, chartData: validatedSeries });
  }

  render() {
    const { chartOptions, chartData } = this.state;
    const {
      title,
      headerActions,
      showTitleInCanvas = false,
      data = [],
      xKey,
    } = this.props;

    const hasSeries = Array.isArray(chartData) && chartData.length > 0;

    const rawData = Array.isArray(data) ? data.filter(Boolean) : [];
    const categories = rawData.map((d) => String(d?.[xKey] ?? ""));

    const chartHeight = 250;

    return (
      <div>
        {(title || headerActions) && !showTitleInCanvas && (
          <div className="mb-0 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <h3
              className="
                max-w-full
                text-base font-semibold text-gray-900 leading-tight
                whitespace-normal break-words
                sm:max-w-none
                sm:text-lg sm:leading-normal
                sm:whitespace-normal
              "
              title={typeof title === "string" ? title : undefined}
            >
              {title}
            </h3>

            {headerActions && (
              <div className="w-full sm:w-auto">
                <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
                  {headerActions}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-0 flex flex-wrap items-center gap-x-4 gap-y-2">
          {chartData.map((s, i) => (
            <div
              key={s.name}
              className="flex items-center gap-2 text-xs text-slate-700"
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: chartOptions?.colors?.[i] as string }}
              />
              <span className="font-medium">{s.name}</span>
            </div>
          ))}
        </div>

        {hasSeries ? (
          <div className="w-full">
            <div className="relative" style={{ height: chartHeight }}>
              <div
                className={[
                  "h-full overflow-x-scroll overflow-y-hidden scroll-smooth",
                  "pb-1 mt-2",
                  "[&::-webkit-scrollbar]:h-1.5",
                  "[&::-webkit-scrollbar-track]:bg-transparent",
                  "[&::-webkit-scrollbar-thumb]:bg-slate-300",
                  "[&::-webkit-scrollbar-thumb]:rounded-full",
                  "[&::-webkit-scrollbar-thumb]:hover:bg-slate-400",
                  "scrollbar-thin",
                  "[&::-webkit-scrollbar]:w-0",
                ].join(" ")}
              >
                <div
                  style={{
                    height: "100%",
                    minWidth: `${Math.max(
                      (categories?.length || 0) * 90,
                      700
                    )}px`,
                  }}
                >
                  <ReactApexChart
                    options={chartOptions}
                    series={chartData}
                    type="area"
                    height={chartHeight}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No data available</p>
        )}
      </div>
    );
  }
}

export default AreaChart;
