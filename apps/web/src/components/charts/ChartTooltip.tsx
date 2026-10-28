import type { ReactNode } from 'react'

interface TooltipPayloadItem {
  name?: ReactNode
  value?: ReactNode
  color?: string
  unit?: string
}

interface ChartTooltipProps {
  active?: boolean
  label?: string
  payload?: TooltipPayloadItem[]
}

export function ChartTooltip({ active, label, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="min-w-35 rounded-xl border border-slate-200/70 bg-white/98 px-3.5 py-3 shadow-[0_0_0_1px_rgba(15,23,42,0.04),0_16px_32px_-8px_rgba(15,23,42,0.18)] backdrop-blur-md">
      {label && <p className="mb-1.5 text-[13.5px] font-semibold tracking-tight text-slate-700">{label}</p>}
      <div className="space-y-1.5">
        {payload.map((item, i) => (
          <div key={`${item.name}-${i}`} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-slate-500">
              {item.color && <span className="h-2 w-2 shrink-0 rounded-full ring-2 ring-white" style={{ backgroundColor: item.color }} />}
              {item.name}
            </span>
            <span className="font-semibold text-slate-900">
              {item.value}
              {item.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
