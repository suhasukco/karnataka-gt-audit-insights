import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 border-b border-slate-200/70 pb-6 sm:flex-row sm:items-end">
      <div>
        {eyebrow && (
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-blue-700">
            <span className="h-1 w-1 rounded-full bg-blue-600" />
            {eyebrow}
          </p>
        )}
        <h1 className="font-serif text-[29px] font-semibold tracking-tight text-navy-900 sm:text-[33px]">{title}</h1>
        {/* slate-500 clears 4.5:1 on white but the page ground is #f4f5f9, where
            it measures 4.37:1. slate-600 holds on both. */}
        {description && <p className="mt-2 max-w-2xl text-[16px] leading-relaxed text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
