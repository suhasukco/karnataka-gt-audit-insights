function Shimmer({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden bg-slate-200/60 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_ease-in-out_infinite] bg-linear-to-r from-transparent via-white/60 to-transparent" />
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="space-y-7 p-1">
      <div className="space-y-2 border-b border-slate-200/70 pb-6">
        <Shimmer className="h-3 w-24 rounded-full" />
        <Shimmer className="h-8 w-72 rounded-lg" />
        <Shimmer className="h-3.5 w-96 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Shimmer key={i} className="h-26 rounded-card" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Shimmer className="h-96 rounded-card" />
        <Shimmer className="h-96 rounded-card" />
      </div>
    </div>
  )
}
