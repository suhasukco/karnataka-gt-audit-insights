import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { fadeUpInView } from '@/lib/motion'

const SLIDES = [
  { src: '/videos/kirana-store.mp4', poster: '/videos/kirana-store-poster.jpg', label: 'Kirana Store', accent: '#D97706' },
  { src: '/videos/supermarket.mp4', poster: '/videos/supermarket-poster.jpg', label: 'Modern Supermarket', accent: '#2563EB' },
]

// How long each slide holds before auto-advancing — independent of the clip's
// own (much shorter) length, which just loops underneath until the slide's turn is up.
const SLIDE_MS = 7000

const slideVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction > 0 ? 56 : -56, scale: 1.03 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (direction: number) => ({ opacity: 0, x: direction > 0 ? -56 : 56, scale: 0.97 }),
}

export function VideoShowcase() {
  const [[index, direction], setIndexed] = useState<[number, number]>([0, 1])
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(true)
  const [progress, setProgress] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef(0)
  const playingRef = useRef(playing)
  const mutedRef = useRef(muted)
  playingRef.current = playing
  mutedRef.current = muted

  const slide = SLIDES[index]

  const goTo = useCallback((nextIndex: number, dir: number) => {
    progressRef.current = 0
    setProgress(0)
    setIndexed([((nextIndex % SLIDES.length) + SLIDES.length) % SLIDES.length, dir])
  }, [])

  // Drives both the slide auto-advance and the story-bar fill. Runs on rAF
  // (not a slide-length setTimeout) so pausing mid-slide resumes from the
  // exact same point instead of restarting the bar.
  useEffect(() => {
    if (!playing) return
    let raf: number
    let last = performance.now()

    const tick = (now: number) => {
      const delta = now - last
      last = now
      progressRef.current = Math.min(100, progressRef.current + (delta / SLIDE_MS) * 100)
      setProgress(progressRef.current)
      if (progressRef.current >= 100) {
        goTo(index + 1, 1)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, index, goTo])

  // Only run the <video> while the showcase is actually on screen.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setPlaying(entry.isIntersecting), { threshold: 0.15 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Slide changed — restart the new clip from 0. Reads playing/muted via refs
  // so this effect fires ONLY on index change, not on every pause/mute toggle.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = mutedRef.current
    v.currentTime = 0
    if (playingRef.current) v.play().catch(() => {})
  }, [index])

  // Play/pause toggled (manual button or scroll-into-view).
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    // Set the DOM property imperatively — React's `muted` JSX attribute doesn't
    // always sync to it in time for the browser's autoplay-without-audio check,
    // which silently blocks .play() otherwise.
    v.muted = muted
    if (playing) v.play().catch(() => {})
    else v.pause()
  }, [playing, muted])

  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  return (
    <section>
      <div className="mb-5">
        {/* Placeholder copy — swap once the final headline/subcopy is decided. */}
        <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-blue-700">
          <span className="h-1 w-1 rounded-full bg-blue-600" />
          Field Footage
        </p>
        <h2 className="font-serif text-[25px] font-semibold tracking-tight text-navy-900">The Two Faces of Karnataka Retail</h2>
        <p className="mt-1 text-[15px] text-slate-500">Traditional kirana stores and modern supermarkets — the same census, two very different formats.</p>
      </div>

      <motion.div
        ref={containerRef}
        {...fadeUpInView}
        className="group relative aspect-video overflow-hidden rounded-[28px] bg-navy-950 shadow-elevated"
      >
        <div
          className="pointer-events-none absolute -inset-1 -z-10 rounded-4xl opacity-20 blur-2xl transition-colors duration-700"
          style={{ background: slide.accent }}
          aria-hidden
        />

        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={slide.label}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            <video
              ref={videoRef}
              src={slide.src}
              poster={slide.poster}
              muted={muted}
              loop
              playsInline
              autoPlay
              preload="metadata"
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-navy-950/85 via-navy-950/0 to-navy-950/25" />
            <span
              className="absolute left-6 top-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-white shadow-[0_4px_12px_-2px_rgba(0,0,0,0.4)] backdrop-blur-sm"
              style={{ background: `${slide.accent}cc` }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              {slide.label}
            </span>
          </motion.div>
        </AnimatePresence>

        <div className="pointer-events-none absolute inset-0 rounded-[28px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" />

        {/* Prev / next — reveal on hover, like a landing-page hero slider */}
        <button
          onClick={() => goTo(index - 1, -1)}
          className="absolute left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white opacity-0 ring-1 ring-inset ring-white/20 backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-white/20 group-hover:opacity-100"
          aria-label="Previous video"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => goTo(index + 1, 1)}
          className="absolute right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white opacity-0 ring-1 ring-inset ring-white/20 backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-white/20 group-hover:opacity-100"
          aria-label="Next video"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Controls + story-bar slide indicators */}
        <div className="absolute inset-x-6 bottom-6 z-10 flex items-center gap-4">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-inset ring-white/20 backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-white/20"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="ml-0.5 h-4 w-4" fill="currentColor" />}
          </button>

          <div className="flex flex-1 items-center gap-2">
            {SLIDES.map((s, i) => (
              /* The track reads as 4px, but a 4px-tall tap target is the
                 smallest control in the product. `py-5` pads the button out
                 to 44px around an unchanged 4px track, so the bar looks
                 identical and can still be hit with a thumb. */
              <button
                key={s.label}
                onClick={() => goTo(i, i > index ? 1 : -1)}
                className="group flex-1 rounded-sm py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                aria-label={`Go to ${s.label}`}
                aria-current={i === index}
              >
                <span className="block h-1 overflow-hidden rounded-full bg-white/20 transition-colors duration-200 group-hover:bg-white/30">
                  <span
                    className="block h-full rounded-full bg-white"
                    style={{
                      width: i < index ? '100%' : i === index ? `${progress}%` : '0%',
                    }}
                  />
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={toggleMute}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-inset ring-white/20 backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-white/20"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </motion.div>
    </section>
  )
}
