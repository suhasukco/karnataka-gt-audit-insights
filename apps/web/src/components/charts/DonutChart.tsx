import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { PieChart as RePieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { CATEGORICAL_ORDER } from '@/lib/palette'

/** helper: truncate, don't round */
const toFixedTrunc = (num: number, decimals: number) => {
  const factor = Math.pow(10, decimals)
  return (Math.trunc(num * factor) / factor).toFixed(decimals)
}

const indianFormat = (num: number) => num.toLocaleString('en-IN')

const formatIndianShort = (num: number) => {
  if (!isFinite(num)) return ''
  const abs = Math.abs(num)

  if (abs >= 1e7) return `${toFixedTrunc(num / 1e7, 2)} Cr`
  if (abs >= 1e5) return `${toFixedTrunc(num / 1e5, 2)} Lakh`
  if (abs >= 1e3) return `${toFixedTrunc(num / 1e3, 1)} K`

  return indianFormat(num)
}

const humanizeKey = (key: string) =>
  key
    .replace(/_/g, ' ')
    .replace(/\((.*?)\)/g, '$1')
    .replace(/\w\S*/g, (txt) => txt[0].toUpperCase() + txt.slice(1))

function toNumber(v: unknown): number {
  if (v == null || v === '') return 0
  const cleaned = String(v)
    .replace(/,/g, '')
    .replace(/[^0-9.\-]/g, '')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

function isPercentString(v: unknown): v is string {
  return typeof v === 'string' && v.includes('%')
}

type SliceDatum<T> = {
  name: string
  value: number
  /** percent (0..1) computed from values */
  percent: number
  /** backend percent string if provided */
  backendPct?: string | null
  raw: T
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect
      if (!cr) return
      setSize({ w: cr.width, h: cr.height })
    })

    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return { ref, size }
}

interface DonutChartProps<T extends Record<string, any>> {
  title?: string
  data?: T[]
  labelKey: keyof T
  valueKey: keyof T
  /** backend percentage field, e.g. "(%)total_sales" */
  percentKey?: keyof T
  /** donut hole size, 0..100 (like an Apex donut) — 0 renders a full pie */
  innerRadius?: number
  tooltipKeys?: (keyof T)[]
  headerActions?: React.ReactNode
  /** categorical colors to cycle through — defaults to the app's validated palette */
  palette?: string[]

  /** chart sizing */
  height?: number
  /** legend panel width on desktop */
  legendWidth?: number
  /** hide inside labels below this percent to avoid clutter */
  minLabelPercent?: number
}

const RAD = Math.PI / 180

/** inside-slice label: show backend percent if present, else computed */
function renderLabelInside(props: any, minLabelPercent: number) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, payload } = props

  if (!percent || percent * 100 < minLabelPercent) return null

  const r = (Number(innerRadius) || 0) + (Number(outerRadius) - Number(innerRadius)) * 0.5
  const x = cx + r * Math.cos(-midAngle * RAD)
  const y = cy + r * Math.sin(-midAngle * RAD)

  const text = payload?.backendPct ? String(payload.backendPct) : `${(percent * 100).toFixed(1)}%`

  return (
    <text x={x} y={y} fill="#fff" fontSize={12} textAnchor="middle" dominantBaseline="central" style={{ pointerEvents: 'none' }}>
      {text}
    </text>
  )
}

function DonutChartInner<T extends Record<string, any>>({
  title,
  data = [],
  labelKey,
  valueKey,
  percentKey,
  innerRadius = 64,
  tooltipKeys = [],
  headerActions,
  palette = CATEGORICAL_ORDER,
  height = 260,
  legendWidth = 230,
  minLabelPercent = 3,
}: DonutChartProps<T>) {
  const chartBox = useSize<HTMLDivElement>()

  const outerR = useMemo(() => {
    // available area inside the chart box — radius must fit both width & height
    const w = chartBox.size.w || 0
    const h = height || 0
    const r = Math.floor(Math.min(w, h) / 2) - 14 // 14 ~= margins/padding buffer
    return Math.max(60, Math.min(140, r)) // clamp so it doesn't explode/shrink too much
  }, [chartBox.size.w, height])

  const innerR = innerRadius > 0 ? (outerR * innerRadius) / 100 : 0

  const safeRows = Array.isArray(data) ? data : []

  const processed = useMemo(() => {
    const slices: SliceDatum<T>[] = safeRows
      .map((r) => {
        const name = String(r?.[labelKey] ?? '')
        const value = toNumber(r?.[valueKey])
        const backendPct = percentKey != null ? (r?.[percentKey] ?? null) : null

        return {
          name,
          value: Number.isFinite(value) ? value : 0,
          percent: 0,
          backendPct: backendPct == null || backendPct === '' ? null : String(backendPct),
          raw: r,
        }
      })
      .filter((s) => s.name && s.value > 0)

    const total = slices.reduce((a, s) => a + s.value, 0)
    if (total <= 0) return { slices: [] as SliceDatum<T>[], total: 0 }

    slices.forEach((s) => (s.percent = s.value / total))
    return { slices, total }
  }, [safeRows, labelKey, valueKey, percentKey])

  const colors = useMemo(() => {
    if (!palette.length) return processed.slices.map(() => '#94a3b8')
    return processed.slices.map((_, i) => palette[i % palette.length])
  }, [processed.slices, palette])

  const labelRenderer = useCallback((p: any) => renderLabelInside(p, minLabelPercent), [minLabelPercent])

  const tooltipContent = useCallback(
    ({ active, payload }: any) => {
      if (!active || !payload?.length) return null

      const p = payload[0]?.payload as SliceDatum<T>
      const color = payload[0]?.color || '#000'
      const item = p?.raw

      const lines: Array<{ k: string; v: string }> = []

      if (percentKey && p?.backendPct) {
        lines.push({ k: humanizeKey(String(percentKey)), v: String(p.backendPct) })
      }

      tooltipKeys.forEach((k) => {
        const raw = item?.[k]
        let v: string
        if (isPercentString(raw)) {
          v = raw.trim()
        } else {
          const num = toNumber(raw)
          v = Number.isFinite(num) ? indianFormat(num) : String(raw ?? '')
        }
        lines.push({ k: humanizeKey(String(k)), v })
      })

      return (
        <div className="min-w-45 rounded-xl border border-slate-200/70 bg-white/98 px-3.5 py-3 shadow-[0_0_0_1px_rgba(15,23,42,0.04),0_16px_32px_-8px_rgba(15,23,42,0.18)] backdrop-blur-md">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white" style={{ background: color }} />
            <span className="text-[13px] font-semibold tracking-tight text-slate-800">{p?.name ?? ''}</span>
          </div>

          {lines.length ? (
            <div className="grid gap-1">
              {lines.map((ln) => (
                <div key={ln.k} className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500">{ln.k}</span>
                  <span className="font-semibold text-slate-900">{ln.v}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              {formatIndianShort(p?.value ?? 0)} · {(p?.percent ? p.percent * 100 : 0).toFixed(1)}%
            </p>
          )}
        </div>
      )
    },
    [percentKey, tooltipKeys],
  )

  if (!processed.slices.length) return null

  return (
    <section className="flex w-full flex-col items-stretch sm:block">
      {(title || headerActions) && (
        <div className="mb-3 flex w-full flex-col items-start gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          {title && <h3 className="text-[15px] font-semibold leading-tight text-navy-900 sm:min-w-0 sm:flex-1">{title}</h3>}
          {headerActions && (
            <div className="w-full sm:w-auto sm:shrink-0">
              <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">{headerActions}</div>
            </div>
          )}
        </div>
      )}

      <div className="grid w-full min-w-0 grid-cols-1 gap-3 md:gap-4">
        <div
          className="grid w-full min-w-0 gap-3 md:gap-4 md:[grid-template-columns:minmax(0,1fr)_var(--legend-w)]"
          style={{ ['--legend-w' as string]: `${legendWidth}px` }}
        >
          {/* Chart */}
          <div ref={chartBox.ref} className="w-full min-w-0" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
                <Tooltip content={tooltipContent} />
                <Pie
                  data={processed.slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={innerR}
                  outerRadius={outerR}
                  paddingAngle={2}
                  cornerRadius={4}
                  stroke="#fff"
                  strokeWidth={2}
                  labelLine={false}
                  label={labelRenderer}
                  isAnimationActive
                  animationDuration={600}
                  animationEasing="ease-out"
                >
                  {processed.slices.map((_, idx) => (
                    <Cell key={idx} fill={colors[idx]} />
                  ))}
                </Pie>
              </RePieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend (desktop right) */}
          <aside className="hidden md:block">
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">Breakdown</p>
            <div className="max-h-60 overflow-auto pr-1">
              <ul className="space-y-2">
                {processed.slices.map((s, idx) => (
                  <li key={s.name} className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[idx] }} />
                      <span className="truncate text-[13px] text-slate-700" title={s.name}>
                        {s.name}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {formatIndianShort(s.value)} · {(s.percent * 100).toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        {/* Legend (mobile bottom) */}
        <div className="md:hidden">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">Breakdown</p>
          <div className="max-h-60 overflow-auto pr-1">
            <ul className="space-y-3">
              {processed.slices.map((s, idx) => (
                <li key={s.name} className="flex items-start justify-between gap-3">
                  <span className="flex min-w-0 items-start gap-2">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[idx] }} />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] text-slate-700" title={s.name}>
                        {s.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {formatIndianShort(s.value)} · {(s.percent * 100).toFixed(1)}%
                      </span>
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

export const DonutChart = React.memo(DonutChartInner) as typeof DonutChartInner
export default DonutChart
