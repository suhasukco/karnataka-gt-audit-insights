import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { formatIndian } from './storyData'

gsap.registerPlugin(ScrollTrigger)

/**
 * Counts a figure up once, on first entry, and never again.
 *
 * The brief is explicit that counters must not re-trigger on scroll-back
 * jitter, so this uses `once: true` and writes text imperatively — React never
 * re-renders per frame, and the tabular-figure display face means the box does
 * not reflow while the digits change.
 *
 * Under reduced motion the final value is written immediately. `immediate` does
 * the same for the hero, which counts on load rather than on scroll.
 */
export function useCountUp(
  target: number | null,
  opts: { immediate?: boolean; duration?: number; delay?: number } = {},
) {
  const ref = useRef<HTMLSpanElement>(null)
  const { immediate = false, duration = 2.2, delay = 0 } = opts

  useEffect(() => {
    const el = ref.current
    if (!el || target == null) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = formatIndian(target)
      return
    }

    const state = { v: 0 }
    const write = () => {
      el.textContent = formatIndian(state.v)
    }
    write()

    const tween = gsap.to(state, {
      v: target,
      duration,
      delay,
      ease: 'power2.out',
      onUpdate: write,
      paused: !immediate,
    })

    if (immediate) return () => tween.kill()

    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => tween.play(),
    })

    return () => {
      st.kill()
      tween.kill()
    }
  }, [target, immediate, duration, delay])

  return ref
}
