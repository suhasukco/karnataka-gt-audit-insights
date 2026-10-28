import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number
  className?: string
  barClassName?: string
  trackClassName?: string
}

export function Progress({ value, className, barClassName, trackClassName }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-100', trackClassName, className)}>
      <div
        className={cn('h-full rounded-full bg-blue-600 transition-[width] duration-700 ease-out', barClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
