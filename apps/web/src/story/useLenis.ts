import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Smooth inertia scroll, driven from GSAP's ticker rather than its own RAF loop.
 *
 * Two things have to be true or scroll-driven animation drifts: GSAP must be
 * the single clock (otherwise Lenis and ScrollTrigger tick independently and
 * pinned scenes judder), and ScrollTrigger must be told where Lenis has moved
 * the page to. `scrollerProxy` is not needed here because Lenis drives the real
 * window scroll position — only `ScrollTrigger.update` on each Lenis frame is.
 *
 * Under prefers-reduced-motion Lenis is not started at all: inertia scrolling is
 * itself a vestibular problem, so those users get native scrolling and the
 * scenes resolve to their final state.
 */
export function useLenis(enabled = true) {
  useEffect(() => {
    if (!enabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      // Heavy and cinematic, not floaty: a long duration with a steep ease-out
      // settles decisively instead of gliding.
      duration: 1.15,
      easing: (t: number) => 1 - Math.pow(1 - t, 3.2),
      wheelMultiplier: 0.9,
      // Touch keeps native behaviour — smoothed touch scroll feels broken on a
      // phone and fights the platform's own overscroll.
      syncTouch: false,
    })

    lenis.on('scroll', ScrollTrigger.update)

    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [enabled])
}
