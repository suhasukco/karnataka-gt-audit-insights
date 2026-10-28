import { useEffect, useRef } from 'react'
import { Radar, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { fadeUpInView, EASE_OUT } from '@/lib/motion'

// Two, not five. The other three — commercial activity, road network, points of
// interest — are *inputs* to these two; listing them alongside the outcomes read
// as a feature list and pushed the demo into a third of the width. These are
// what the spatial layer actually produces.
const SPATIAL_POINTS = [
  { icon: Radar, title: 'Retail Catchment Analysis' },
  { icon: TrendingUp, title: 'Market Opportunity Mapping' },
]

export function SpatialAnalytics() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    const video = videoRef.current
    if (!el || !video) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {})
        else video.pause()
      },
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <motion.section
      {...fadeUpInView}
      transition={{ duration: 0.6, ease: EASE_OUT }}
      className="border-t border-[#e6e3da] py-16"
    >
      <p className="font-mono text-[15px] font-semibold uppercase tracking-[0.14em] text-accent-900">
        Spatial Intelligence
      </p>

      <h2 className="mt-4 max-w-2xl font-serif text-[34px] font-semibold leading-[1.12] tracking-tight text-navy-900">
        Location Intelligence Beyond Traditional Market Research
      </h2>

      {/* The demo is the argument this section makes, so it runs the full width
          of the column rather than sharing it with a list. */}
      <div className="relative mt-11">
        <div
          className="pointer-events-none absolute -inset-4 -z-10 rounded-[40px] bg-accent-500/20 opacity-70 blur-3xl"
          aria-hidden
        />

        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-[28px] border border-[#e6e3da] bg-navy-950 shadow-elevated"
        >
          <video
            ref={videoRef}
            src="/videos/spatial-analytics.mp4"
            poster="/videos/spatial-analytics-poster.jpg"
            muted
            loop
            playsInline
            preload="metadata"
            className="aspect-video w-full scale-125 object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-navy-950/60 via-navy-950/0 to-navy-950/10" />
          <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-navy-950/80 px-3.5 py-1.5 text-[12px] font-semibold text-white backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-300" />
            Live Demo
          </span>
        </div>
      </div>

      <div className="mt-9 grid gap-x-14 gap-y-6 sm:grid-cols-2">
        {SPATIAL_POINTS.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.title}
              className="flex items-center gap-4 border-t border-[#ebe8df] pt-5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-50">
                <Icon className="h-4 w-4 text-accent-900" />
              </div>
              <h3 className="text-[17px] font-semibold text-navy-900">
                {item.title}
              </h3>
            </div>
          )
        })}
      </div>
    </motion.section>
  )
}