import { Suspense, lazy } from 'react'
import type { ConstellationGeometry } from './useConstellationPoints'

/**
 * Lazy-mounts the WebGL field so three.js is not in the initial bundle.
 *
 * The brief asks for the R3F canvas to be lazy-mounted, and it matters more
 * here than usual: three + R3F + drei is by far the heaviest dependency on the
 * page, and the phone/reduced-motion paths never render this component at all,
 * so they must never pay to download it either.
 */
const Constellation = lazy(() =>
  import('./Constellation').then((m) => ({ default: m.Constellation })),
)

export function LazyConstellation(props: {
  geometry: ConstellationGeometry
  driver: { current: { spread: number; focus: number } }
}) {
  return (
    <Suspense fallback={null}>
      <Constellation {...props} />
    </Suspense>
  )
}
