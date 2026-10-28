import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CoverageTrendPoint } from '@/types'
import { ChartTooltip } from './ChartTooltip'

interface TrendChartProps {
  data: CoverageTrendPoint[]
  height?: number
}

export function TrendChart({ data, height = 260 }: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#eef1f5" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 13, fill: '#64748b', fontWeight: 500 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 13, fill: '#64748b' }} unit="%" width={44} />
        <Tooltip
          cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
          content={({ active, payload, label }) => (
            <ChartTooltip
              active={active}
              label={label as string}
              payload={payload?.map((p) => ({ name: p.name as string, value: p.value as number, color: p.color, unit: '%' }))}
            />
          )}
        />
        <Area
          type="monotone"
          dataKey="actual"
          name="Actual Coverage"
          stroke="#2563EB"
          strokeWidth={2.5}
          fill="url(#actualFill)"
          dot={{ r: 3, fill: '#2563EB', stroke: '#fff', strokeWidth: 1.5 }}
          activeDot={{ r: 5, fill: '#2563EB', stroke: '#fff', strokeWidth: 2 }}
        />
        <Line type="monotone" dataKey="planned" name="Planned" stroke="#94A3B8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
