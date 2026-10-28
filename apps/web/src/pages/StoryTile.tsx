import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { useSegment } from '@/components/shared/SegmentToggle'
import { useStoryData, formatIndian } from '@/story/storyData'
import '@/story/story.css'
import { useLenis } from '@/story/useLenis'

gsap.registerPlugin(ScrollTrigger)

/**
 * Gate deliverable: the style tile.
 *
 * Not a scene — a single screen that shows every token in the system next to a
 * live figure from the census, plus a scrubbed ScrollTrigger and Lenis running
 * so the motion backbone is proven before any act is built on it.
 */

const SWATCHES: { name: string; token: string; note: string }[] = [
  { name: 'Void', token: '--st-void', note: 'canvas — unlit map' },
  { name: 'Land', token: '--st-land', note: 'territory (brand #0B0445)' },
  { name: 'Ridge', token: '--st-ridge', note: 'raised panel' },
  { name: 'Line', token: '--st-line', note: 'contour hairline' },
  { name: 'Sodium', token: '--st-sodium', note: 'a lit outlet' },
  { name: 'Sodium dim', token: '--st-sodium-dim', note: 'sparse district' },
  { name: 'Blown', token: '--st-blown', note: 'white-hot — Bengaluru' },
  { name: 'Paper', token: '--st-paper', note: 'primary ink' },
  { name: 'Muted', token: '--st-muted', note: 'secondary ink' },
  { name: 'Survey', token: '--st-survey', note: 'labels, coordinates' },
]

export default function StoryTile() {
  const root = useRef<HTMLDivElement>(null)
  const [segment] = useSegment()
  const { data, loading, error } = useStoryData(segment)

  useLenis()

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Proof of life #1: a scrubbed bar. Growth is tied to scroll position,
        // which is the mechanic Act 2's reveal depends on.
        gsap.fromTo(
          '[data-proof-bar]',
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: 'none',
            transformOrigin: 'left center',
            scrollTrigger: {
              trigger: '[data-proof]',
              start: 'top 80%',
              end: 'bottom 55%',
              scrub: true,
            },
          },
        )
        // Proof of life #2: three depth planes moving at different rates, to
        // confirm parallax reads as depth and not as drift.
        gsap.utils.toArray<HTMLElement>('[data-plane]').forEach((el) => {
          const depth = Number(el.dataset.plane)
          gsap.fromTo(
            el,
            { y: 0 },
            {
              y: -60 * depth,
              ease: 'none',
              scrollTrigger: {
                trigger: '[data-proof]',
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
              },
            },
          )
        })
      })
      return () => mm.revert()
    },
    { scope: root, dependencies: [data] },
  )

  return (
    <div ref={root} className="story min-h-screen px-6 py-16 sm:px-10 lg:px-16">
      <p className="story-label">Style tile · gate 2 of 5</p>
      <h1 className="story-display mt-4" style={{ fontSize: 'var(--st-display-lg)' }}>
        Karnataka GT Intelligence
      </h1>
      <p className="story-body mt-4">
        Tokens, type scale and motion backbone. No scenes yet — this screen exists
        so the system can be signed off before five acts are built on it.
      </p>

      {/* --- figures ---------------------------------------------------- */}
      <hr className="story-rule my-12" />
      <p className="story-label">The figure scale · live from the census</p>

      {error && (
        <p className="story-body mt-4" style={{ color: 'var(--st-sodium)' }}>
          Live data unavailable — {error}
        </p>
      )}

      <div className="mt-6">
        <span
          className="story-figure block"
          style={{ fontSize: 'var(--st-figure-hero)' }}
        >
          {loading || !data ? '—' : formatIndian(data.totalOutlets)}
        </span>
        <p className="story-label mt-4">
          outlets · segment: {segment}
        </p>
      </div>

      <div className="mt-10 flex flex-wrap items-end gap-x-14 gap-y-8">
        <div>
          <span className="story-figure block" style={{ fontSize: 'var(--st-figure-lg)' }}>
            {data ? `${data.districtsCovered}/${data.districtsTotal}` : '—'}
          </span>
          <p className="story-label mt-3">districts</p>
        </div>
        <div>
          <span className="story-figure block" style={{ fontSize: 'var(--st-figure-lg)' }}>
            {data ? formatIndian(data.taluks) : '—'}
          </span>
          <p className="story-label mt-3">taluks</p>
        </div>
        <div>
          <span className="story-figure block" style={{ fontSize: 'var(--st-figure-md)' }}>
            {data?.leader ? `${data.leader.pct}%` : '—'}
          </span>
          <p className="story-label mt-3">in {data?.leader?.district ?? '—'}</p>
        </div>
      </div>

      {/* --- palette ---------------------------------------------------- */}
      <hr className="story-rule my-12" />
      <p className="story-label">Palette · India at night, from orbit</p>
      <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
        {SWATCHES.map((s) => (
          <div key={s.token}>
            <div
              className="h-16 w-full rounded-md"
              style={{
                background: `var(${s.token})`,
                boxShadow: 'inset 0 0 0 1px rgba(237,234,245,0.14)',
              }}
            />
            <p className="mt-2 text-[13px] font-semibold" style={{ color: 'var(--st-paper)' }}>
              {s.name}
            </p>
            <p className="story-label mt-0.5" style={{ letterSpacing: '0.1em' }}>
              {s.note}
            </p>
          </div>
        ))}
      </div>

      {/* --- type ------------------------------------------------------- */}
      <hr className="story-rule my-12" />
      <p className="story-label">Type · three roles, one new face</p>
      <div className="mt-6 space-y-6">
        <div>
          <p className="story-label">Archivo · figures + display</p>
          <p className="story-display mt-1" style={{ fontSize: 'var(--st-display-md)' }}>
            Nearly {data?.leaderPerTen ?? '—'} in 10 outlets sit in one district
          </p>
        </div>
        <div>
          <p className="story-label">Inter · body</p>
          <p className="story-body mt-1">
            A door-to-door field census of every general-trade outlet in the state,
            geocoded on site rather than assigned by postal code.
          </p>
        </div>
        <div>
          <p className="story-label">IBM Plex Mono · labels and coordinates</p>
          <p className="mt-1 font-mono text-[13px]" style={{ color: 'var(--st-survey)' }}>
            12.9716&deg; N, 77.5946&deg; E · BENGALURU URBAN
          </p>
        </div>
      </div>

      {/* --- motion proof ----------------------------------------------- */}
      <hr className="story-rule my-12" />
      <div data-proof className="pb-24">
        <p className="story-label">Motion backbone · scroll to drive</p>

        <div className="relative mt-6 h-24 overflow-hidden rounded-lg" style={{ background: 'var(--st-ridge)' }}>
          {[3, 2, 1].map((d) => (
            <div
              key={d}
              data-plane={d}
              className="absolute inset-x-0 font-mono"
              style={{
                top: `${18 + (3 - d) * 22}%`,
                color: d === 1 ? 'var(--st-blown)' : 'var(--st-survey)',
                fontSize: d === 1 ? '15px' : '12px',
                paddingLeft: `${d * 8}%`,
              }}
            >
              depth plane {d}
            </div>
          ))}
        </div>

        <p className="story-label mt-8">Scrubbed growth · the Act 2 mechanic</p>
        <div className="mt-3 h-10 w-full overflow-hidden rounded" style={{ background: 'var(--st-ridge)' }}>
          <div
            data-proof-bar
            className="h-full w-full origin-left"
            style={{ background: `linear-gradient(90deg, var(--st-sodium-dim), var(--st-blown))` }}
          />
        </div>
        <p className="story-body mt-3" style={{ fontSize: 'var(--st-body)' }}>
          Growth is tied to scroll position, not to a timer — the viewer drives it.
          Three planes above move at different rates to confirm parallax reads as
          depth rather than drift.
        </p>
      </div>
    </div>
  )
}
