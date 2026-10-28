import { Banknote, Building2, Landmark, ShoppingBag, TrendingUp, Truck } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { fadeUpInView, fadeUpInViewDelay, tiltUpInViewDelay } from '@/lib/motion'

// Audience names only. Each carried a sentence explaining what that reader
// would do with the census; six of them turned a six-tile grid into six
// paragraphs, and the section heading already states the premise.
const AUDIENCES = [
  { title: 'D2C & FMCG Brands', icon: ShoppingBag },
  { title: 'Distribution Companies', icon: Truck },
  { title: 'Manufacturers & Retail Chains', icon: Building2 },
  { title: 'Investors & Private Equity', icon: TrendingUp },
  { title: 'Government & Public Sector', icon: Landmark },
  { title: 'Consulting Firms', icon: Banknote },
]

export function AudienceGrid() {
  const reduce = useReducedMotion()

  return (
    <section className="border-t border-[#e6e3da] pt-14">
      <motion.div {...fadeUpInView} className="mb-10 max-w-2xl">
        <p className="font-mono text-[15.5px] font-semibold uppercase tracking-[0.14em] text-accent-900">Who This Is Built For</p>
        <h2 className="mt-3 font-serif text-[30px] font-semibold leading-[1.15] tracking-tight text-navy-900 sm:text-[34px]">
          Built for the Decisions That Depend on Real Retail Data
        </h2>
      </motion.div>

      {/* Row gap tightened from 9 to 7 — the tiles lost their paragraphs and the
          original spacing left them stranded from their own top rule. */}
      <div className="grid grid-cols-1 gap-x-10 gap-y-7 perspective-distant sm:grid-cols-2 lg:grid-cols-3">
        {AUDIENCES.map((a, i) => (
          <motion.div
            key={a.title}
            {...(reduce ? fadeUpInViewDelay(i, 0.06) : tiltUpInViewDelay(i, 0.07))}
            className="group relative border-t border-[#e6e3da] pt-5 transform-3d transition-transform duration-300 ease-out hover:-translate-y-1"
          >
            <span className="pointer-events-none absolute -top-px left-0 h-px w-0 bg-accent-900 transition-[width] duration-500 ease-out group-hover:w-full" />

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-50 transition-colors duration-300 group-hover:bg-accent-900">
              <a.icon className="h-5 w-5 text-navy-700 transition-colors duration-300 group-hover:text-white" strokeWidth={1.75} />
            </div>

            <h3 className="mt-3.5 max-w-[16ch] text-[19.5px] font-semibold leading-snug text-navy-900">
              {a.title}
            </h3>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
