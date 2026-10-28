import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold ring-1 ring-inset', {
  variants: {
    tone: {
      neutral: 'bg-slate-100 text-slate-600 ring-slate-200/70',
      blue: 'bg-blue-50 text-blue-700 ring-blue-200/60',
      // Was `teal`; kept distinct from `blue` so the two tones stay tellable apart.
      indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200/60',
      amber: 'bg-amber-50 text-amber-700 ring-amber-200/60',
      emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
      purple: 'bg-purple-50 text-purple-700 ring-purple-200/60',
      critical: 'bg-red-50 text-red-700 ring-red-200/60',
      navy: 'bg-navy-900/5 text-navy-900 ring-navy-900/10',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
