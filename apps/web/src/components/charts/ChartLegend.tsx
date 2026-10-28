interface LegendDatum {
  name: string
  value?: number
  color: string
  suffix?: string
}

interface ChartLegendProps {
  items: LegendDatum[]
  className?: string
}

export function ChartLegend({ items, className }: ChartLegendProps) {
  return (
    <ul className={className}>
      {items.map((item) => (
        <li key={item.name} className="flex items-center justify-between gap-3 py-1 text-xs">
          <span className="flex min-w-0 items-center gap-2 text-slate-600">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="truncate">{item.name}</span>
          </span>
          {item.value !== undefined && (
            <span className="shrink-0 font-semibold text-slate-800">
              {item.value}
              {item.suffix ?? '%'}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
