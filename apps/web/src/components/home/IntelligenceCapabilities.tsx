import { useEffect, useRef } from 'react'
import {
  Compass,
  Layers,
  MapPinned,
  Route,
  ShieldCheck,
  Snowflake,
  Tags,
  Waypoints,
} from 'lucide-react'

// Named capabilities only. Each one previously carried a paragraph explaining
// itself; eight of those turned a scannable grid into a page of reading, and
// the section heading already frames what the list is.
interface Capability {
  title: string
  icon: typeof Compass
}

const CAPABILITIES: Capability[] = [
  { title: 'Market Opportunity Intelligence', icon: Compass },
  { title: 'Retail Infrastructure Intelligence', icon: Snowflake },
  { title: 'Category Intelligence', icon: Tags },
  { title: 'Brand Presence Intelligence', icon: ShieldCheck },
  { title: 'Distribution & Route Intelligence', icon: Route },
  { title: 'Store Classification Intelligence', icon: Layers },
  { title: 'White Space Intelligence', icon: Waypoints },
  { title: 'Consumer Catchment Intelligence', icon: Waypoints },
]

// function CatchmentSpotlight() {
//   const videoRef = useRef<HTMLVideoElement>(null)
//   const containerRef = useRef<HTMLDivElement>(null)

//   useEffect(() => {
//     const el = containerRef.current
//     const video = videoRef.current
//     if (!el || !video) return
//     const observer = new IntersectionObserver(
//       ([entry]) => {
//         if (entry.isIntersecting) video.play().catch(() => {})
//         else video.pause()
//       },
//       { threshold: 0.4 },
//     )
//     observer.observe(el)
//     return () => observer.disconnect()
//   }, [])

//   return (
//     <div className="mb-9 grid gap-8 border-t border-[#e6e3da] pt-9 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
//       <div>
//         <MapPinned className="h-5 w-5 text-accent-900" strokeWidth={1.75} />
//         <h3 className="mt-3.5 text-[17px] font-semibold leading-snug text-navy-900">Consumer Catchment Intelligence</h3>
//         <p className="mt-2.5 max-w-sm text-[18px] leading-relaxed text-slate-500">
//           A live radius query over real outlet coordinates — the outlet mix and density surrounding any point, not a
//           modeled demographic proxy. Every cluster below is a real, geocoded count.
//         </p>
//       </div>

//       <div ref={containerRef} className="relative aspect-video overflow-hidden rounded-xl bg-navy-950">
//         <video
//           ref={videoRef}
//           src="/videos/spatial-analytics.mp4"
//           poster="/videos/spatial-analytics-poster.jpg"
//           muted
//           loop
//           playsInline
//           preload="metadata"
//           className="h-full w-full scale-125 object-cover"
//         />
//         <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-navy-950/80 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm">
//           <span className="h-1.5 w-1.5 rounded-full bg-accent-300" />
//           Live Demo
//         </span>
//       </div>

//     </div>
//   )
// }

export function IntelligenceCapabilities() {
  return (
    <section className="border-t border-[#e6e3da] pt-14">
      <div className="mb-10 max-w-2xl">
        <p className="font-mono text-[18.5px] font-semibold uppercase tracking-[0.14em] text-accent-900">Intelligence, Not Dashboards</p>
        <h2 className="mt-3 font-serif text-[30px] font-semibold leading-[1.15] tracking-tight text-navy-900 sm:text-[34px]">
          What Strategic Decisions This Research Makes Possible
        </h2>
        {/* <p className="mt-3 text-[18.5px] leading-relaxed text-slate-600">
          Every capability below is built from the census itself — not a demonstration, a description of what the underlying data already supports.
        </p> */}
      </div>

      {/* <CatchmentSpotlight /> */}

      {/* Row gap tightened from 9 to 7: without the paragraphs the cards are a
          third of their old height, and the original spacing left them adrift. */}
      <div className="grid grid-cols-1 gap-x-10 gap-y-7 border-t border-[#e6e3da] pt-9 sm:grid-cols-2 lg:grid-cols-4">
        {CAPABILITIES.map((c) => (
          <div key={c.title}>
            <c.icon className="h-5 w-5 text-accent-900" strokeWidth={1.75} />
            <h3 className="mt-3.5 max-w-[18ch] text-[19.5px] font-semibold leading-snug text-navy-900">
              {c.title}
            </h3>
          </div>
        ))}
      </div>
    </section>
  )
}
