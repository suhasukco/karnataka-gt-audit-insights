// Shared Framer Motion presets so every page's "fade up on scroll into view"
// treatment is identical rather than each page hand-rolling slightly
// different easing/timing.

export const EASE_OUT = [0.16, 1, 0.3, 1] as const

export const fadeUpInView = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.55, ease: EASE_OUT },
}

export function fadeUpInViewDelay(index: number, step = 0.08) {
  return {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.55, delay: index * step, ease: EASE_OUT },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Cinematic 3D presets — for the Home landing page only. Each REQUIRES the
// element's parent to set `perspective` (e.g. `[perspective:1200px]`) and the
// animated element itself to carry `[transform-style:preserve-3d]`, otherwise
// the rotation reads as a flat skew rather than depth. Always gate these behind
// `useReducedMotion()` at the call site and fall back to `fadeUpInView`, since
// large rotate/translate-Z movement is exactly what reduced-motion users opt out
// of.
// ─────────────────────────────────────────────────────────────────────────

/** Swings in around the vertical axis — for a single hero-media panel. */
export const rotateInView = {
  initial: { opacity: 0, rotateY: -18, y: 24 },
  whileInView: { opacity: 1, rotateY: 0, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.8, ease: EASE_OUT },
}

/** Tilts up from a slight backward lean around the horizontal axis — for a grid
 * of cards. Pair with a staggered delay so the grid "stands up" row by row. */
export function tiltUpInViewDelay(index: number, step = 0.07) {
  return {
    initial: { opacity: 0, rotateX: -22, y: 34 },
    whileInView: { opacity: 1, rotateX: 0, y: 0 },
    viewport: { once: true, margin: '-40px' },
    transition: { duration: 0.65, delay: index * step, ease: EASE_OUT },
  }
}
