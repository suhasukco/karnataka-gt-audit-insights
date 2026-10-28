import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // `min-w-0`: a Card is almost always a grid/flex item, and such an item
        // defaults to `min-width: auto` — its min-content size. A chart inside
        // has a hard px track (BarChart floors at 600px), so without this the
        // Card refuses to shrink below that track and drags the whole page into
        // sideways scroll on a phone. The chart's own `min-w-0` cannot help:
        // the item that must shrink is this one.
        'relative min-w-0 rounded-card border border-slate-200/60 bg-white shadow-card',
        'before:pointer-events-none before:absolute before:inset-0 before:rounded-card before:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8)]',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('relative flex items-start justify-between gap-4 px-6 pt-5.5 pb-1', className)} {...props} />
}

/** `h2`, not `h3`: PageHeader renders the page's only `h1` and cards sit
 *  directly under it, so `h3` skipped a level on every dashboard page. Purely
 *  semantic — the size and weight come from the class, so nothing moves. */
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-[19px] font-semibold tracking-tight text-slate-900', className)} {...props} />
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-0.5 text-[14.5px] leading-relaxed text-slate-500', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('relative px-6 pb-6 pt-3', className)} {...props} />
}
