import { readableTextOn, sequentialColor } from '@/lib/palette'

interface HeatmapGridProps {
  rows: string[]
  columns: string[]
  values: number[][] // values[rowIndex][colIndex]
  formatValue?: (value: number) => string
  min?: number
  max?: number
}

export function HeatmapGrid({ rows, columns, values, formatValue, min, max }: HeatmapGridProps) {
  const flat = values.flat()
  const vMin = min ?? Math.min(...flat)
  const vMax = max ?? Math.max(...flat)

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-140 border-separate border-spacing-2">
        <thead>
          <tr>
            <th className="w-32" />
            {columns.map((col) => (
              <th key={col} className="pb-1.5 text-center text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row}>
              <td className="pr-2.5 text-right text-[14px] font-medium text-slate-600">{row}</td>
              {columns.map((col, ci) => {
                const value = values[ri][ci]
                // Measured off the fill, so the label can never land on the
                // one ramp step where neither black nor white reaches AA.
                const fill = sequentialColor(value, vMin, vMax)
                return (
                  <td key={col} className="p-0">
                    <div
                      className="flex h-9.5 w-full min-w-11 items-center justify-center rounded-[9px] text-[12.5px] font-bold shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04)] transition-transform duration-150 hover:z-10 hover:scale-110 hover:shadow-[0_4px_12px_-2px_rgba(15,23,42,0.25)]"
                      style={{ backgroundColor: fill, color: readableTextOn(fill) }}
                      title={`${row} · ${col}: ${formatValue ? formatValue(value) : value}`}
                    >
                      {formatValue ? formatValue(value) : value}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
