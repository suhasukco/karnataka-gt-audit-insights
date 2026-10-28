import React, { useMemo } from "react";
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
  type TooltipItem,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { CATEGORICAL_ORDER } from "@/lib/palette";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export interface BarChartProps {
  title?: string;
  data: Array<Record<string, any>>;
  labelKey: string;
  valueKey: string;
  tooltipKeys: string[];
  horizontal?: boolean;
  colors?: string[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  headerActions?: React.ReactNode;
}


function wrapLabel(label: string, maxLineLength = 15): string | string[] {
  const clean = label.trim();
  if (clean.length <= maxLineLength) return clean;

  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const w of words) {
    const next = current ? current + " " + w : w;
    if (next.length > maxLineLength) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);

  return lines;
}

function formatTooltipValueIN(raw: any): string {
  if (raw === null || raw === undefined || raw === "") return "—";

  const str = String(raw).trim();

  if (str.includes("%")) return str;

  const normalized = str.replace(/,/g, "");
  const n = Number(normalized);

  if (!Number.isFinite(n)) return str;

  const hasDecimals = normalized.includes(".");

  return n.toLocaleString("en-IN", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  });
}


function toNumberSafe(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

const humanize = (s?: string) =>
  (s ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

export const HorizontalBarChart: React.FC<BarChartProps> = ({
  title,
  data,
  labelKey,
  valueKey,
  tooltipKeys,
  headerActions,
  horizontal = true,
  colors,
  xAxisLabel,
  yAxisLabel,
}) => {
  const effectiveColors = colors && colors.length ? colors : CATEGORICAL_ORDER;

  const sortedData = useMemo(() => {
    const arr = Array.isArray(data) ? [...data] : [];
    arr.sort((a, b) => toNumberSafe(b?.[valueKey]) - toNumberSafe(a?.[valueKey]));
    return arr;
  }, [data, valueKey]);

  const rawLabels = sortedData?.map((d) => String(d[labelKey] ?? "Unspecified"));
  const displayLabels = rawLabels?.map((lbl) => wrapLabel(lbl, 14));

  const values = sortedData?.map((d) => toNumberSafe(d?.[valueKey]));

  const chartData: ChartData<"bar"> = {
    labels: displayLabels,
    datasets: [
      {
        label: humanize(valueKey),
        data: values,
        backgroundColor: effectiveColors,
        borderWidth: 0,
      },
    ],
  };

  const chartOptions: ChartOptions<"bar"> = {
    indexAxis: horizontal ? "y" : "x",
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => {
            const idx = items[0].dataIndex;
            return rawLabels?.[idx] ?? "";
          },
          label: (context: TooltipItem<"bar">) => {
            const idx = context.dataIndex;
            const item = sortedData[idx];

            return tooltipKeys?.map((key) => {
              const label = humanize(key) + ":";
              const val = formatTooltipValueIN(item?.[key]);
              return `${label} ${val}`;
            });
          },
        },
      },
    },
    scales: {
      // numeric axis
      x: horizontal
        ? {
            type: "linear",
            position: "top",
            ticks: {
              callback: (value) => {
                const n = Number(value);
                if (isNaN(n)) return value as any;
                if (Math.abs(n) >= 100000) {
                  const lakhs = n / 100000;
                  return `${lakhs.toLocaleString(undefined, {
                    maximumFractionDigits: 1,
                  })}L`;
                }
                return n.toLocaleString();
              },
            },
            grid: { display: false },
            title: xAxisLabel
              ? {
                  display: true,
                  text: xAxisLabel,
                }
              : undefined,
          }
        : {
            type: "category",
            labels: displayLabels as any,
            ticks: {
              autoSkip: false,
            },
            title: yAxisLabel
              ? {
                  display: true,
                  text: yAxisLabel,
                }
              : undefined,
          },

      // category axis
      y: horizontal
        ? {
            type: "category",
            labels: displayLabels as any,
            ticks: {
              autoSkip: false,
            },
            grid: { display: false },
            title: yAxisLabel
              ? {
                  display: true,
                  text: yAxisLabel,
                }
              : undefined,
          }
        : {
            type: "linear",
            ticks: {
              callback: (v) => {
                const n = Number(v);
                return isNaN(n) ? (v as any) : n.toLocaleString();
              },
            },
            title: xAxisLabel
              ? {
                  display: true,
                  text: xAxisLabel,
                }
              : undefined,
          },
    },
  };

  // The old sizing guaranteed a scrollbar on every chart: content was floored
  // at 400px inside a 288px (`max-h-72`) window, so even a five-bar chart
  // scrolled — and the x-axis, which Chart.js draws at the bottom of the
  // canvas, scrolled out of sight with it. Now the canvas is sized to its own
  // data, and only a chart that genuinely has more bars than fit gets a
  // scroll window — snapped to a whole number of bars, so a bar is never
  // sliced in half at the boundary.
  const AXIS_SPACE = 52; // x-axis ticks + title, drawn below the bar stack
  const barCount = rawLabels?.length ?? 0;

  // A vertical scroll window nested inside the page's own vertical scroll is
  // the thing to avoid: the wheel lands on whichever of the two the pointer
  // happens to be over, and on a phone it is a coin toss. So instead of
  // clipping a long set, thin the bars until the whole set fits one plot —
  // 40px per bar when there is room, down to 22px when there is not. A 13-bar
  // set lands at 39px, a 22-bar set at 23px, and both render complete with no
  // inner scrollbar. The window below is kept only as a floor for a set so
  // long that even 22px cannot fit it.
  const IDEAL_BAR_H = 40;
  const MIN_BAR_H = 22;
  const MAX_PLOT_H = 560;
  const perBarHeight =
    barCount > 0
      ? Math.max(MIN_BAR_H, Math.min(IDEAL_BAR_H, Math.floor((MAX_PLOT_H - AXIS_SPACE) / barCount)))
      : IDEAL_BAR_H;
  const chartHeight = Math.max(barCount, 3) * perBarHeight + AXIS_SPACE;
  // The cap is the plot ceiling, not a bar count. Keying it to a bar count was
  // what kept the window (and its nested scrollbar) even after the bars had
  // been thinned to fit: 13 bars fitted in 559px but a 9-bar window is 403px,
  // so it still clipped.
  const viewportHeight = Math.min(chartHeight, MAX_PLOT_H);
  const scrolls = chartHeight > viewportHeight;

  return (
    <div>
      {(title || headerActions) && (
        <div className="mb-0 w-full flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          {title && (
            <h3
              className="
                max-w-full
                text-base font-semibold text-gray-900 leading-tight
                whitespace-normal break-words
                sm:max-w-none
                sm:text-lg sm:leading-normal
              "
              title={typeof title === "string" ? title : undefined}
            >
              {title}
            </h3>
          )}

          {headerActions && (
            <div className="w-full sm:w-auto">
              <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
                {headerActions}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="relative">
        <div
          className={[
            scrolls ? "overflow-y-scroll" : "overflow-y-visible",
            "overflow-x-hidden scroll-smooth",
            "pr-1",
            "[&::-webkit-scrollbar]:w-1.5",
            "[&::-webkit-scrollbar-track]:bg-transparent",
            "[&::-webkit-scrollbar-thumb]:bg-slate-300",
            "[&::-webkit-scrollbar-thumb]:rounded-full",
            "[&::-webkit-scrollbar-thumb]:hover:bg-slate-400",
            "scrollbar-thin",
          ].join(" ")}
          style={{ maxHeight: viewportHeight }}
        >
          <div style={{ height: chartHeight, minHeight: chartHeight }}>
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* A clipped chart gave no sign it was clipped. The fade says "more
            below" without competing with the bars. Chart.js lays out its own
            axis area, so the cut never lands exactly on a bar boundary — the
            fade is what keeps a half-bar from reading as a rendering fault. */}
        {scrolls && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-white via-white/80 to-transparent"
          />
        )}
      </div>

      {/* Sits below the scroll window, not over it — as an overlay it landed on
          top of the very bar it was describing. */}
      {scrolls && (
        <p className="mt-2 text-right text-[12px] font-medium text-slate-500">
          Showing {Math.floor((viewportHeight - AXIS_SPACE) / perBarHeight)} of {barCount} — scroll inside the chart for the rest
        </p>
      )}
    </div>
  );
};

function areEqual(prev: BarChartProps, next: BarChartProps) {
  return (
    prev.title === next.title &&
    prev.data === next.data && // relies on immutable updates
    prev.labelKey === next.labelKey &&
    prev.valueKey === next.valueKey &&
    prev.tooltipKeys === next.tooltipKeys && // relies on immutable updates
    prev.horizontal === next.horizontal &&
    prev.colors === next.colors && // relies on immutable updates (if used)
    prev.xAxisLabel === next.xAxisLabel &&
    prev.yAxisLabel === next.yAxisLabel &&
    prev.headerActions === next.headerActions
  );
}

export default React.memo(HorizontalBarChart, areEqual);
