import { cn } from '@/lib/utils'

interface ScoreRingProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  label?: string
  sublabel?: string
  className?: string
}

export function ScoreRing({
  value,
  max = 100,
  size = 132,
  strokeWidth = 12,
  color = '#2563EB',
  trackColor = '#eef1f5',
  label,
  sublabel,
  className,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(1, value / max))
  const offset = circumference * (1 - pct)

  const gradientId = `ring-${color.replace('#', '')}`

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 drop-shadow-[0_2px_6px_rgba(15,23,42,0.08)]">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.75} />
            <stop offset="100%" stopColor={color} stopOpacity={1} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-[29px] font-bold tracking-tight text-navy-900">{label ?? Math.round(value)}</span>
        {sublabel && <span className="mt-0.5 text-[13px] font-medium text-slate-400">{sublabel}</span>}
      </div>
    </div>
  )
}
