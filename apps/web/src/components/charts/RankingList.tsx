import { Link } from 'react-router-dom'
import type { RankedDistrict } from '@/types'
import { cn } from '@/lib/utils'

interface RankingListProps {
  items: RankedDistrict[]
  suffix?: string
  formatValue?: (value: number) => string
  linkToDistrict?: boolean
  barColor?: string
}

export function RankingList({ items, suffix = '', formatValue, linkToDistrict, barColor = '#2563EB' }: RankingListProps) {
  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <ol className="space-y-3">
      {items.map((item) => {
        const display = formatValue ? formatValue(item.value) : `${item.value}${item.suffix ?? suffix}`
        const content = (
          <>
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold',
                item.rank <= 3 ? 'bg-navy-900 text-white shadow-[0_2px_6px_-1px_rgba(7,26,61,0.4)]' : 'bg-slate-100 text-slate-500',
              )}
            >
              {item.rank}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[15px] font-medium text-slate-700">{item.district}</span>
                <span className="shrink-0 text-[15px] font-semibold text-navy-900">{display}</span>
              </div>
              <div className="mt-1.5 h-1.75 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(item.value / max) * 100}%`, background: `linear-gradient(90deg, ${barColor}99, ${barColor})` }}
                />
              </div>
            </div>
          </>
        )

        const districtSlug = item.district
          .toLowerCase()
          .replace(/\s+/g, '-')

        return (
          <li key={item.district} className={cn('flex items-center gap-3', linkToDistrict && 'group')}>
            {linkToDistrict ? (
              <Link to={`/district-profile/${districtSlug}`} className="flex flex-1 items-center gap-3">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        )
      })}
    </ol>
  )
}
