import { Link } from 'react-router-dom'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { AnimatedNumber } from '@/components/shared/AnimatedNumber'

interface LensCardProps {
  to: string
  title: string
  icon: LucideIcon
  accent: string
  statValue: number
  statFormat: (n: number) => string
}

/** KPI and navigation used to be two separate grids repeating the same four
 * pillars. Here the real stat IS the card's headline — no decorative icon
 * standing in for content, and every number leads somewhere. */
export function LensCard({ to, title, icon: Icon, accent, statValue, statFormat }: LensCardProps) {
  return (
    <Link to={to} className="group relative block h-full">
      <div
        className="pointer-events-none absolute -inset-1 rounded-4xl opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-25"
        style={{ background: accent }}
        aria-hidden
      />
      <Card
        className="relative flex h-full flex-col gap-4 border-transparent p-6 shadow-card ring-1 ring-slate-200/70 transition-all duration-300 ease-out group-hover:-translate-y-1.5 group-hover:shadow-elevated group-hover:ring-2"
        style={{ ['--tw-ring-color' as string]: `${accent}33` }}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[33px] font-bold leading-none tracking-tight text-navy-900">
            <AnimatedNumber value={statValue} format={statFormat} />
          </p>
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_6px_16px_-4px_var(--tw-shadow-color)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, ['--tw-shadow-color' as string]: `${accent}66` }}
          >
            <Icon className="h-5 w-5" />
          </span>
        </div>
        <h3 className="text-[17px] font-semibold tracking-tight text-navy-900">{title}</h3>
        <span className="mt-auto flex items-center gap-1 text-[13px] font-semibold" style={{ color: accent }}>
          Explore
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 ease-out group-hover:translate-x-1" />
        </span>
      </Card>
    </Link>
  )
}
