import { Link } from 'react-router-dom'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'

interface ExploreCardProps {
  to: string
  title: string
  description: string
  icon: LucideIcon
  accent: string
}

export function ExploreCard({ to, title, description, icon: Icon, accent }: ExploreCardProps) {
  return (
    <Link to={to} className="group relative block h-full">
      <div
        className="pointer-events-none absolute -inset-1 rounded-[20px] opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-25"
        style={{ background: accent }}
        aria-hidden
      />
      <Card
        className="relative flex h-full flex-col gap-4 border-transparent p-5.5 shadow-card ring-1 ring-slate-200/70 transition-all duration-300 ease-out group-hover:-translate-y-1.5 group-hover:shadow-elevated group-hover:ring-2"
        style={{ ['--tw-ring-color' as string]: `${accent}33` }}
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_6px_16px_-4px_var(--tw-shadow-color)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, ['--tw-shadow-color' as string]: `${accent}66` }}
        >
          <Icon className="h-5.5 w-5.5" />
        </div>
        <div>
          <h3 className="text-[19px] font-semibold tracking-tight text-navy-900">{title}</h3>
          <p className="mt-1.5 text-[15px] leading-relaxed text-slate-500">{description}</p>
        </div>
        <span className="mt-auto flex items-center gap-1 text-xs font-semibold text-blue-700">
          Explore
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 ease-out group-hover:translate-x-1" />
        </span>
      </Card>
    </Link>
  )
}
