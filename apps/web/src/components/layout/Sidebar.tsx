import { NavLink } from 'react-router-dom'
import { ChevronsLeft, ChevronsRight, X } from 'lucide-react'
import { NAV_SECTIONS } from './nav'
import { cn } from '@/lib/utils'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileNavOpen: boolean
  onCloseMobileNav: () => void
}

export function Sidebar({ collapsed, onToggle, mobileNavOpen, onCloseMobileNav }: SidebarProps) {
  return (
    <>
      {/* Scrim. Only below `lg`, where the rail is an overlay rather than part
          of the layout. Tapping it is the fastest way out, and the 50% black
          keeps the page behind from competing with the nav in front. */}
      <div
        aria-hidden
        onClick={onCloseMobileNav}
        className={cn(
          'fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-200 lg:hidden',
          mobileNavOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        aria-label="Main navigation"
        className={cn(
          // Below `lg` this is a fixed off-canvas drawer; at `lg` and up it
          // becomes the sticky rail it always was. It used to be `hidden
          // lg:flex`, which is why the hamburger had nothing to open.
          'fixed inset-y-0 left-0 z-50 flex w-80 shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-navy-900 text-slate-300 shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.2),8px_0_32px_-16px_rgba(0,0,0,0.4)]',
          // `visibility` rides along with the slide so a closed drawer is not
          // merely parked off-canvas: off-canvas alone leaves its six links in
          // the tab order and readable by a screen reader. Transitioning it
          // rather than toggling it keeps the slide-out visible on close.
          'transition-[translate,visibility] duration-200 ease-out',
          mobileNavOpen ? 'translate-x-0 visible' : '-translate-x-full max-lg:invisible',
          'lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0 lg:visible lg:self-start lg:transition-[width] lg:duration-200',
          collapsed ? 'lg:w-19' : 'lg:w-64',
        )}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-52 opacity-70"
          /* Was rgba(45,212,191) — teal-400 hardcoded, so the class sweep could
             not reach it and the sidebar kept a green glow. Now accent-400. */
          style={{ background: 'radial-gradient(120% 100% at 20% 0%, rgba(106,95,175,0.20), transparent 60%)' }}
          aria-hidden
        />

        <div className={cn('relative flex h-16 shrink-0 items-center gap-2.5 border-b border-white/[0.08] px-5', collapsed && 'lg:justify-center lg:px-0')}>
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-accent-400 to-accent-800 text-sm font-bold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_4px_12px_-2px_rgba(106,95,175,0.5)]">
            GT
          </div>
          <div className={cn('min-w-0 leading-tight', collapsed && 'lg:hidden')}>
            <p className="truncate text-[15px] font-semibold tracking-tight text-white">Karnataka GT</p>
            {/* slate-500 measured 3.6:1 on navy-900. slate-400 is 5.9:1. */}
            <p className="truncate text-[12px] font-medium text-slate-400">Intelligence Platform 2026</p>
          </div>

          {/* Every overlay needs a visible way out, not just a scrim tap. */}
          <button
            type="button"
            onClick={onCloseMobileNav}
            aria-label="Close navigation"
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-300 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="relative flex-1 space-y-5 overflow-y-auto px-3 py-5 scrollbar-thin">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              {/* slate-500/80 measured 2.76:1 on navy-900 — the worst contrast
                  in the shell. slate-400 at full opacity is 5.9:1. */}
              <p className={cn('mb-2 px-3 text-[11.5px] font-semibold uppercase tracking-widest text-slate-400', collapsed && 'lg:hidden')}>
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15.5px] font-medium transition-all duration-200',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-300',
                        isActive
                          ? 'bg-linear-to-r from-white/[0.09] to-white/[0.03] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                          : 'text-slate-400 hover:bg-white/[0.05] hover:text-white',
                        collapsed && 'lg:justify-center lg:px-0',
                      )
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        {/* Light steps, not the brand hex: #0B0445 on navy-900 is
                            effectively invisible. accent-300 measures 5.2:1 here. */}
                        {isActive && <span className="absolute left-0 top-1/2 h-4 w-0.75 -translate-y-1/2 rounded-full bg-accent-300" />}
                        <span
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
                            isActive ? 'bg-accent-400/20 text-accent-300' : 'text-slate-500 group-hover:bg-white/[0.06] group-hover:text-accent-300',
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                        </span>
                        <span className={cn('truncate', collapsed && 'lg:hidden')}>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Desktop affordance only — below `lg` the drawer closes, it does not
            narrow, so a collapse control there would have nothing to do. */}
        <button
          onClick={onToggle}
          className="relative hidden h-11 shrink-0 items-center justify-center gap-2 border-t border-white/[0.08] text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-300 lg:flex"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : (
            <>
              <ChevronsLeft className="h-4 w-4" /> Collapse
            </>
          )}
        </button>
      </aside>
    </>
  )
}
