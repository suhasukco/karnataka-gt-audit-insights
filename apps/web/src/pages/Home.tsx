import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Cpu, MapPinned, Tag, TrendingUp } from "lucide-react";
import { VideoShowcase } from "@/components/shared/VideoShowcase";
import { LensCard } from "@/components/shared/LensCard";
import { IntelligenceCapabilities } from "@/components/home/IntelligenceCapabilities";
import { BusinessQuestions } from "@/components/home/BusinessQuestions";
import { AudienceGrid } from "@/components/home/AudienceGrid";
import { HomeIntro } from "@/components/home/HomeIntro";
import { HeroCinematic } from "@/components/home/HeroCinematic";
import { CategoryCarousel } from "@/components/home/CategoryCarousel";
import { LiveErrorState } from "@/components/shared/LiveDataState";
import { useLiveQuery } from "@/lib/useLiveQuery";
import * as api from "@/lib/liveApi";
import { SURVEY_META } from "@/data/constants";
import { formatNumber, formatPercent } from "@/lib/utils";
import { CATEGORICAL } from "@/lib/palette";
import { EASE_OUT } from "@/lib/motion";
import { fadeUpInView, fadeUpInViewDelay } from "@/lib/motion";
import { SpatialAnalytics } from "@/components/home/SpatialAnalytics";
import type { DistrictGeo, InfraSummary } from "@/lib/liveApi";

// How long the branded intro is guaranteed to stay on screen, even if the live
// data resolves instantly from cache — so the loader → hero handoff always
// reads as choreography rather than a flicker.
const INTRO_MIN_MS = 1100;

// Figure plus claim, nothing more. The prose that used to sit under each stat
// repeated what the surrounding section already argues, and five paragraphs of
// it turned a scannable band of facts into a wall to read.
const GT_DOMINANCE_POINTS = [
  { stat: "65%", title: "GT still controls most of India's FMCG sales" },
  { stat: "70%+", title: "Rural and Tier-2/3 India runs on GT" },
  { stat: "5–6%", title: "GT keeps compounding, not shrinking" },
  { stat: "~15%", title: "Modern trade, e-commerce and q-commerce, combined" },
  { stat: "GT + Digital", title: "The real shift is convergence, not replacement" },
];

const METHODOLOGY_STEPS = [
  {
    title: "Door-to-door field audit",
    body: "Every taluk headquarters and surrounding villages, outlet by outlet — not a sample, a census.",
  },
  {
    title: "GPS geocoding",
    body: "Every outlet located precisely on the ground — not assigned to a district by postal code.",
  },
  {
    title: `${SURVEY_META.dataPointsPerOutlet}+ data points per outlet`,
    body: "Infrastructure, category, digital-readiness and brand signals, captured on-site at every visit.",
  },
];

// Desktop-only gate for scroll-scrubbed motion. On phones the figure barely
// travels relative to the viewport, so the parallax reads as jitter rather than
// depth — mobile and reduced-motion users get the plain static image.
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

export default function Home() {
  const geo = useLiveQuery(api.getDistrictsGeo);
  const infra = useLiveQuery(api.getInfrastructureSummary);
  const opportunity = useLiveQuery(api.getOpportunityDistricts);

  // The branded intro stays up until BOTH the data is ready AND a minimum beat
  // has elapsed, then lifts and hands off into the hero entrance.
  const [minElapsed, setMinElapsed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), INTRO_MIN_MS);
    return () => clearTimeout(t);
  }, []);

  const loading = geo.loading || infra.loading || opportunity.loading;
  const dataReady = !loading && !geo.error && !!geo.data;
  const introDone = dataReady && minElapsed;

  if (!loading && (geo.error || !geo.data))
    return <LiveErrorState message={geo.error ?? "No data returned"} />;

  return (
    <>
      <AnimatePresence>{!introDone && <HomeIntro key="intro" />}</AnimatePresence>
      {dataReady && geo.data && (
        <HomeContent
          geo={geo.data}
          infra={infra.data ?? null}
          introDone={introDone}
        />
      )}
    </>
  );
}

interface HomeContentProps {
  geo: DistrictGeo[];
  infra: InfraSummary | null;
  introDone: boolean;
}

// Staggered hero entrance — the second beat of the intro choreography. Gated on
// `introDone` so it fires exactly as the branded overlay lifts, reading as one
// continuous motion rather than two separate mounts.
const heroStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.08 } },
};
const heroItem = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_OUT },
  },
};
// Reduced-motion users get the same staggered reveal without the vertical
// travel — a pure cross-fade.
const heroItemReduced = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: EASE_OUT } },
};

function HomeContent({ geo, infra, introDone }: HomeContentProps) {
  const reduce = useReducedMotion();
  const isDesktop = useIsDesktop();
  // Scroll-scrubbed motion runs on desktop only, and never under
  // prefers-reduced-motion.
  const parallax = isDesktop && !reduce;
  const heroItemVariant = reduce ? heroItemReduced : heroItem;

  // ── Scroll choreography. Hooks are always called (rules-of-hooks); their
  // motion values are only *applied* when `parallax` is true. ──
  // The hero itself is deliberately still: it reads immediately, and nothing
  // about it moves as you scroll. Parallax belongs further down the page, on
  // content that is genuinely travelling past the viewport.

  const videoRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: videoProgress } = useScroll({
    target: videoRef,
    offset: ["start end", "center center"],
  });
  const videoScale = useTransform(videoProgress, [0, 1], [0.9, 1]);
  const videoOpacity = useTransform(videoProgress, [0, 1], [0.35, 1]);

  const totalOutlets = geo.reduce((s, d) => s + d.outlet_count, 0);
  const districtsCovered = geo.length;
  const totalTaluks = geo.reduce((s, d) => s + d.taluk_count, 0);

  const digitalPaymentPct = infra?.digital.digital_payment_flag ?? 0;

  const LENSES = [
    {
      to: "/live/geography",
      title: "Geography & Outlets",
      icon: MapPinned,
      accent: CATEGORICAL.blue,
      statValue: totalOutlets,
      statFormat: (n: number) => `${formatNumber(Math.round(n))}+`,
    },
    {
      to: "/live/infrastructure",
      title: "Infrastructure & Digital",
      icon: Cpu,
      accent: CATEGORICAL.purple,
      statValue: digitalPaymentPct,
      statFormat: (n: number) => formatPercent(n),
    },
    {
      to: "/live/category-brand",
      title: "Category & Brand",
      icon: Tag,
      accent: CATEGORICAL.emerald,
      statValue: 22,
      statFormat: (n: number) => `${Math.round(n)}`,
    },
    {
      to: "/live/sales-opportunity",
      title: "Sales & Opportunity",
      icon: TrendingUp,
      accent: CATEGORICAL.indigo,
      // FIXME: no statValue — this card renders a literal "0" on the page.
      // It needs a real figure from the sales/opportunity endpoints; leaving it
      // absent is what the TS2322 error on this array has been reporting.
    },
  ];

  return (
    <div className="-mx-4 -mt-7 bg-[#FAF9F5] sm:-mx-6 lg:-mx-9 lg:-mt-9">
      {/* ---------------------------------------------------------------- MASTHEAD + HERO (static) */}
      <div className="relative">
        <div className="flex flex-col border-b border-[#e6e3da]">
          <div className="flex flex-wrap items-center gap-3 border-b border-[#e6e3da] py-5 pl-6 pr-6 sm:pl-10 sm:pr-10 lg:pl-14 lg:pr-14">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-navy-900 text-[10px] font-bold text-white">
              GT
            </div>
            <p className="font-mono text-[20px] font-semibold uppercase tracking-[0.16em] text-navy-700">
              Karnataka GT Intelligence Report
            </p>
          </div>

          <HeroCinematic>
            <motion.div
              variants={heroStagger}
              initial="hidden"
              animate={introDone ? "visible" : "hidden"}
              className="max-w-3xl"
            >
              <motion.h1
                variants={heroItemVariant}
                className="font-serif text-[40px] font-semibold leading-[1.08] tracking-tight text-white drop-shadow-[0_2px_18px_rgba(5,15,36,0.55)] sm:text-[52px]"
              >
                The Intelligence Behind Karnataka&apos;s General Trade
              </motion.h1>
              <motion.p
                variants={heroItemVariant}
                className="mt-6 max-w-lg text-[21px] leading-relaxed text-slate-200"
              >
                A door-to-door census of {formatNumber(totalOutlets)}+ General
                Trade outlets across {districtsCovered} districts — turning
                retail expansion in Karnataka from a guess into evidence.
              </motion.p>
              <motion.div
                variants={heroItemVariant}
                className="mt-8 flex flex-wrap items-center gap-4"
              >
                <Link
                  to="/live/geography"
                  className="group inline-flex h-11 items-center gap-2 rounded-md bg-white px-6 text-[18.5px] font-semibold text-navy-900 transition-colors duration-200 hover:bg-slate-100"
                >
                  Explore Live Dashboard
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <a
                  href="#methodology"
                  className="inline-flex h-11 items-center rounded-md border border-white/30 px-6 text-[18.5px] font-semibold text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/12"
                >
                  Methodology
                </a>
              </motion.div>

              <motion.div
                variants={heroItemVariant}
                className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/20 pt-6 font-mono text-[19.5px] text-slate-300"
              >
                <span>
                  <strong className="text-white">
                    {formatNumber(totalOutlets)}+
                  </strong>{" "}
                  Outlets
                </span>
                <span>
                  <strong className="text-white">{districtsCovered}</strong>{" "}
                  Districts
                </span>
                <span>
                  <strong className="text-white">{totalTaluks}</strong> Taluks
                </span>
              </motion.div>
            </motion.div>
          </HeroCinematic>
        </div>
      </div>

      <div className="mx-auto max-w-[1180px] px-6 py-14 sm:px-10 lg:px-14 lg:py-16">
        {/* ---------------------------------------------------------------- WHY GT STILL MATTERS */}
        <motion.section
          {...fadeUpInView}
          className="border-t border-[#e6e3da] py-14"
        >
          <p className="font-mono text-[18.5px] font-semibold uppercase tracking-[0.14em] text-accent-900">
            The Context
          </p>
          <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <h2 className="font-serif text-[28px] font-semibold leading-[1.2] tracking-tight text-navy-900 sm:text-[32px]">
              General trade still decides who wins in Indian FMCG.
            </h2>
            {/* Halved. The cuts are the throat-clearing ("E-commerce and modern
                trade dominate the conversation, but…") and the restatement of
                the claim the stats below already make. What stays is the two
                lines that carry the argument. */}
            <div className="space-y-4 text-[20.5px] leading-relaxed text-slate-600">
              <p>
                Most of India&apos;s retail happens inside small, independently
                run stores — kirana shops, chemists, neighbourhood outlets that
                never appear in a distributor&apos;s spreadsheet.
              </p>
              <p>
                Karnataka&apos;s general trade layer is large, fragmented, and —
                until this census — undocumented at the outlet level. Most
                brands solve it without ever having seen the market they&apos;re
                entering.
              </p>
            </div>
          </div>

          {/* Two columns until `lg`, not three: with the prose gone the figure
              carries the card, and "GT + Digital" is wide enough at this size
              to overflow a third of a small viewport. */}
          <div className="mt-12 grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {GT_DOMINANCE_POINTS.map((point) => (
              <div key={point.title} className="border-t border-[#e6e3da] pt-5">
                <span className="block font-serif text-[36px] font-semibold leading-none tracking-tight text-accent-900">
                  {point.stat}
                </span>
                <p className="mt-3 max-w-[22ch] text-[19px] font-semibold leading-snug text-navy-900">
                  {point.title}
                </p>
              </div>
            ))}
          </div>

        </motion.section>

        {/* ---------------------------------------------------------------- RESEARCH METHODOLOGY */}
        <motion.section
          id="methodology"
          {...fadeUpInView}
          className="scroll-mt-24 border-t border-[#e6e3da] py-14"
        >
          <p className="font-mono text-[16.5px] font-semibold uppercase tracking-[0.14em] text-accent-900">
            The Research
          </p>
          <h2 className="mt-4 max-w-xl font-serif text-[28px] font-semibold leading-[1.2] tracking-tight text-navy-900 sm:text-[32px]">
            The Research Behind This Report
          </h2>

          <div className="mt-10 grid gap-x-12 gap-y-10 sm:grid-cols-3">
            {METHODOLOGY_STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                {...fadeUpInViewDelay(i, 0.12)}
                className="border-t border-[#e6e3da] pt-5"
              >
                <span className="font-serif text-[26px] font-semibold text-accent-900">
                  {i + 1}
                </span>
                <p className="mt-3 text-[18.5px] font-semibold text-navy-900">
                  {step.title}
                </p>
                <p className="mt-2 text-[15.5px] leading-relaxed text-slate-500">
                  {step.body}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap gap-x-10 gap-y-3 border-t border-[#e6e3da] pt-6 font-mono text-[18.5px] text-slate-500">
            <span>
              <strong className="text-navy-900">
                {SURVEY_META.dataPointsPerOutlet}+
              </strong>{" "}
              Data Points
            </span>
            <span>
              <strong className="text-navy-900">22</strong> Categories
            </span>
            <span>
              <strong className="text-navy-900">{districtsCovered}</strong>{" "}
              Districts
            </span>
          </div>
        </motion.section>
      </div>

      {/* ---------------------------------------------------------------- THE SHELF (category carousel) */}
      {/* Full-bleed band: it breaks out of the 1180px report column on purpose,
          so the 3D stage has room to throw cards off to either side. */}
      <CategoryCarousel />

      <div className="mx-auto max-w-[1180px] px-6 py-14 sm:px-10 lg:px-14 lg:py-16">
        {/* ---------------------------------------------------------------- FIELD FOOTAGE (proof) */}
        <motion.div
          ref={videoRef}
          {...(reduce ? fadeUpInView : {})}
          style={
            reduce ? undefined : { scale: videoScale, opacity: videoOpacity }
          }
          className="origin-center border-t border-[#e6e3da] py-14"
        >
          <VideoShowcase />
        </motion.div>

        {/* ---------------------------------------------------------------- INTELLIGENCE CAPABILITIES */}
        <IntelligenceCapabilities />

        <div className="pt-14">
          <SpatialAnalytics />
        </div>

        {/* ---------------------------------------------------------------- BUSINESS QUESTIONS */}
        <div className="pt-14">
          <BusinessQuestions />
        </div>

        {/* ---------------------------------------------------------------- AUDIENCE */}
        <div className="pt-14">
          <AudienceGrid />
        </div>

        {/* ---------------------------------------------------------------- PLATFORM PREVIEW */}
        <motion.section
          {...fadeUpInView}
          className="border-t border-[#e6e3da] py-14 perspective-[1400px]"
        >
          <p className="font-mono text-[18.5px] font-semibold uppercase tracking-[0.14em] text-accent-900">
            The Platform
          </p>
          <h2 className="mt-4 max-w-xl font-serif text-[28px] font-semibold leading-[1.2] tracking-tight text-navy-900 sm:text-[32px]">
            See the Data Behind Every Claim Above
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-500">
            Everything above is generated from a live platform, not a static
            report. Explore the same census yourself.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {LENSES.map((lens, i) => (
              <motion.div
                key={lens.to}
                {...fadeUpInView}
                transition={{ duration: 0.5, delay: i * 0.06, ease: EASE_OUT }}
                className="h-full"
              >
                <LensCard {...lens} />
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ---------------------------------------------------------------- FINAL CTA */}
        <motion.section
          {...fadeUpInView}
          className="border-t border-[#e6e3da] py-16 text-center"
        >
          <h2 className="mx-auto max-w-lg font-serif text-[30px] font-semibold leading-[1.2] tracking-tight text-navy-900 sm:text-[34px]">
            Turn Retail Intelligence Into Market Advantage
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/live/geography"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-navy-900 px-6 text-[13.5px] font-semibold text-white transition-colors duration-200 hover:bg-navy-800"
            >
              Explore Live Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#methodology"
              className="inline-flex h-11 items-center rounded-md border border-navy-900/20 px-6 text-[13.5px] font-semibold text-navy-900 transition-colors duration-200 hover:bg-navy-900/[0.04]"
            >
              Methodology
            </a>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
