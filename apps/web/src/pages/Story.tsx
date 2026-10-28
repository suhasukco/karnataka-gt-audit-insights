import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { useMediaQuery } from '@/story/useMediaQuery'
import { useSegment } from '@/components/shared/SegmentToggle'
import { useStoryData, formatIndian } from '@/story/storyData'
import { useConstellationPoints } from '@/story/useConstellationPoints'
import { ConstellationFlat } from '@/story/ConstellationFlat'
import { LazyConstellation } from '@/story/LazyConstellation'
import { useCountUp } from '@/story/useCountUp'
import { useLenis } from '@/story/useLenis'
import '@/story/story.css'

gsap.registerPlugin(ScrollTrigger)

/**
 * Karnataka GT Intelligence — Acts 0-2.
 *
 * One scroll, three beats: the count, the territory, the concentration. The
 * constellation is a single fixed layer behind all three; the acts only change
 * two scalars on it (spread, focus) rather than mounting a canvas per scene.
 *
 * Every figure is live and segment-aware. Nothing here is transcribed, which is
 * why Act 2's headline is assembled from the data — "6 in 10" is true for the
 * whole census and false for Tier 2, so the sentence has to be computed.
 */
export default function Story() {
  const root = useRef<HTMLDivElement>(null)
  const [segment] = useSegment()
  const { data } = useStoryData(segment)
  const { geometry } = useConstellationPoints(segment)

  // The single channel between scroll and WebGL. Mutated by ScrollTrigger,
  // read in useFrame — so scrolling never triggers a React render.
  const driver = useRef({ spread: 0, focus: 0 })

  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isSmall = useMediaQuery('(max-width: 767px)')
  // WebGL is for pointer-driven desktop only. Phones and reduced-motion get the
  // resolved 2D field, which states the same thing without a morph to steer.
  const useWebGL = !isSmall && !reduce

  useLenis(!reduce)

  const totalRef = useCountUp(data?.totalOutlets ?? null, { immediate: true, delay: 0.35 })
  const districtsRef = useCountUp(data?.districtsCovered ?? null, { duration: 1.4 })
  const taluksRef = useCountUp(data?.taluks ?? null, { duration: 1.6 })
  const leaderRef = useCountUp(data?.leader?.outlets ?? null, { duration: 2 })

  useGSAP(
    () => {
      if (!data) return
      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: reduce)', () => {
        // Resolved, immediately. Every insight is still on screen.
        driver.current = { spread: 1, focus: 1 }
        gsap.set('[data-act-copy]', { autoAlpha: 1, y: 0 })
        gsap.set('[data-bar-fill]', { scaleX: (i, t) => Number(t.dataset.share) })
      })

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // ---- Act 0 -> 1 : the field resolves into territory --------------
        gsap.to(driver.current, {
          spread: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: '[data-act="territory"]',
            start: 'top bottom',
            end: 'center center',
            scrub: 1,
          },
        })

        // Cold-open copy lifts away as the viewer commits to scrolling.
        gsap.to('[data-act="cold"] [data-act-copy]', {
          autoAlpha: 0,
          y: -40,
          ease: 'none',
          scrollTrigger: {
            trigger: '[data-act="cold"]',
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        })

        gsap.utils.toArray<HTMLElement>('[data-act] [data-act-copy]').forEach((el) => {
          if (el.closest('[data-act="cold"]')) return
          gsap.from(el, {
            autoAlpha: 0,
            y: 34,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 82%', once: true },
          })
        })

        // ---- Act 2 : the reveal ------------------------------------------
        // Pinned, and the bars are scrubbed so the viewer feels the
        // disproportion accumulate under their own hand rather than watching it.
        const bars = gsap.utils.toArray<HTMLElement>('[data-bar-fill]')
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: '[data-act="reveal"]',
            start: 'top top',
            end: '+=220%',
            pin: '[data-reveal-stage]',
            scrub: 1,
          },
        })

        // Every bar except the leader grows first, and quickly — they establish
        // the scale that the leader is about to break.
        tl.to(bars.slice(1), {
          scaleX: (i, t) => Number(t.dataset.share),
          stagger: 0.06,
          ease: 'power2.out',
          duration: 1,
        })
        // Then the leader, alone, over three times the distance — the pause is
        // the point.
        tl.to(
          bars[0],
          { scaleX: Number(bars[0]?.dataset.share ?? 1), ease: 'power1.inOut', duration: 3 },
          '>-0.2',
        )
        // Focus rides the leader's growth, so the constellation blows out in the
        // same gesture as the bar.
        tl.to(driver.current, { focus: 1, ease: 'none', duration: 3 }, '<')
        tl.from('[data-reveal-claim]', { autoAlpha: 0, y: 26, duration: 0.8 }, '>-0.9')
      })

      return () => mm.revert()
    },
    { scope: root, dependencies: [data, geometry] },
  )

  const leader = data?.leader ?? null
  // Bars are drawn relative to the leader, not to the axis max, so the leader
  // fills its track and every other bar is honestly dwarfed by comparison.
  const maxOutlets = leader?.outlets ?? 1
  const topDistricts = data?.districts.slice(0, 8) ?? []

  return (
    <div ref={root} className="story relative">
      {/* One constellation behind every act. Fixed, so the acts scroll over a
          continuous field rather than each owning a canvas. */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {geometry &&
          (useWebGL ? (
            <LazyConstellation geometry={geometry} driver={driver} />
          ) : (
            <ConstellationFlat geometry={geometry} focus={reduce ? 1 : 0.55} />
          ))}
        {/* Vignette: keeps type legible over the brightest part of the field. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 90% at 50% 45%, transparent 30%, rgba(4,3,12,0.62) 78%, rgba(4,3,12,0.9) 100%)',
          }}
        />
      </div>

      <div className="relative z-10">
        {/* ================= ACT 0 — COLD OPEN ========================= */}
        <section
          data-act="cold"
          className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
        >
          <div data-act-copy>
            <p className="story-label">The Karnataka general-trade census</p>
            <span
              ref={totalRef}
              className="story-figure mt-6 block"
              style={{ fontSize: 'var(--st-figure-hero)' }}
            >
              0
            </span>
            <p
              className="story-display mx-auto mt-8 max-w-2xl"
              style={{ fontSize: 'var(--st-display-md)' }}
            >
              Every general-trade outlet in Karnataka. Counted.
            </p>
          </div>

          <div className="absolute bottom-10 flex flex-col items-center gap-3">
            <p className="story-label">Scroll</p>
            <span
              aria-hidden
              className="block h-10 w-px"
              style={{
                background: 'linear-gradient(180deg, var(--st-survey), transparent)',
              }}
            />
          </div>
        </section>

        {/* ================= ACT 1 — THE TERRITORY ===================== */}
        <section
          data-act="territory"
          className="flex min-h-screen flex-col justify-center px-6 sm:px-12 lg:px-24"
        >
          <div data-act-copy className="max-w-3xl">
            <p className="story-label">The territory</p>
            <h2 className="story-display mt-5" style={{ fontSize: 'var(--st-display-lg)' }}>
              Not a sample. The whole state, outlet by outlet.
            </h2>
            <p className="story-body mt-6">
              Field teams walked every taluk headquarters and the villages around
              them, geocoding each outlet on site rather than assigning it to a
              district by postal code.
            </p>

            <div className="mt-12 flex flex-wrap gap-x-16 gap-y-8">
              <div>
                <span className="story-figure block" style={{ fontSize: 'var(--st-figure-lg)' }}>
                  <span ref={districtsRef}>0</span>
                  <span style={{ color: 'var(--st-survey)' }}>/{data?.districtsTotal ?? 31}</span>
                </span>
                <p className="story-label mt-3">districts reached</p>
              </div>
              <div>
                <span
                  ref={taluksRef}
                  className="story-figure block"
                  style={{ fontSize: 'var(--st-figure-lg)' }}
                >
                  0
                </span>
                <p className="story-label mt-3">taluks represented</p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= ACT 2 — THE REVEAL ======================== */}
        <section data-act="reveal">
          <div
            data-reveal-stage
            className="flex min-h-screen flex-col justify-center px-6 sm:px-12 lg:px-24"
          >
            <div data-act-copy className="max-w-3xl">
              <p className="story-label">The concentration</p>
              <h2 className="story-display mt-5" style={{ fontSize: 'var(--st-display-lg)' }}>
                Then you rank the districts.
              </h2>
            </div>

            <div className="mt-12 w-full max-w-4xl">
              {/* Text equivalent, so the story is not locked behind motion. */}
              <table className="story-sr-only">
                <caption>Outlets by district, top 8</caption>
                <tbody>
                  {topDistricts.map((d) => (
                    <tr key={d.district}>
                      <th scope="row">{d.district}</th>
                      <td>{formatIndian(d.outlets)} outlets</td>
                      <td>{d.pct}% of the segment</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="space-y-3" aria-hidden>
                {topDistricts.map((d, i) => (
                  <li key={d.district} className="flex items-center gap-4">
                    <span
                      className="w-32 shrink-0 truncate font-mono text-[12px] uppercase tracking-[0.12em]"
                      style={{ color: i === 0 ? 'var(--st-blown)' : 'var(--st-survey)' }}
                    >
                      {d.district}
                    </span>
                    <span className="relative h-6 flex-1 overflow-hidden rounded-sm">
                      <span
                        className="absolute inset-0"
                        style={{ background: 'var(--st-ridge)', opacity: 0.55 }}
                      />
                      <span
                        data-bar-fill
                        data-share={(d.outlets / maxOutlets).toFixed(4)}
                        className="absolute inset-y-0 left-0 w-full origin-left"
                        style={{
                          transform: 'scaleX(0)',
                          background:
                            i === 0
                              ? 'linear-gradient(90deg, var(--st-sodium), var(--st-blown))'
                              : 'var(--st-sodium-dim)',
                        }}
                      />
                    </span>
                    <span
                      className="w-24 shrink-0 text-right font-mono text-[12.5px]"
                      style={{ color: i === 0 ? 'var(--st-blown)' : 'var(--st-muted)' }}
                    >
                      {formatIndian(d.outlets)}
                    </span>
                  </li>
                ))}
              </ul>

              <div data-reveal-claim className="mt-14">
                <hr className="story-rule" />
                <span
                  ref={leaderRef}
                  className="story-figure mt-8 block"
                  style={{ fontSize: 'var(--st-figure-lg)' }}
                >
                  0
                </span>
                <p
                  className="story-display mt-5 max-w-2xl"
                  style={{ fontSize: 'var(--st-display-md)' }}
                >
                  {leader
                    ? `Nearly ${data?.leaderPerTen} in 10 outlets sit in ${leader.district} alone.`
                    : ''}
                </p>
                <p className="story-body mt-4">
                  {leader
                    ? `${leader.pct}% of every outlet in this view, inside one district of ${data?.districtsTotal}.`
                    : ''}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Acts 3-5 land here next. */}
        <section className="flex min-h-[60vh] items-center justify-center">
          <p className="story-label">Acts 3–5 · next pass</p>
        </section>
      </div>
    </div>
  )
}
