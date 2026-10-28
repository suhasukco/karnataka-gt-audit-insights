import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";

// Home-only branded loader overlay. It sits above everything (including the
// navbar) while the live census data loads, then lifts and hands off directly
// into the hero's staggered entrance — the loader is the first beat of the
// intro choreography, not a dead pause. The shared dashboard skeleton
// (`PageLoader`) is untouched; the live/* pages still use it.
export function HomeIntro() {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#FAF9F5]"
      initial={{ opacity: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -28 }}
      transition={{ duration: 0.7, ease: EASE_OUT }}
    >
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: 8 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        className="flex h-14 w-14 items-center justify-center rounded-xl bg-navy-900 text-base font-bold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]"
      >
        GT
      </motion.div>

      <motion.p
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.15, ease: EASE_OUT }}
        className="mt-6 font-mono text-[13px] font-semibold uppercase tracking-[0.16em] text-navy-700"
      >
        Karnataka GT Intelligence Report
      </motion.p>

      <div className="mt-8 h-px w-40 overflow-hidden rounded-full bg-[#e6e3da]">
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.05, ease: [0.65, 0, 0.35, 1] }}
          style={{ transformOrigin: "left" }}
          className="h-full w-full bg-accent-900"
        />
      </div>
    </motion.div>
  );
}
