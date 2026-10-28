import { Link, useLocation } from 'react-router-dom'
import { Download, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface NavbarProps {
  onMenuClick: () => void
  mobileNavOpen: boolean
}

export function Navbar({ onMenuClick, mobileNavOpen }: NavbarProps) {
  const { pathname } = useLocation()

  // Geography & Outlets is a dark editorial narrative on #090d18. A white bar
  // sat straight on top of it, so the shell read as a seam rather than as the
  // frame around the page. The bar follows the page it heads instead.
  const onDarkPage = pathname.startsWith('/live/geography')

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-16 items-center gap-3 border-b px-4 backdrop-blur-xl transition-colors duration-300 lg:px-6',
        onDarkPage
          ? 'border-white/8 bg-navy-950/85 shadow-[0_1px_0_0_rgba(255,255,255,0.04)]'
          : 'border-slate-200/70 bg-white/85 shadow-[0_1px_0_0_rgba(15,23,42,0.03)]',
      )}
    >
      <button
        onClick={onMenuClick}
        className={cn(
          // 44px, not 36px — this is the only way into the nav below `lg`.
          'flex h-11 w-11 items-center justify-center rounded-lg transition-colors lg:hidden',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
          onDarkPage ? 'text-slate-300 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100',
        )}
        aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={mobileNavOpen}
      >
        {mobileNavOpen ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
      </button>

      <Link
        to="/"
        className="flex min-h-11 min-w-11 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-navy-800 to-navy-900 text-xs font-bold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]">
          GT
        </div>
        <span
          className={cn(
            'hidden text-[16.5px] font-semibold tracking-tight sm:inline',
            onDarkPage ? 'text-white' : 'text-navy-900',
          )}
        >
          Karnataka GT Report 2026
        </span>
      </Link>

      <div className="ml-auto flex items-center gap-2">
        {/* The label is hidden below `sm`, so without this the control was an
            unlabelled icon to a screen reader on exactly the widths where the
            text is gone. */}
        <Button variant="primary" size="sm" aria-label="Download report">
          <Download aria-hidden className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Download Report</span>
        </Button>

        {/* A 36×36 button used to sit here with its <Bell/> commented out. It
            kept its hover state and an `animate-ping` amber dot, so on screen
            it was an orphan pulsing dot with no icon, to a screen reader an
            unlabelled control, and to a mouse a target with no handler. There
            is no notification system behind it, so it is gone rather than
            relabelled. */}

        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-blue-600 text-xs font-semibold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)]',
            onDarkPage ? 'ring-2 ring-navy-950 ring-offset-1 ring-offset-white/20' : 'ring-2 ring-white ring-offset-1 ring-offset-slate-900/6',
          )}
        >
          RF
        </div>
      </div>
    </header>
  )
}
