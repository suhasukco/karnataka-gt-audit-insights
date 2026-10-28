import { AlertTriangle, RotateCw } from 'lucide-react'
import { Card } from '@/components/ui/Card'

/**
 * A failed page used to be a dead end: it named an env var and a README path,
 * which is the right advice for whoever runs the stack and no advice at all
 * for the sales or CEO reader this dashboard is built for. Two changes:
 * the headline now says what it means for the reader, and there is something
 * to press. The technical detail is kept — it is what makes a bug report
 * useful — but demoted below the action rather than standing in for one.
 */
export function LiveErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      <AlertTriangle aria-hidden className="h-8 w-8 text-amber-500" />
      <p className="text-sm font-semibold text-slate-800">This view couldn&apos;t load its live figures</p>
      <p className="max-w-md text-xs text-slate-500">
        The census API didn&apos;t respond. Nothing here is out of date — the page simply has nothing to show yet.
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-navy-900 px-5 text-[13px] font-semibold text-white transition-colors duration-200 hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-900"
        >
          <RotateCw aria-hidden className="h-3.5 w-3.5" />
          Try again
        </button>
      )}

      {/* Kept for whoever is debugging, out of the reader's way. */}
      <details className="mt-1 max-w-md text-left">
        <summary className="cursor-pointer text-[11px] font-medium text-slate-400 hover:text-slate-600">
          Technical detail
        </summary>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          {message}. Check the FastAPI backend at <code>VITE_API_BASE_URL</code> (defaults to http://localhost:8000) —
          see <code>apps/api/README.md</code>.
        </p>
      </details>
    </Card>
  )
}

export function slugifyDistrict(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-')
}
