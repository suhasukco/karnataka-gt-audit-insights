import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { AnimatedNumber } from '@/components/shared/AnimatedNumber'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: string
  delta?: string
  trend?: 'up' | 'down' | 'flat'
  icon?: LucideIcon
  tone?: 'blue' | 'indigo' | 'amber' | 'purple' | 'emerald' | 'navy'
  className?: string
  /** Opt-in count-up animation — pass the raw numeric value alongside a
   * `formatCount` to render it. When omitted, `value` renders statically
   * (the default, used by every pre-existing call site).
   */
  countTo?: number
  formatCount?: (n: number) => string
}

const TONE_BG: Record<NonNullable<KpiCardProps['tone']>, string> = {
  blue: 'bg-linear-to-br from-blue-50 to-blue-100/60 text-blue-700 ring-1 ring-blue-100',
  // Was `teal`. These tones exist to tell adjacent KPI cards apart, so this one
  // needs its own hue — indigo keeps it in the blue family without collapsing
  // into `blue`.
  indigo: 'bg-linear-to-br from-indigo-50 to-indigo-100/60 text-indigo-700 ring-1 ring-indigo-100',
  amber: 'bg-linear-to-br from-amber-50 to-amber-100/60 text-amber-700 ring-1 ring-amber-100',
  purple: 'bg-linear-to-br from-purple-50 to-purple-100/60 text-purple-700 ring-1 ring-purple-100',
  emerald: 'bg-linear-to-br from-emerald-50 to-emerald-100/60 text-emerald-700 ring-1 ring-emerald-100',
  navy: 'bg-linear-to-br from-navy-900/5 to-navy-900/10 text-navy-900 ring-1 ring-navy-900/10',
}

const TONE_ACCENT: Record<NonNullable<KpiCardProps['tone']>, string> = {
  blue: 'from-blue-500 to-blue-300',
  indigo: 'from-indigo-500 to-indigo-300',
  amber: 'from-amber-500 to-amber-300',
  purple: 'from-purple-500 to-purple-300',
  emerald: 'from-emerald-500 to-emerald-300',
  navy: 'from-navy-700 to-navy-400',
}

export function KpiCard({ label, value, delta, trend, icon: Icon, tone = 'blue', className, countTo, formatCount }: KpiCardProps) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus
  const trendClass = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-slate-400'

  return (
    <Card className={cn('group relative overflow-hidden px-5 py-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover', className)}>
      <span className={cn('absolute inset-x-0 top-0 h-[2.5px] bg-linear-to-r opacity-40 transition-opacity duration-300 group-hover:opacity-100', TONE_ACCENT[tone])} />
      <div className="flex items-start justify-between gap-3">
        {/* Two-line floor: a label that wraps used to push its own figure down,
            so one long label in a four-up row knocked every number out of
            alignment with its neighbours. */}
        {/* 19px was a desktop measurement: in a half-width column on a phone
            a label like "Have Refrigerator" grew wide enough to shove the icon
            past the card's `overflow-hidden` edge and clip it. */}
        <p className="min-h-13.5 text-[15px] font-medium leading-snug text-slate-500 sm:text-[17px] lg:text-[19px]">{label}</p>
        {Icon && (
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3', TONE_BG[tone])}>
            <Icon aria-hidden className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        {/* Was a flat `text-[38px]`, which a long figure (₹2,64,348L) blew
            straight out of the card at 375px. Scales with the breakpoint now,
            and `nums` holds the digits on a fixed advance so the count-up
            stops twitching mid-animation. */}
        <span className="nums text-[28px] font-bold tracking-tight text-navy-900 sm:text-[32px] lg:text-[38px]">
          {countTo !== undefined && formatCount ? <AnimatedNumber value={countTo} format={formatCount} /> : value}
        </span>
        {delta && (
          <span className={cn('flex items-center gap-0.5 text-sm font-semibold', trendClass)}>
            <TrendIcon aria-hidden className="h-3.5 w-3.5" /> {delta}
          </span>
        )}
      </div>
    </Card>
  )
}
