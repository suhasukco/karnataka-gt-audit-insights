import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'

export function AppShell() {
  // Desktop: the rail narrows to icons. Mobile: there is no rail at all until
  // it is asked for, so the two states are genuinely separate and cannot share
  // one flag — the hamburger used to toggle `collapsed`, which changed the
  // width of an element that was `display: none` below `lg`. The result was a
  // button that did nothing and five of six routes unreachable on a phone.
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { pathname } = useLocation()

  // A drawer left open across a navigation would cover the page just asked for.
  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  // Escape is the expected way out of any overlay, and the drawer traps nothing
  // without it.
  useEffect(() => {
    if (!mobileNavOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileNavOpen])

  // The page behind a drawer should not scroll under it.
  useEffect(() => {
    if (!mobileNavOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [mobileNavOpen])

  return (
    <div className="min-h-screen">
      <Navbar mobileNavOpen={mobileNavOpen} onMenuClick={() => setMobileNavOpen((open) => !open)} />
      <div className="flex">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          mobileNavOpen={mobileNavOpen}
          onCloseMobileNav={() => setMobileNavOpen(false)}
        />
        <main className="min-w-0 flex-1 px-4 py-7 sm:px-6 lg:px-9 lg:py-9">
          {/* Restored. Without a ceiling, tables and chart cards ran the full
              width of whatever monitor they landed on, so a 2560px display
              stretched a six-bar chart across ~2200px of card. */}
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
