import { useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { Play } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

/**
 * A statement page, not a dashboard. The four live pages carry the evidence;
 * this one exists to say the finding.
 *
 * Each claim splits so the sentence can perform its own logic: `hollow` is set
 * as an outline with no fill — the unstocked shelf — and `solid` is set in
 * brand ink. Same face, same size, same weight; only the fill differs, because
 * the gap and the asset are the same measurement read two ways.
 *
 * Add the next finding to this array; the numbering follows the order.
 *
 * `lines` is the argument in prose — two sentences, no more. The claim above is
 * the assertion; these say why it holds. `film` is optional: a claim only earns
 * one when there is footage that argues the same thing.
 */
const INSIGHTS = [
  {
    hollow: 'Availability',
    solid: 'is the opportunity.',
    lines: [
      'Awareness arrived ahead of distribution. The internet has already made villages and small towns fluent in premium brands, and the aspiration to buy them is in place.',
      'What is missing is the shelf, not the demand. Put the product within reach of that aspiration and the opportunity converts itself.',
    ],
    film: {
      src: '/videos/availability-is-opportunity.mp4',
      poster: '/videos/availability-is-opportunity-poster.jpg',
      caption: 'A customer finds online what his village shop does not stock — until it does.',
    },
  },
]

/** accent-900. Inline because GSAP tweens a literal value, not a CSS token. */
const INK = '#0b0445'
/** The same ink at zero alpha — the drain's end colour. */
const INK_FADED = 'rgba(11, 4, 69, 0)'

/**
 * Poster first, film on request.
 *
 * `preload="none"` is the whole point: the source is ~12MB, and this page opens
 * on a claim rather than on the film, so most readers will never press play.
 * Only the poster (~65KB) crosses the wire until they do.
 */
function Film({
  src,
  poster,
  caption,
}: {
  src: string
  poster: string
  caption: string
}) {
  const video = useRef<HTMLVideoElement>(null)
  // Latches on first play and stays true. Tying this to paused state instead
  // would drop the reader back to the poster-and-play-button state every time
  // they paused, which reads as the film having been reset.
  const [started, setStarted] = useState(false)

  return (
    <figure data-reveal data-film className="mt-14">
      <div className="relative overflow-hidden rounded-card bg-accent-900 shadow-card">
        <video
          ref={video}
          src={src}
          poster={poster}
          preload="none"
          controls={started}
          playsInline
          className="block aspect-video w-full"
          onPlay={() => setStarted(true)}
        />

        {!started && (
          <button
            type="button"
            onClick={() => void video.current?.play()}
            aria-label="Play film"
            className="group absolute inset-0 grid place-items-center bg-accent-900/25 transition-colors hover:bg-accent-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
          >
            <span className="grid h-20 w-20 place-items-center rounded-full bg-white/95 shadow-card transition-transform duration-300 group-hover:scale-105">
              {/* Nudged right: the glyph's optical centre sits left of its box. */}
              <Play
                className="ml-1 h-7 w-7 fill-accent-900 text-accent-900"
                strokeWidth={1.5}
              />
            </span>
          </button>
        )}
      </div>

      <figcaption className="mt-4 font-mono text-[12px] uppercase tracking-[0.16em] text-slate-500">
        {caption}
      </figcaption>
    </figure>
  )
}

export default function Insights() {
  const root = useRef<HTMLDivElement>(null)
  const single = INSIGHTS.length === 1

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add(
        {
          reduced: '(prefers-reduced-motion: reduce)',
          motionOk: '(prefers-reduced-motion: no-preference)',
          // Mirrors the `sm` breakpoint that `.type-hollow` uses. The drain
          // MUST be gated on this: GSAP writes inline styles, and inline beats
          // a media query — without the gate the tween re-applied the outline
          // on phones and silently defeated the solid fallback. matchMedia
          // reverts those inline styles when the query stops matching.
          isWide: '(min-width: 641px)',
        },
        (ctx) => {
          const { reduced, isWide } = ctx.conditions as {
            reduced: boolean
            isWide: boolean
          }

          // One timeline per claim, each with its own trigger. Page-wide
          // selectors would animate every claim at once on mount, so any claim
          // below the fold would finish before the reader ever reached it.
          // toArray yields document order, which is also the order ScrollTrigger
          // wants them created in.
          const sections = gsap.utils.toArray<HTMLElement>('[data-insight]')

          sections.forEach((section) => {
            const q = gsap.utils.selector(section)

            if (reduced) {
              gsap.from(q('[data-reveal]'), {
                autoAlpha: 0,
                duration: 0.4,
                stagger: 0.06,
                ease: 'none',
                scrollTrigger: { trigger: section, start: 'top 85%', once: true },
              })
              return
            }

            // ScrollTrigger belongs on the timeline, never on a child tween.
            // A discrete reveal, so `once` rather than `scrub` — the two are
            // different behaviours and must not be combined.
            const tl = gsap.timeline({
              defaults: { ease: 'power3.out', duration: 0.8 },
              scrollTrigger: { trigger: section, start: 'top 75%', once: true },
            })

            tl.from(q('[data-label]'), { autoAlpha: 0, y: 12, duration: 0.5 })
              .from(
                q('[data-rule]'),
                { scaleX: 0, transformOrigin: 'left center' },
                '-=0.3',
              )
              // Arrives stocked — solid ink, because the drain below renders its
              // start state immediately.
              .from(q('[data-hollow]'), { autoAlpha: 0, y: 28 }, '-=0.45')
              // Anchor. Everything after this is positioned against the moment
              // the word is fully stocked, rather than against whatever tween
              // happened to run last — so the drain being present or absent no
              // longer changes what the following offsets mean.
              .addLabel('stocked')

            if (isWide) {
              // The drain. Fill empties to nothing while the outline draws in,
              // so the word is left as the gap it describes. This is the whole
              // point of the page, so it gets the longest beat and an inOut ease.
              //
              // fromTo, not from: `from()` writes its start value inline, which
              // then shadows the stroke width in `.type-hollow`, so GSAP reads
              // the end value back as 0 and tweens 0 → 0 — an invisible word.
              //
              // Read `--hollow-stroke`, NOT `-webkit-text-stroke-width`. This
              // tween writes the stroke width inline, so on any re-run of the
              // handler (React re-mounts it twice in dev) reading the real
              // property returns this animation's own start value of 0. The
              // custom property is never written by GSAP, so it stays truthful
              // while keeping `.type-hollow` the single source of truth.
              const el = q('[data-hollow]')[0]
              const restStroke =
                (el &&
                  getComputedStyle(el)
                    .getPropertyValue('--hollow-stroke')
                    .trim()) ||
                '2px'

              tl.fromTo(
                q('[data-hollow]'),
                { webkitTextStrokeWidth: '0px', color: INK },
                {
                  webkitTextStrokeWidth: restStroke,
                  // Not `transparent`: that resolves to rgba(0,0,0,0), so the
                  // fill would drift toward black on its way out. Fading within
                  // the ink's own hue keeps the drain clean.
                  color: INK_FADED,
                  duration: 1.2,
                  ease: 'power2.inOut',
                },
                'stocked-=0.2',
              )
            }

            // The payoff. Both offsets hang off the same anchor, so neither is a
            // number computed to compensate for the other branch: with the drain
            // it lands partway through, letting the emptying and the payoff
            // overlap; without one there is nothing to wait for, so it rides the
            // entrance instead.
            tl.from(
              q('[data-solid]'),
              { autoAlpha: 0, y: 28, duration: 0.9 },
              isWide ? 'stocked+=0.45' : 'stocked-=0.45',
            )
              // The argument and its evidence follow the claim rather than
              // accompanying it — the reader should have finished the sentence
              // before either arrives. Both overlap the tween before them so
              // the sequence stays one movement instead of four separate beats.
              .from(
                q('[data-copy]'),
                { autoAlpha: 0, y: 16, duration: 0.6, stagger: 0.12 },
                '-=0.45',
              )
              .from(
                q('[data-film]'),
                { autoAlpha: 0, y: 24, duration: 0.8 },
                '-=0.35',
              )
          })
        },
        root,
      )

      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    /* One claim used to be centred on the viewport, because a claim on its own
       left a screen of dead space beneath it. A claim carrying its argument and
       a film is taller than the viewport, so `justify-center` no longer has any
       slack to distribute — it needs padding instead, or it sits flush against
       the chrome. Several claims are a scroll, so they keep their own rhythm. */
    <div
      ref={root}
      className={single ? 'py-[10vh]' : 'space-y-[38vh] py-[16vh]'}
    >
      {INSIGHTS.map((claim, i) => (
        <section
          key={claim.hollow}
          data-insight
          className="mx-auto w-full max-w-5xl"
        >
          {/* The label is the only chrome. The sidebar already says Insights,
              so a page title would just repeat it. */}
          <p
            data-reveal
            data-label
            className="font-mono text-[12px] font-medium uppercase tracking-[0.28em] text-slate-600"
          >
            Insight {String(i + 1).padStart(2, '0')}
          </p>

          <hr
            data-reveal
            data-rule
            className="mt-5 border-0 border-t border-accent-900/15"
          />

          <h2
            className="mt-10 font-display font-bold leading-[0.94] tracking-[-0.03em]"
            style={{ fontSize: 'clamp(2.75rem, 9vw, 7.5rem)' }}
          >
            <span data-reveal data-hollow className="type-hollow block">
              {claim.hollow}
            </span>
            <span data-reveal data-solid className="mt-1 block text-accent-900">
              {claim.solid}
            </span>
          </h2>

          {/* Measure is capped well inside the headline's width: the claim is
              meant to be read across, the argument down. */}
          <div className="mt-10 max-w-2xl space-y-4">
            {claim.lines.map((line) => (
              <p
                key={line}
                data-reveal
                data-copy
                className="text-[17px] leading-relaxed text-slate-600"
              >
                {line}
              </p>
            ))}
          </div>

          {claim.film && <Film {...claim.film} />}
        </section>
      ))}
    </div>
  )
}
