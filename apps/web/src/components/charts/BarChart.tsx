import React, { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
  type ChartData,
  type Plugin,
} from "chart.js";
import { CATEGORICAL_ORDER } from "@/lib/palette";

const BarValueLabels: Plugin<"bar"> = {
  id: "bar-value-labels",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const indexAxis = (chart.options as any).indexAxis || "x";

    ctx.save();
    ctx.font =
      "12px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
    ctx.fillStyle = "#111827";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    chart.getSortedVisibleDatasetMetas().forEach((meta) => {
      if (meta.type !== "bar") return;
      const ds = chart.data.datasets[meta.index] as any;

      meta.data.forEach((bar: any, i: number) => {
        const raw = ds.data?.[i];
        if (raw == null) return;

        const label = axisTickFormatter(
          typeof raw === "number" ? raw : Number(raw)
        );

        if (indexAxis === "y") {
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(label, bar.x + 6, bar.y);
        } else {
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          const zeroY = chart.scales.y.getPixelForValue(0);
          const y = Math.min(bar.y, zeroY) - 6;
          ctx.fillText(label, bar.x, y);
        }
      });
    });

    ctx.restore();
  },
};

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export type SeriesDef = {
  dataKey: string;
  name?: string;
};

export type BarChartProps = {
  title?: string;
  data: Record<string, any>[];
  xKey: string;
  series: SeriesDef[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  tooltipKeys?: string[];
  horizontal?: boolean; // default false
  height?: number; // default 250
  colors?: string[]; // custom dataset colors
  headerActions?: React.ReactNode;
  valueLabelMaxBars?: number;
  /** If true, Chart.js draws the title inside the canvas; else we use DOM header */
  showTitleInCanvas?: boolean; // default false
};

function humanize(str: string) {
  return String(str)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function toNumber(value: any): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return value;
  const s = String(value).replace(/,/g, "").replace(/%/g, "").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function isPercentString(v: any) {
  return typeof v === "string" && v.includes("%");
}

function isLikelyCurrencyKey(key: string) {
  const k = key.toLowerCase();
  return (
    k.includes("revenue") ||
    k.includes("amount") ||
    k.includes("value") ||
    k.includes("price")
  );
}

function isLikelyIntegerKey(key: string) {
  const k = key.toLowerCase();
  return (
    k.includes("bill") ||
    k.includes("quantity") ||
    k.includes("qty") ||
    k.includes("count") ||
    k.includes("no") ||
    k.includes("number")
  );
}

function formatIndian(n: number, decimals = 2) {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatIndianInt(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function axisTickFormatter(n: number) {
  if (n >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(2)} L`;
   if (n >= 1e3) return `${(n / 1e3).toFixed(2)} k`;
  return `${n}`;
}

// --- external tooltip to mimic Apex-like custom layout ---
function makeExternalTooltip({
  data,
  categories,
  tooltipKeys,
}: {
  data: Record<string, any>[];
  categories: string[];
  tooltipKeys: string[];
}) {
  return (ctx: any) => {
    const { chart, tooltip } = ctx;

    // Create or reuse a single global tooltip per chartId on <body>
    let el = document.body.querySelector(
      `#chartjs-ext-tooltip-${chart.id}`
    ) as HTMLDivElement | null;

    if (!el) {
      el = document.createElement("div");
      el.id = `chartjs-ext-tooltip-${chart.id}`;
      el.style.position = "fixed"; // key: viewport coords
      el.style.pointerEvents = "none";
      el.style.background = "#fff";
      el.style.borderRadius = "10px";
      el.style.color = "rgba(15, 23, 42, 0.95)";
      el.style.padding = "12px";
      el.style.minWidth = "220px";
      el.style.boxShadow = "0 6px 24px rgba(0,0,0,.18)";
      el.style.transform = "translate(-50%, -120%)";
      el.style.transition = "opacity .08s ease";
      el.style.zIndex = "10000"; // above your z-40 sticky
      document.body.appendChild(el);
    }

    if (tooltip.opacity === 0) {
      el.style.opacity = "0";
      return;
    }

    const dp = tooltip.dataPoints?.[0];
    const idx = dp?.dataIndex ?? 0;
    const item = data[idx] ?? {};
    const title = categories[idx] ?? "";

    const rows = tooltipKeys.map((key) => {
      const raw = item[key];
      let text: string;

      if (isPercentString(raw)) {
        text = String(raw).trim();
      } else {
        const num = toNumber(raw);
        if (isNaN(num)) {
          text = raw ?? "—";
        } else if (isLikelyCurrencyKey(key)) {
          text = `₹${formatIndian(num, 2)}`;
        } else if (isLikelyIntegerKey(key)) {
          text = formatIndianInt(num);
        } else {
          const hadDecimals =
            typeof raw === "string" && /\d\.\d/.test(raw.replace(/,/g, ""));
          text = hadDecimals ? formatIndian(num, 2) : formatIndianInt(num);
        }
      }

      return `
        <div style="display:flex; justify-content:space-between; gap:12px; margin:2px 0;">
          <span style="font-weight:600;">${humanize(key)}:</span>
          <span>${text}</span>
        </div>
      `;
    });

    el.innerHTML = `
      <div style="font-weight:700; margin-bottom:6px; font-size:14px;">
        ${title}
      </div>
      ${rows.join("")}
    `;

    // viewport-relative coordinates
    const rect = chart.canvas.getBoundingClientRect();
    el.style.opacity = "1";
    el.style.left = rect.left + tooltip.caretX + "px";
    el.style.top = rect.top + tooltip.caretY + "px";
  };
}

const ExternalTooltipCleanup: Plugin<"bar"> = {
  id: "external-tooltip-cleanup",
  beforeDestroy(chart) {
    const el = document.body.querySelector(
      `#chartjs-ext-tooltip-${chart.id}`
    ) as HTMLDivElement | null;
    if (el) el.remove();
  },
};

const BarChart: React.FC<BarChartProps> = ({
  title,
  data,
  xKey,
  series,
  xAxisLabel,
  yAxisLabel,
  tooltipKeys,
  horizontal = false,
  height = 300,
  colors,
  headerActions,
  showTitleInCanvas = false,
}) => {
  const categories = useMemo(() => (data ?? []).map((d) => d?.[xKey]), [data, xKey]);

  const fillColors = colors && colors.length ? colors : CATEGORICAL_ORDER;

  const finalTooltipKeys = useMemo(
    () => (tooltipKeys && tooltipKeys.length ? tooltipKeys : series.map((s) => s.dataKey)),
    [tooltipKeys, series]
  );

  const datasets = useMemo(
    () =>
      series.map((s, i) => ({
        label: s.name ? humanize(s.name) : humanize(s.dataKey),
        data: (data ?? []).map((d) => toNumber(d?.[s.dataKey])), 
        backgroundColor: fillColors[i % fillColors.length],
        borderWidth: 0,
        borderRadius: 10,
        maxBarThickness: 48,
      })),
    [series, data, fillColors]
  );

  const chartData: ChartData<"bar"> = useMemo(
    () => ({
      labels: categories,
      datasets,
    }),
    [categories, datasets]
  );

  const externalTooltip = useMemo(
    () =>
      makeExternalTooltip({
        data,
        categories,
        tooltipKeys: finalTooltipKeys,
      }),
    [data, categories, finalTooltipKeys]
  );

  const options: ChartOptions<"bar"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: horizontal ? "y" : "x",

      plugins: {
        legend: {
          display: false,
          position: "top",
          align: "start",
          labels: {
            usePointStyle: true,
            padding: 20,
            boxWidth: 10,
            boxHeight: 10,
          },
        },

        title: {
          display: !!title && !!showTitleInCanvas,
          text: title || "",
          position: "top",
          align: "start",
          color: "#111827",
          font: { size: 18, weight: 600 },
        },

        tooltip: {
          enabled: false,
          mode: "index",
          intersect: false,
          external: externalTooltip,
        },
      },

      interaction: { intersect: false, mode: "index" },

      scales: {
        x: {
          title: xAxisLabel
            ? {
                display: true,
                text: xAxisLabel,
                color: "#000000",
                font: {
                  size: 12,
                  weight: 600,
                },
              }
            : undefined,
          grid: { display: false },
          // `maxRotation: 0` + `autoSkip` meant Chart.js silently dropped every
          // other district name once the bars narrowed — a labelled bar chart
          // where half the bars have no label. Allowing a tilt lets all of them
          // stay: a rotated label is readable, an absent one is not.
          ticks: { maxRotation: 38, minRotation: 0, autoSkip: false },
        },

        y: {
          beginAtZero: true,
          grace: "20%",
          title: yAxisLabel
            ? {
                display: true,
                text: yAxisLabel,
                color: "#000000",
                font: {
                  size: 12,
                  weight: 600,
                },
              }
            : undefined,
          grid: { color: "rgba(241, 245, 249, 0.8)" },
          ticks: {
            callback: (val) => {
              const n = typeof val === "string" ? Number(val) : (val as number);
              return axisTickFormatter(Number.isFinite(n) ? n : 0);
            },
          },
        },
      },
    }),
    [horizontal, title, showTitleInCanvas, xAxisLabel, yAxisLabel, externalTooltip]
  );

  const plugins = useMemo(() => [BarValueLabels, ExternalTooltipCleanup], []);

  // `min-w-0` matters: the inner track below is a hard 600px floor, and a grid
  // or flex item defaults to `min-width: auto` (its min-content size). Without
  // this the 600px propagates up through the card and forces the whole page to
  // scroll sideways on a phone instead of the chart scrolling inside its own
  // container.
  return (
    <div className="w-full min-w-0">
      {(title || headerActions) && !showTitleInCanvas && (
        <div className="mb-0 w-full flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <h3
            className="
              w-full
              text-base font-semibold text-gray-900 leading-tight
              truncate
              sm:w-auto
              sm:text-lg sm:leading-normal
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

      <div className="relative w-full min-w-0" style={{ height }}>
        <div
          className={[
            "h-full w-full min-w-0 overflow-x-auto overflow-y-hidden scroll-smooth",
            "pb-1",
            "[&::-webkit-scrollbar]:h-1.5",
            "[&::-webkit-scrollbar-track]:bg-transparent",
            "[&::-webkit-scrollbar-thumb]:bg-slate-300",
            "[&::-webkit-scrollbar-thumb]:rounded-full",
            "[&::-webkit-scrollbar-thumb]:hover:bg-slate-400",
            "scrollbar-thin",
          ].join(" ")}
        >
          {/* Was a fixed `max(count * 80, 600)px`, which forced a scrollbar on
              any card narrower than 600 even when the bars would have fitted —
              "Top 6 of 29 districts" rendered five and hid the sixth behind a
              scrollbar nobody looks for. As a *minimum* width the track fills
              the card when the data fits and only scrolls when it truly
              cannot, so a chart is never silently short of a bar. */}
          <div
            style={{
              height: "100%",
              width: horizontal ? "100%" : undefined,
              minWidth: horizontal
                ? undefined
                : `${(categories?.length || 0) * 80}px`,
            }}
          >
            <Bar data={chartData} options={options} plugins={plugins} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(BarChart);
