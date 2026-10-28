import { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { Pause, Play, X } from "lucide-react";

const VIDEO_SRC = "/videos/herocinematic.mp4";
const POSTER_SRC = "/videos/herocinematic-poster.jpg";

// The clip is a finished 39s film, not a background plate: from ~15s it carries
// its OWN burned-in titles ("1,03,631 OUTLETS", "THE MARKET IS EVERYWHERE"),
// centred, which collide with the hero copy. So the hero loops only the clean
// opening, and the full film is opt-in — see `mode` below.
const AMBIENT_END = 14.2;

// The clip is 2.33:1 and ~28 MB. It is deliberately NOT autoplayed on phones —
// streaming it over cellular to show a heavily-cropped slice is a bad trade, so
// small screens get the poster frame plus an explicit play control.
const DESKTOP_QUERY = "(min-width: 1024px)";

// Cursor parallax. The video is overscaled by SCALE so the drift can never
// expose an edge: overhang is (SCALE-1)/2 of each dimension, which at 1.08 is
// ~4% — comfortably more than MAX_SHIFT px on any hero-sized box.
const SCALE = 1.08;
const MAX_SHIFT = 14;

type Mode = "ambient" | "film";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

interface HeroCinematicProps {
  /** Hero copy, rendered above the video. */
  children: React.ReactNode;
}

export function HeroCinematic({ children }: HeroCinematicProps) {
  const reduce = useReducedMotion();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  // Ambient autoplay + cursor parallax are desktop-only and never run under
  // prefers-reduced-motion. Those users still get the full film on request —
  // a deliberate click is not unsolicited motion.
  const motionOK = isDesktop && !reduce;

  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<Mode>("ambient");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copyHidden, setCopyHidden] = useState(false);
  const [inView, setInView] = useState(true);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // ── Cursor parallax ──
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 90, damping: 20, mass: 0.5 });
  const sy = useSpring(py, { stiffness: 90, damping: 20, mass: 0.5 });
  const x = useTransform(sx, (v) => v * MAX_SHIFT);
  const y = useTransform(sy, (v) => v * MAX_SHIFT);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!motionOK) return;
      const r = e.currentTarget.getBoundingClientRect();
      // Normalised to -1..1, then inverted so the frame drifts *against* the
      // cursor — the direction a real camera push would read.
      px.set(-(((e.clientX - r.left) / r.width) * 2 - 1));
      py.set(-(((e.clientY - r.top) / r.height) * 2 - 1));
    },
    [motionOK, px, py],
  );

  const onPointerLeave = useCallback(() => {
    px.set(0);
    py.set(0);
  }, [px, py]);

  // Only run the clip while the hero is on screen — decoding it behind three
  // screens of report is wasted battery.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Ambient autoplay. `muted` is set on the DOM node imperatively as well as in
  // JSX — the attribute alone doesn't always land before the browser's
  // autoplay-without-audio check, which then blocks play() silently.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !motionOK) return;
    v.muted = true;
    v.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    );
  }, [motionOK]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!inView) v.pause();
    else if (playing) v.play().catch(() => {});
  }, [inView, playing]);

  const toAmbient = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setMode("ambient");
    setCopyHidden(false);
    v.currentTime = 0;
    if (motionOK) {
      v.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      );
    } else {
      v.pause();
      setPlaying(false);
    }
  }, [motionOK]);

  const toFilm = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setMode("film");
    v.muted = true;
    v.currentTime = 0;
    v.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    );
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    if (v.paused) {
      v.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      );
    } else {
      v.pause();
      setPlaying(false);
    }
  }, []);

  // Single source of truth for looping and for handing the frame over to the
  // film's own titles. `loop` is deliberately NOT set on the element — ambient
  // mode loops a subrange, which the attribute can't express.
  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const t = v.currentTime;

    if (modeRef.current === "ambient") {
      setProgress(Math.min(100, (t / AMBIENT_END) * 100));
      if (t >= AMBIENT_END) v.currentTime = 0;
      return;
    }

    setProgress(v.duration ? (t / v.duration) * 100 : 0);
    // Once the film starts titling, step the hero copy aside.
    setCopyHidden(t >= AMBIENT_END - 0.6);
  }, []);

  const filmMode = mode === "film";

  return (
    <section
      ref={sectionRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="group relative isolate flex min-h-[clamp(30rem,74vh,44rem)] flex-col justify-end overflow-hidden bg-navy-950"
    >
      <motion.video
        ref={videoRef}
        src={VIDEO_SRC}
        poster={POSTER_SRC}
        muted
        playsInline
        preload="metadata"
        aria-label="Field footage from Karnataka general trade stores"
        onTimeUpdate={onTimeUpdate}
        onEnded={toAmbient}
        style={motionOK && !filmMode ? { x, y, scale: SCALE } : { scale: 1 }}
        className="absolute inset-0 -z-10 h-full w-full object-cover will-change-transform"
      />

      {/* Legibility scrims — left-weighted for the copy column, plus a floor
          gradient so the stat strip and controls always have ground. Both lift
          in film mode so the picture plays clean. */}
      <motion.div
        aria-hidden
        animate={{ opacity: filmMode ? 0.25 : 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 -z-10 bg-linear-to-r from-navy-950/92 via-navy-950/62 to-navy-950/25"
      />
      <motion.div
        aria-hidden
        animate={{ opacity: filmMode ? 0.3 : 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-x-0 bottom-0 -z-10 h-2/5 bg-linear-to-t from-navy-950/85 to-transparent"
      />

      <motion.div
        animate={{
          opacity: copyHidden ? 0 : 1,
          y: copyHidden ? -18 : 0,
        }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        // Hidden copy must not stay tabbable behind the film.
        inert={copyHidden}
        className="relative w-full px-6 pb-16 pt-20 sm:px-10 lg:px-14 lg:pb-20 lg:pt-24"
      >
        {children}
      </motion.div>

      {/* Controls. No volume — the clip is silent by design. */}
      <div className="absolute bottom-6 right-6 z-10 flex items-center gap-2.5">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause video" : "Play video"}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-inset ring-white/25 backdrop-blur-md transition duration-200 hover:scale-110 hover:bg-white/22 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {playing ? (
            <Pause className="h-4 w-4" fill="currentColor" />
          ) : (
            <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
          )}
        </button>

        <button
          type="button"
          onClick={filmMode ? toAmbient : toFilm}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-white/12 px-5 text-[15px] font-semibold text-white ring-1 ring-inset ring-white/25 backdrop-blur-md transition duration-200 hover:bg-white/22 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {filmMode ? (
            <>
              <X className="h-4 w-4" />
              Back to report
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" fill="currentColor" />
              Watch the film
            </>
          )}
        </button>
      </div>

      {/* Loop position — a hairline, not a scrubber. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 z-10 h-px bg-white/15"
      >
        <div className="h-full bg-white/70" style={{ width: `${progress}%` }} />
      </div>
    </section>
  );
}
