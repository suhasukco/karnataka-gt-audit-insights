import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartTooltip } from './ChartTooltip'

export interface RadarDatum {
  metric: string
  value: number
}

interface RadarScoreChartProps {
  data: RadarDatum[]
  height?: number
  color?: string
  name?: string
}

export function RadarScoreChart({ data, height = 280, color = '#0D9488', name = 'Adoption' }: RadarScoreChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <defs>
          <radialGradient id="radarFill" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor={color} stopOpacity={0.38} />
            <stop offset="100%" stopColor={color} stopOpacity={0.06} />
          </radialGradient>
        </defs>
        <PolarGrid stroke="#e8ecf1" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 13.5, fill: '#475569', fontWeight: 500 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} tickCount={5} />
        <Radar name={name} dataKey="value" stroke={color} fill="url(#radarFill)" strokeWidth={2.5} dot={{ r: 3.5, fill: color, stroke: '#fff', strokeWidth: 1.5 }} animationDuration={600} />
        <Tooltip
          content={({ active, payload, label }) => (
            <ChartTooltip
              active={active}
              label={label as string}
              payload={payload?.map((p) => ({ name: p.name as string, value: p.value as number, color, unit: '%' }))}
            />
          )}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
