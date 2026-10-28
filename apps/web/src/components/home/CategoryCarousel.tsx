import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLiveQuery } from "@/lib/useLiveQuery";
import * as api from "@/lib/liveApi";
import {
  CATEGORY_VISUALS,
  FALLBACK_VISUAL,
  type CategoryVisual,
} from "@/data/categoryVisuals";

// A 3D cover-flow carousel of every censused category, driven by page scroll.
//
// The reference this follows is a whole page: a 1400vh spacer plus a fixed
// stage, so scrolling the document IS the carousel. That can't be dropped into
// a report verbatim — it would swallow the rest of the page. The same feel is
// achieved here by PINNING: a tall wrapper provides the scroll distance, an
// inner sticky panel holds the stage, and the wrapper's scroll progress maps to
// horizontal card movement. Scroll down → cards travel sideways; scroll past the
// section → the page carries on as normal.
//
// Scroll is the single source of truth. Arrows, the pager, a card click and
// horizontal drag all *scroll the window* rather than setting position
// directly, so nothing can fight the scrollbar.

/** Scroll distance (in vh) spent on each category. Tune to taste: higher = the
 *  carousel advances more slowly and the section gets taller. */
const VH_PER_CARD = 26;
/** Height of the app's sticky navbar (h-16). */
const NAV_PX = 64;

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

interface Slide {
  name: string;
  availability: number;
  visual: CategoryVisual;
}

function useSlides() {
  const { data, loading, error } = useLiveQuery(api.getCategoryAvailability);
  const slides = useMemo<Slide[]>(() => {
    if (!data) return [];
    return [...data]
      .sort((a, b) => a.display_order - b.display_order)
      .map((c) => ({
        name: c.category_name,
        availability: c.availability_pct,
        visual: CATEGORY_VISUALS[c.category_name] ?? FALLBACK_VISUAL,
      }));
  }, [data]);
  return { slides, loading, error };
}

function CardFace({
  slide,
  rank,
  total,
}: {
  slide: Slide;
  rank: number;
  total: number;
}) {
  const { visual } = slide;
  return (
    <>
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5 bg-black">
        {visual.tiles.map((glyph, j) => (
          <div
            key={j}
            className="relative grid place-items-center overflow-hidden"
            style={{
              background: `linear-gradient(150deg, ${visual.c1}, ${visual.c2})`,
            }}
          >
            {visual.photos?.[j] ? (
              <img
                src={visual.photos[j]}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <span className="text-[44px] opacity-90 drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)]">
                {glyph}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] bg-linear-to-t from-black/88 via-black/25 to-transparent" />

      <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/20 bg-black/35 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-white backdrop-blur-sm">
        {slide.availability.toFixed(1)}% stocked
      </div>

      <div className="pointer-events-none absolute inset-x-4 bottom-4">
        <div className="font-mono text-[10px] tracking-[0.18em] text-white/70">
          {String(rank).padStart(2, "0")} / {total}
        </div>
        <div className="mt-1.5 text-[21px] font-extrabold uppercase italic leading-none tracking-tight text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.5)]">
          {slide.name}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 rounded-[26px] border border-white/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_60%_at_28%_-6%,rgba(255,255,255,0.3),transparent_56%)] mix-blend-screen" />
    </>
  );
}

export function CategoryCarousel() {
  const reduce = useReducedMotion();
  const { slides, loading, error } = useSlides();
  const n = slides.length;

  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);

  // Per-frame state lives in refs so the rAF loop never re-renders React.
  const pos = useRef(0);
  const activeRef = useRef(0);
  const energy = useRef(0);
  const tilt = useRef({ x: 0, y: 0, sx: 0, sy: 0 });
  const dragging = useRef(false);
  const lastX = useRef(0);
  const moved = useRef(0);

  /** Page-scroll geometry of the pinned range. */
  const metrics = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return null;
    const r = wrap.getBoundingClientRect();
    const pinned = window.innerHeight - NAV_PX;
    const travel = Math.max(1, r.height - pinned);
    // How far the wrapper has moved past the pin line.
    const scrolled = clamp(NAV_PX - r.top, 0, travel);
    return { travel, scrolled, top: r.top + window.scrollY - NAV_PX };
  }, []);

  /** Scroll the page to the offset that centres card `i`. */
  const scrollToIndex = useCallback(
    (i: number) => {
      const m = metrics();
      if (!m || n < 2) return;
      const t = clamp(i, 0, n - 1) / (n - 1);
      window.scrollTo({ top: m.top + t * m.travel, behavior: "smooth" });
    },
    [metrics, n],
  );

  const stepBy = useCallback(
    (dir: number) => scrollToIndex(Math.round(pos.current) + dir),
    [scrollToIndex],
  );

  // ── Horizontal drag → vertical scroll, so scroll stays the only driver ──
  const onPointerDown = (e: React.PointerEvent) => {
    if (reduce || n < 2) return;
    dragging.current = true;
    moved.current = 0;
    lastX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    tilt.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    tilt.current.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (!dragging.current) return;
    const dx = e.clientX - lastX.current;
    lastX.current = e.clientX;
    moved.current += Math.abs(dx);
    const m = metrics();
    if (!m) return;
    // Convert a horizontal drag into the equivalent scroll distance.
    const stepPx = (cardRefs.current[0]?.offsetWidth || 240) * 0.66;
    window.scrollBy(0, (-dx / stepPx) * (m.travel / (n - 1)));
  };
  const endDrag = () => {
    dragging.current = false;
  };
  const onPointerLeave = () => {
    tilt.current.x = 0;
    tilt.current.y = 0;
    endDrag();
  };

  // ── rAF loop: read scroll, ease toward it, paint transforms ──
  useEffect(() => {
    if (reduce || n < 2) return;
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = now / 1000;

      const m = metrics();
      if (!m) return;
      const p = m.scrolled / m.travel;
      const targetPos = p * (n - 1);

      // Ease toward the scroll-derived position — this lag is what produces the
      // trailing/fanning feel while the wheel is moving.
      const d = targetPos - pos.current;
      pos.current += d * Math.min(1, dt * 8);
      energy.current = lerp(energy.current, clamp(Math.abs(d) / 1.4, 0, 1), dt * 6);

      tilt.current.sx = lerp(tilt.current.sx, tilt.current.x, dt * 8);
      tilt.current.sy = lerp(tilt.current.sy, tilt.current.y, dt * 8);

      const idx = clamp(Math.round(pos.current), 0, n - 1);
      if (idx !== activeRef.current) {
        activeRef.current = idx;
        setActive(idx);
      }

      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${p.toFixed(4)})`;
      }
      if (trackRef.current) {
        trackRef.current.style.transform = `rotateX(${(tilt.current.sy * 3).toFixed(2)}deg) rotateY(${(tilt.current.sx * 2).toFixed(2)}deg)`;
      }

      const spread = 1 + energy.current * 0.45;
      const stepPx = (cardRefs.current[0]?.offsetWidth || 240) * 0.66;

      for (let i = 0; i < n; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;
        // Linear (not wrapped) — the strip has a real start and end, matching
        // the section's scroll range.
        const o = i - pos.current;
        const ax = Math.abs(o);
        const vis = 1 - smooth(2.6, 3.6, ax);
        if (vis <= 0.01) {
          el.style.visibility = "hidden";
          el.style.pointerEvents = "none";
          continue;
        }
        el.style.visibility = "visible";
        el.style.pointerEvents = ax < 0.55 ? "auto" : "none";

        const x = o * stepPx * spread;
        const z = -ax * 205 - ax * energy.current * 120;
        const ry =
          clamp(-o * 24, -64, 64) +
          tilt.current.sx * 7 * (1 - Math.min(ax, 1)) +
          o * energy.current * 30;
        const sc = (1 - ax * 0.1) * (1 + energy.current * 0.03);
        const y =
          Math.sin(t * 0.9 + i) * 4 +
          Math.sin(o * 1.4 + t * 3) * energy.current * 18;

        el.style.opacity = vis.toFixed(3);
        el.style.zIndex = String(1000 - Math.round(ax * 50));
        el.style.transform = `translate(-50%,-50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduce, n, metrics]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      stepBy(-1);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      stepBy(1);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[28rem] place-items-center bg-navy-950 font-mono text-[12px] uppercase tracking-[0.3em] text-white/50">
        Loading categories…
      </div>
    );
  }
  if (error || !n) {
    return (
      <div className="grid min-h-[20rem] place-items-center bg-navy-950 px-6 text-center font-mono text-[12px] uppercase tracking-[0.2em] text-white/50">
        Categories unavailable — {error ?? "no data returned"}
      </div>
    );
  }

  const current = slides[active];

  // ── Reduced motion: no pinning, no scroll-jacking — a calm snap row ──
  if (reduce) {
    return (
      <section className="bg-navy-950 py-14">
        <Header total={n} />
        <div className="mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-4 sm:px-10 lg:px-14">
          {slides.map((s, i) => (
            <div
              key={s.name}
              className="relative aspect-2/3 w-[min(18rem,66vw)] shrink-0 snap-center overflow-hidden rounded-[26px] shadow-[0_34px_70px_rgba(0,0,0,0.5)]"
            >
              <CardFace slide={s} rank={i + 1} total={n} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    // Tall wrapper = the scroll distance the pinned stage consumes.
    <div
      ref={wrapRef}
      style={{ height: `calc(100vh - 4rem + ${(n - 1) * VH_PER_CARD}vh)` }}
      className="relative"
    >
      <section
        className="sticky top-16 isolate flex h-[calc(100vh-4rem)] flex-col overflow-hidden"
        style={{
          background: `radial-gradient(120% 120% at 50% 118%, ${current.visual.c1} 2%, ${current.visual.c2} 46%, #05060a 88%)`,
          transition: "background 0.6s ease",
        }}
      >
        {/* Section scroll progress */}
        <div className="absolute inset-x-0 top-0 z-20 h-[3px] bg-white/10">
          <div
            ref={progressRef}
            className="h-full origin-left bg-linear-to-r from-sky-400 via-pink-400 to-emerald-400"
            style={{ transform: "scaleX(0)" }}
          />
        </div>

        <div className="shrink-0 px-6 pt-8 sm:px-10 lg:px-14">
          <Header total={n} />
        </div>

        <div
          role="group"
          aria-roledescription="carousel"
          aria-label="Censused categories"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={onPointerLeave}
          onKeyDown={onKeyDown}
          className="relative min-h-0 flex-1 cursor-grab touch-pan-y select-none active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white/60"
          style={{ perspective: "1500px", perspectiveOrigin: "50% 50%" }}
        >
          <div
            ref={trackRef}
            className="absolute inset-0"
            style={{ transformStyle: "preserve-3d" }}
          >
            {slides.map((s, i) => (
              <div
                key={s.name}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                onClick={() => {
                  if (moved.current < 6) scrollToIndex(i);
                }}
                style={{ transformStyle: "preserve-3d" }}
                // NO -translate-x/y-1/2 here: Tailwind v4 emits those as the
                // standalone `translate` property, which composes WITH
                // `transform` rather than being overridden by it — the rAF
                // transform already carries translate(-50%,-50%).
                className="absolute left-1/2 top-1/2 h-[min(20rem,42vh)] w-[min(14rem,56vw)] overflow-hidden rounded-[26px] shadow-[0_34px_70px_rgba(0,0,0,0.5)] will-change-transform"
              >
                <CardFace slide={s} rank={i + 1} total={n} />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => stepBy(-1)}
            aria-label="Previous category"
            className="absolute left-3 top-1/2 z-[1200] flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-inset ring-white/25 backdrop-blur-md transition duration-200 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-6"
            style={{ transform: "translateY(-50%)" }}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => stepBy(1)}
            aria-label="Next category"
            className="absolute right-3 top-1/2 z-[1200] flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-inset ring-white/25 backdrop-blur-md transition duration-200 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-6"
            style={{ transform: "translateY(-50%)" }}
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Readout scrim. The radial gradient is at its BRIGHTEST along the
            bottom edge (c1 sits at 118%), so white copy over a light palette
            (Frozen #80DEEA, Egg #FFD166, Rice #D7CCC8) measured 1.2–2.0:1
            against a 4.5:1 requirement. This puts the text back on dark ground
            for all 22 palettes without changing the colour story. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[46%] bg-linear-to-t from-[#05060a] via-[#05060a]/88 to-transparent"
        />

        <div className="relative z-10 shrink-0 px-6 pb-7 sm:px-10 lg:px-14">
          <div className="mx-auto max-w-2xl text-center">
            <h3
              key={current.name}
              className="animate-fade-up text-[clamp(26px,4.4vw,46px)] font-extrabold uppercase italic leading-[0.9] tracking-tight text-white"
            >
              {current.name}
            </h3>
            <p className="mx-auto mt-3 max-w-[46ch] text-[14px] font-light leading-relaxed text-white/85">
              {current.visual.blurb}
            </p>
          </div>

          {/* Pager. The visible bar stays a hairline, but each button carries
              44px of vertical hit area (py-5 around an h-1 bar). Width is the
              real constraint: 22 ticks can't each reach 44px in one row, so the
              row is widened to clear WCAG 2.2 AA's 24px floor on md+, and below
              that the ticks are dropped entirely for a legible counter — the
              arrows (44x44) and scroll remain the primary controls either way. */}
          <div className="mx-auto mt-3 hidden max-w-[44rem] items-center gap-1 md:flex">
            {slides.map((s, i) => (
              <button
                key={s.name}
                type="button"
                onClick={() => scrollToIndex(i)}
                aria-label={`Go to ${s.name}`}
                aria-current={i === active}
                className="group flex-1 rounded-sm py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <span
                  className={`block h-1 rounded-full transition-all duration-300 ${
                    i === active ? "bg-white" : "bg-white/40 group-hover:bg-white/70"
                  }`}
                />
              </button>
            ))}
          </div>

          <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-white/70 md:mt-0">
            <span className="md:hidden">
              {String(active + 1).padStart(2, "0")} / {n} ·{" "}
            </span>
            Scroll · drag · tap
          </p>
        </div>
      </section>
    </div>
  );
}

function Header({ total }: { total: number }) {
  return (
    <div className="text-center">
      <p className="font-mono text-[11.5px] font-semibold uppercase tracking-[0.2em] text-white/60">
        The Shelf · {total} categories
      </p>
      <h2 className="mx-auto mt-2 max-w-3xl font-serif text-[24px] font-semibold leading-[1.15] tracking-tight text-white sm:text-[30px]">
        Every category we counted, outlet by outlet.
      </h2>
    </div>
  );
}
