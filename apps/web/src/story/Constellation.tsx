import { useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ConstellationGeometry } from './useConstellationPoints'

/**
 * The signature element: 11.5k real geocoded cells as one additive point field.
 *
 * No custom GLSL. An earlier version used a ShaderMaterial for per-point size,
 * and it was the wrong trade: it failed to link silently ("drawArrays: no valid
 * shader program in use", with no compile error to read), and debugging GLSL
 * through a bundler is slow. This version does the same work on the CPU — a
 * 11.5k-element lerp is well under a millisecond — using stock PointsMaterial.
 *
 * It is also the better encoding. Density is carried by *overlap* rather than by
 * a size attribute: the Bengaluru cells sit on top of one another, so under
 * additive blending they physically blow out to white while sparse districts
 * stay dim. The thesis (extreme concentration) is rendered by the same
 * mechanism that makes a long-exposure photograph of a city clip its highlights
 * — the light piles up. Nothing fakes it.
 *
 * Two scalars drive every scene:
 *   spread  0 -> 1   scattered ring resolves into Karnataka's true shape
 *   focus   0 -> 1   non-leading districts recede and compact inward
 */

const SODIUM = new THREE.Color('#ffc978')
const DIM = new THREE.Color('#b8814a')
const BLOWN = new THREE.Color('#fff3e0')

interface FieldProps {
  geometry: ConstellationGeometry
  /** Read imperatively each frame, so scrolling never re-renders React. */
  driver: { current: { spread: number; focus: number } }
}

function Field({ geometry, driver }: FieldProps) {
  const { geom, mat, state } = useMemo(() => {
    const n = geometry.count
    const positions = new Float32Array(n * 3)
    const colors = new Float32Array(n * 3)

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    // Positions are rewritten every frame, so skip the bounding-sphere
    // recompute and cull manually (never — the field is always on screen).
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4)

    const m = new THREE.PointsMaterial({
      size: 2.2,
      // Screen-space points: the field is a map, not a perspective scene, so a
      // cell should not shrink because of where it sits.
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    // Per-point stagger, so the field resolves as a sweep rather than a snap.
    const stagger = new Float32Array(n)
    for (let i = 0; i < n; i++) stagger[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1

    return { geom: g, mat: m, state: { positions, colors, stagger, spread: 0, focus: 0 } }
  }, [geometry])

  useEffect(
    () => () => {
      geom.dispose()
      mat.dispose()
    },
    [geom, mat],
  )

  useFrame((_, delta) => {
    // Ease toward the scroll target so a fast flick reads as momentum rather
    // than a jump cut.
    const k = 1 - Math.pow(0.001, Math.min(delta, 0.1))
    state.spread += (driver.current.spread - state.spread) * k
    state.focus += (driver.current.focus - state.focus) * k

    const { positions, colors, stagger, spread, focus } = state
    const { count, positions: truePos, scatter, intensity, isLeader, leaderCentre } = geometry
    const [lcx, lcy] = leaderCentre
    const c = new THREE.Color()

    for (let i = 0; i < count; i++) {
      const s = Math.abs(stagger[i])
      // Staggered smoothstep: each point starts a little after the last.
      let t = (spread - s * 0.3) / 0.7
      t = t < 0 ? 0 : t > 1 ? 1 : t
      t = t * t * (3 - 2 * t)

      const tx = truePos[i * 2]
      const ty = truePos[i * 2 + 1]
      let x = scatter[i * 2] + (tx - scatter[i * 2]) * t
      let y = scatter[i * 2 + 1] + (ty - scatter[i * 2 + 1]) * t

      // Act 2: everything that is not the leading district compacts toward it,
      // so the field visibly collapses into the one district holding most of it.
      if (isLeader[i] === 0 && focus > 0.001) {
        const p = focus * 0.5
        x += (lcx - x) * p * 0.5
        y += (lcy - y) * p * 0.5
      }

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = 0

      // Colour carries density; overlap does the rest.
      const inten = intensity[i]
      c.copy(DIM).lerp(SODIUM, inten)
      if (isLeader[i] === 1) {
        c.lerp(BLOWN, focus * 0.9)
      } else {
        // Non-leaders recede as focus rises, so the contrast is a ratio the eye
        // can read rather than an absolute brightening.
        c.multiplyScalar(1 - focus * 0.55)
      }
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }

    ;(geom.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    ;(geom.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true
  })

  return <points geometry={geom} material={mat} frustumCulled={false} />
}

export function Constellation({ geometry, driver }: FieldProps) {
  return (
    <Canvas
      // dpr capped at 2: the field is additive and fill-rate bound, and beyond
      // 2x the extra pixels buy nothing visible on this content.
      dpr={[1, 2]}
      orthographic
      camera={{ position: [0, 0, 3], zoom: 300, near: 0.1, far: 10 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <OrthoFit />
      <Field geometry={geometry} driver={driver} />
    </Canvas>
  )
}

/** Keeps the normalised [-1,1] field filling the viewport at any aspect. */
function OrthoFit() {
  useFrame(({ camera, size }) => {
    const cam = camera as THREE.OrthographicCamera
    const target = Math.min(size.width, size.height) * 0.44
    if (Math.abs(cam.zoom - target) > 0.5) {
      cam.zoom = target
      cam.updateProjectionMatrix()
    }
  })
  return null
}
