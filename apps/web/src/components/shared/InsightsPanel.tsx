import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import type { InsightItem } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

const TONE_STYLES: Record<InsightItem['tone'], { icon: typeof Info; iconClass: string; bg: string }> = {
  positive: { icon: CheckCircle2, iconClass: 'text-emerald-600', bg: 'bg-emerald-50' },
  warning: { icon: AlertTriangle, iconClass: 'text-amber-600', bg: 'bg-amber-50' },
  neutral: { icon: Info, iconClass: 'text-blue-600', bg: 'bg-blue-50' },
  critical: { icon: XCircle, iconClass: 'text-red-600', bg: 'bg-red-50' },
}

interface InsightsPanelProps {
  title?: string
  insights: InsightItem[]
}

export function InsightsPanel({ title = 'Quick Insights', insights }: InsightsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {insights.map((insight) => {
          const tone = TONE_STYLES[insight.tone]
          const Icon = tone.icon
          return (
            <div
              key={insight.title}
              className="group flex gap-3 rounded-xl border border-slate-100 p-3 transition-all duration-200 hover:border-slate-200 hover:bg-slate-50/60"
            >
              <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-black/3 transition-transform duration-200 group-hover:scale-105', tone.bg)}>
                <Icon className={cn('h-4 w-4', tone.iconClass)} />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-slate-800">{insight.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{insight.description}</p>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
