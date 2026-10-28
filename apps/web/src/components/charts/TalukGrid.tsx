import type { Taluk } from '@/types'
import { sequentialColor } from '@/lib/palette'
import { cn, formatNumber } from '@/lib/utils'

interface TalukGridProps {
  taluks: Taluk[]
  metric?: (t: Taluk) => number
}

export function TalukGrid({ taluks, metric = (t) => t.totalOutlets }: TalukGridProps) {
  const values = taluks.map(metric)
  const min = Math.min(...values)
  const max = Math.max(...values)

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {taluks.map((taluk) => {
        const value = metric(taluk)
        const t = max === min ? 0 : (value - min) / (max - min)
        const isDark = t > 0.55
        return (
          <div
            key={taluk.id}
            className="rounded-xl border border-white/60 p-3 shadow-sm"
            style={{ backgroundColor: sequentialColor(value, min, max) }}
            title={`${taluk.name}: ${formatNumber(taluk.totalOutlets)} outlets, ${taluk.coveragePercent.toFixed(0)}% coverage`}
          >
            <p className={cn('truncate text-[14px] font-semibold', isDark ? 'text-white' : 'text-navy-900')}>{taluk.name}</p>
            <p className={cn('mt-1 text-[17px] font-bold', isDark ? 'text-white' : 'text-navy-900')}>{formatNumber(taluk.totalOutlets)}</p>
            <p className={cn('text-[12px]', isDark ? 'text-white/75' : 'text-navy-900/70')}>{taluk.coveragePercent.toFixed(0)}% coverage</p>
          </div>
        )
      })}
    </div>
  )
}
