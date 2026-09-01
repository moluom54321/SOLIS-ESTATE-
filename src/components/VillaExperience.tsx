"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const TOTAL_FRAMES = 593;
const FRAME_PATH = "/frames/frame_";

function padFrame(n: number): string {
  return String(n).padStart(4, "0");
}

function frameSrc(index: number): string {
  return `${FRAME_PATH}${padFrame(index)}.jpg`;
}

interface SceneInfo {
  tag: string;
  title: string;
  subtitle: string;
  stats?: { label: string; value: string }[];
}

const SCENES: SceneInfo[] = [
  {
    tag: "THE RESIDENCE",
    title: "ARCHITECTURAL\nMASTERPIECE",
    subtitle: "A transcendent modern estate designed for those who demand the extraordinary.",
  },
  {
    tag: "EXTERIOR ARCHITECTURE",
    title: "SEAMLESS\nHORIZONS",
    subtitle: "Floating cantilevered terraces, infinity edge waters, and panoramic glass vistas.",
    stats: [
      { label: "Total Living Space", value: "14,500 SQ FT" },
      { label: "Private Acreage", value: "3.2 ACRES" },
    ],
  },
  {
    tag: "INTERIOR CRAFT",
    title: "CURATED\nELEGANCE",
    subtitle: "Bookmatched Italian Calacatta marble, brushed titanium accents, and bespoke woodwork.",
    stats: [
      { label: "Ceiling Height", value: "24 FT" },
      { label: "Bespoke Suites", value: "6 BEDROOMS" },
    ],
  },
  {
    tag: "WELLNESS & LIVING",
    title: "SANCTUARY OF\nTRANQUILITY",
    subtitle: "Integrated spa pavilion, temperature-controlled subterranean wine vault, and cinema.",
    stats: [
      { label: "Bathrooms", value: "8 SPA BATHS" },
      { label: "Garage Capacity", value: "6 SUPERCARS" },
    ],
  },
  {
    tag: "EXCLUSIVE ACQUISITION",
    title: "OWN THE\nEXTRAORDINARY",
    subtitle: "Private viewings available by bespoke appointment for qualified clientele.",
  },
];

export default function VillaExperience() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>(new Array(TOTAL_FRAMES).fill(null));

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isPreloaderDone, setIsPreloaderDone] = useState(false);
  const [currentFrameNum, setCurrentFrameNum] = useState(1);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const lastDrawnFrameRef = useRef<number>(-1);
  const rafRef = useRef<number | null>(null);

  // ── Render Frame on Canvas with Nearest-Frame Fallback ──────────────
  const renderFrame = useCallback((targetFrameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const clampedIndex = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(targetFrameIndex)));

    // Find the requested image or the closest available loaded frame
    let img = imagesRef.current[clampedIndex];
    if (!img || !img.complete || img.naturalWidth === 0) {
      // Search backwards first
      for (let i = clampedIndex; i >= 0; i--) {
        if (imagesRef.current[i] && imagesRef.current[i]!.complete && imagesRef.current[i]!.naturalWidth > 0) {
          img = imagesRef.current[i];
          break;
        }
      }
      // If not found backwards, search forwards
      if (!img || !img.complete || img.naturalWidth === 0) {
        for (let i = clampedIndex; i < TOTAL_FRAMES; i++) {
          if (imagesRef.current[i] && imagesRef.current[i]!.complete && imagesRef.current[i]!.naturalWidth > 0) {
            img = imagesRef.current[i];
            break;
          }
        }
      }
    }

    if (!img || !img.complete || img.naturalWidth === 0) return;

    lastDrawnFrameRef.current = clampedIndex;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
    }

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = w / h;

    let drawW: number, drawH: number, offsetX: number, offsetY: number;

    if (imgRatio > canvasRatio) {
      drawH = h;
      drawW = h * imgRatio;
      offsetX = (w - drawW) / 2;
      offsetY = 0;
    } else {
      drawW = w;
      drawH = w / imgRatio;
      offsetX = 0;
      offsetY = (h - drawH) / 2;
    }

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
  }, []);

  // ── Preload Strategy (Fast Concurrent Loading) ──────────────────────
  useEffect(() => {
    let loadedCount = 0;
    let cancelled = false;
    const CONCURRENCY = 20;
    let nextIndex = 0;

    // Load first frame immediately
    const firstImg = new Image();
    firstImg.src = frameSrc(1);
    firstImg.onload = () => {
      if (cancelled) return;
      imagesRef.current[0] = firstImg;
      renderFrame(0);
    };

    function loadNext() {
      if (cancelled || nextIndex >= TOTAL_FRAMES) return;

      const idx = nextIndex++;
      const img = new Image();
      img.src = frameSrc(idx + 1);

      img.onload = () => {
        if (cancelled) return;
        imagesRef.current[idx] = img;
        loadedCount++;

        const pct = Math.round((loadedCount / TOTAL_FRAMES) * 100);
        setLoadingProgress(pct);

        if (loadedCount >= TOTAL_FRAMES) {
          setTimeout(() => setIsPreloaderDone(true), 300);
        }
        loadNext();
      };

      img.onerror = () => {
        if (cancelled) return;
        loadedCount++;
        const pct = Math.round((loadedCount / TOTAL_FRAMES) * 100);
        setLoadingProgress(pct);
        if (loadedCount >= TOTAL_FRAMES) {
          setTimeout(() => setIsPreloaderDone(true), 300);
        }
        loadNext();
      };
    }

    for (let i = 0; i < CONCURRENCY; i++) {
      loadNext();
    }

    return () => {
      cancelled = true;
    };
  }, [renderFrame]);

  // ── Setup Lenis Smooth Scroll & GSAP ScrollTrigger ───────────────────
  useEffect(() => {
    if (!isPreloaderDone) return;

    const isTouch = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

    // 1. Initialize Lenis
    const lenis = new Lenis({
      duration: isTouch ? 1.0 : 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.5,
    });

    lenis.on("scroll", ScrollTrigger.update);

    function lenisRaf(time: number) {
      lenis.raf(time);
      rafRef.current = requestAnimationFrame(lenisRaf);
    }
    rafRef.current = requestAnimationFrame(lenisRaf);

    // Direct scroll sync function
    const updateFrameOnScroll = (progress: number) => {
      const clampedProgress = Math.max(0, Math.min(1, progress));
      const frameIndex = Math.min(
        TOTAL_FRAMES - 1,
        Math.floor(clampedProgress * (TOTAL_FRAMES - 1))
      );
      setCurrentFrameNum(frameIndex + 1);

      const sceneIndex = Math.min(
        SCENES.length - 1,
        Math.floor(clampedProgress * SCENES.length)
      );
      setActiveSceneIndex(sceneIndex);

      renderFrame(frameIndex);
    };

    // 2. Setup GSAP ScrollTrigger for Master Frame Scrubbing
    const ctx = gsap.context(() => {
      const container = containerRef.current;
      if (!container) return;

      const frameObj = { frame: 0 };

      // Master frame scrubber tween
      gsap.to(frameObj, {
        frame: TOTAL_FRAMES - 1,
        ease: "none",
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: "bottom bottom",
          scrub: isTouch ? 0.2 : 0.4,
          onUpdate: (self) => {
            updateFrameOnScroll(self.progress);
          },
        },
      });

      // Animate individual scene cards
      const sections = gsap.utils.toArray<HTMLElement>(".scene-overlay");
      sections.forEach((sec) => {
        gsap.fromTo(
          sec,
          { opacity: 0, y: 30, filter: "blur(6px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.8,
            scrollTrigger: {
              trigger: sec,
              start: "top 80%",
              end: "top 20%",
              scrub: 0.8,
              toggleActions: "play reverse play reverse",
            },
          }
        );
      });
    }, containerRef);

    // Initial render & refresh
    setTimeout(() => {
      ScrollTrigger.refresh();
      renderFrame(0);
    }, 100);

    const handleResize = () => {
      renderFrame(lastDrawnFrameRef.current >= 0 ? lastDrawnFrameRef.current : 0);
      ScrollTrigger.refresh();
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lenis.destroy();
      ctx.revert();
    };
  }, [isPreloaderDone, renderFrame]);

  return (
    <div ref={containerRef} className="relative bg-black text-white selection:bg-amber-400 selection:text-black overflow-x-hidden min-h-screen">
      {/* ── PRELOADER ─────────────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-700 p-6 ${
          isPreloaderDone ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="w-full max-w-xs text-center space-y-3.5">
          <p className="text-[9.5px] sm:text-[10px] uppercase tracking-[0.3em] text-neutral-400 font-mono">
            ELEVATED ARCHITECTURE
          </p>
          <div className="text-4xl sm:text-5xl font-light tracking-tight text-white tabular-nums font-sans">
            {loadingProgress}%
          </div>
          <div className="w-full h-[2px] bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-neutral-500 via-white to-amber-200 transition-all duration-150 rounded-full"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="text-[9.5px] sm:text-[10px] tracking-widest text-neutral-500 uppercase font-mono" suppressHydrationWarning>
            {loadingProgress < 100
              ? `Loading frames (${Math.floor((loadingProgress / 100) * TOTAL_FRAMES)} / ${TOTAL_FRAMES})`
              : "Ready"}
          </p>
        </div>
      </div>

      {/* ── RESPONSIVE NAVIGATION HEADER ──────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 sm:px-8 md:px-12 py-3 sm:py-4 backdrop-blur-md bg-black/50 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-white/95">
            SOLIS ESTATE
          </span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-6 lg:space-x-8 text-[11px] uppercase tracking-wider text-neutral-300">
          <a href="#scene-0" className="hover:text-white transition-colors">Overview</a>
          <a href="#scene-1" className="hover:text-white transition-colors">Architecture</a>
          <a href="#scene-2" className="hover:text-white transition-colors">Interiors</a>
          <a href="#scene-3" className="hover:text-white transition-colors">Wellness</a>
          <a href="#scene-4" className="hover:text-white transition-colors">Inquire</a>
        </nav>

        <div className="flex items-center space-x-3">
          <a
            href="#scene-4"
            className="px-3.5 sm:px-4 py-1.5 text-[10.5px] sm:text-xs uppercase tracking-wider font-medium text-black bg-white hover:bg-amber-300 transition-all duration-200 rounded-full shadow-sm"
          >
            Book Viewing
          </a>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-neutral-300 hover:text-white focus:outline-none"
            aria-label="Toggle Menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7" />
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Slide-down Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-[49px] sm:top-[57px] z-30 bg-black/95 backdrop-blur-xl border-b border-white/10 p-6 flex flex-col space-y-4 md:hidden text-xs uppercase tracking-widest font-mono">
          <a
            href="#scene-0"
            onClick={() => setMobileMenuOpen(false)}
            className="text-neutral-300 hover:text-amber-300 py-1 border-b border-white/5"
          >
            Overview
          </a>
          <a
            href="#scene-1"
            onClick={() => setMobileMenuOpen(false)}
            className="text-neutral-300 hover:text-amber-300 py-1 border-b border-white/5"
          >
            Architecture
          </a>
          <a
            href="#scene-2"
            onClick={() => setMobileMenuOpen(false)}
            className="text-neutral-300 hover:text-amber-300 py-1 border-b border-white/5"
          >
            Interiors
          </a>
          <a
            href="#scene-3"
            onClick={() => setMobileMenuOpen(false)}
            className="text-neutral-300 hover:text-amber-300 py-1 border-b border-white/5"
          >
            Wellness
          </a>
          <a
            href="#scene-4"
            onClick={() => setMobileMenuOpen(false)}
            className="text-neutral-300 hover:text-amber-300 py-1"
          >
            Inquire
          </a>
        </div>
      )}

      {/* ── FIXED FULL-VIEWPORT CANVAS (STAYS PINNED AS YOU SCROLL) ───── */}
      <div className="fixed inset-0 w-full h-[100dvh] overflow-hidden pointer-events-none z-0">
        <canvas ref={canvasRef} className="w-full h-full object-cover block" />
        
        {/* Cinematic Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/55 pointer-events-none" />
        <div className="absolute inset-0 bg-black/25 pointer-events-none" />
      </div>

      {/* ── RESPONSIVE FLOATING HUD ───────────────────────────────────── */}
      <div className="fixed bottom-4 left-4 sm:bottom-5 sm:left-8 z-20 flex items-center space-x-2 sm:space-x-2.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[10px] sm:text-[11px] font-mono text-neutral-400">
        <span className="text-amber-400 text-[9px] sm:text-[10px]">FRAME</span>
        <span className="text-white font-medium">{padFrame(currentFrameNum)}</span>
        <span className="text-neutral-600">/</span>
        <span className="text-neutral-400">{TOTAL_FRAMES}</span>
        <span className="hidden xs:inline-block w-1 h-1 rounded-full bg-neutral-600" />
        <span className="hidden xs:inline-block text-neutral-300 uppercase tracking-wider text-[8.5px] sm:text-[9.5px]">
          {SCENES[activeSceneIndex]?.tag}
        </span>
      </div>

      <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-8 z-20 hidden sm:flex items-center space-x-2 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-[9.5px] font-mono uppercase tracking-widest text-neutral-400">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        <span>SCROLL TO EXPLORE</span>
      </div>

      {/* ── SCROLL CONTENT SECTIONS OVERLAY ───────────────────────────── */}
      <div className="relative z-10">
        {/* SCENE 0: HERO */}
        <section
          id="scene-0"
          className="scene-overlay min-h-[120dvh] flex flex-col items-center justify-center text-center px-4 sm:px-6 py-20"
        >
          <div className="w-full max-w-xl mx-auto space-y-3 sm:space-y-4">
            <span className="inline-block px-3 py-1 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-[9px] sm:text-[10px] font-mono uppercase tracking-[0.25em] text-amber-300">
              {SCENES[0].tag}
            </span>
            <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-tight uppercase whitespace-pre-line text-white">
              {SCENES[0].title}
            </h1>
            <p className="max-w-md mx-auto text-xs sm:text-sm text-neutral-300 font-normal leading-relaxed px-2">
              {SCENES[0].subtitle}
            </p>
            <div className="pt-4 sm:pt-6">
              <div className="inline-flex items-center space-x-1.5 text-[9.5px] sm:text-[10px] font-mono tracking-widest text-neutral-400 animate-bounce">
                <span>SCROLL DOWN</span>
                <span>↓</span>
              </div>
            </div>
          </div>
        </section>

        {/* SCENE 1: ARCHITECTURE */}
        <section
          id="scene-1"
          className="scene-overlay min-h-[120dvh] flex items-center justify-center md:justify-start px-4 sm:px-8 md:px-16 lg:px-24 py-16"
        >
          <div className="w-full max-w-md p-5 sm:p-7 rounded-2xl bg-black/65 backdrop-blur-xl border border-white/10 shadow-2xl space-y-3">
            <span className="text-[9.5px] sm:text-[10px] font-mono uppercase tracking-[0.25em] text-amber-300">
              {SCENES[1].tag}
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-light tracking-tight leading-snug uppercase whitespace-pre-line text-white">
              {SCENES[1].title}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 font-light leading-relaxed">
              {SCENES[1].subtitle}
            </p>
            {SCENES[1].stats && (
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                {SCENES[1].stats.map((stat, i) => (
                  <div key={i}>
                    <p className="text-[9px] sm:text-[9.5px] font-mono tracking-wider text-neutral-400 uppercase">{stat.label}</p>
                    <p className="text-xs sm:text-sm md:text-base font-medium text-white tracking-wide">{stat.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* SCENE 2: INTERIORS */}
        <section
          id="scene-2"
          className="scene-overlay min-h-[120dvh] flex items-center justify-center md:justify-end px-4 sm:px-8 md:px-16 lg:px-24 py-16"
        >
          <div className="w-full max-w-md p-5 sm:p-7 rounded-2xl bg-black/65 backdrop-blur-xl border border-white/10 shadow-2xl space-y-3">
            <span className="text-[9.5px] sm:text-[10px] font-mono uppercase tracking-[0.25em] text-amber-300">
              {SCENES[2].tag}
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-light tracking-tight leading-snug uppercase whitespace-pre-line text-white">
              {SCENES[2].title}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 font-light leading-relaxed">
              {SCENES[2].subtitle}
            </p>
            {SCENES[2].stats && (
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                {SCENES[2].stats.map((stat, i) => (
                  <div key={i}>
                    <p className="text-[9px] sm:text-[9.5px] font-mono tracking-wider text-neutral-400 uppercase">{stat.label}</p>
                    <p className="text-xs sm:text-sm md:text-base font-medium text-white tracking-wide">{stat.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* SCENE 3: WELLNESS */}
        <section
          id="scene-3"
          className="scene-overlay min-h-[120dvh] flex items-center justify-center md:justify-start px-4 sm:px-8 md:px-16 lg:px-24 py-16"
        >
          <div className="w-full max-w-md p-5 sm:p-7 rounded-2xl bg-black/65 backdrop-blur-xl border border-white/10 shadow-2xl space-y-3">
            <span className="text-[9.5px] sm:text-[10px] font-mono uppercase tracking-[0.25em] text-amber-300">
              {SCENES[3].tag}
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-light tracking-tight leading-snug uppercase whitespace-pre-line text-white">
              {SCENES[3].title}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 font-light leading-relaxed">
              {SCENES[3].subtitle}
            </p>
            {SCENES[3].stats && (
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                {SCENES[3].stats.map((stat, i) => (
                  <div key={i}>
                    <p className="text-[9px] sm:text-[9.5px] font-mono tracking-wider text-neutral-400 uppercase">{stat.label}</p>
                    <p className="text-xs sm:text-sm md:text-base font-medium text-white tracking-wide">{stat.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* SCENE 4: CTA / INQUIRE */}
        <section
          id="scene-4"
          className="scene-overlay min-h-[120dvh] flex flex-col items-center justify-center text-center px-4 sm:px-6 py-20"
        >
          <div className="w-full max-w-lg mx-auto p-6 sm:p-8 md:p-10 rounded-2xl bg-black/75 backdrop-blur-2xl border border-white/15 shadow-2xl space-y-4">
            <span className="text-[9.5px] sm:text-[10px] font-mono uppercase tracking-[0.25em] text-amber-300">
              {SCENES[4].tag}
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tight leading-tight uppercase text-white">
              {SCENES[4].title}
            </h2>
            <p className="max-w-sm mx-auto text-xs sm:text-sm text-neutral-300 font-light leading-relaxed">
              {SCENES[4].subtitle}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("Thank you for your interest. A private portfolio manager will reach out shortly.");
              }}
              className="flex flex-col sm:flex-row gap-2.5 max-w-sm mx-auto pt-2"
            >
              <input
                type="email"
                placeholder="Enter your private email"
                required
                className="w-full px-4 py-2.5 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-300 text-xs"
              />
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-white text-black font-medium uppercase tracking-wider text-xs hover:bg-amber-300 transition-all duration-200 whitespace-nowrap min-h-[38px]"
              >
                Inquire
              </button>
            </form>

            <div className="pt-4 sm:pt-5 border-t border-white/10 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[9.5px] sm:text-[10px] font-mono text-neutral-400">
              <span>📍 BEVERLY HILLS, CA</span>
              <span>🔒 PRIVATE OFF-MARKET</span>
              <span>📞 +1 (800) 555-VILLA</span>
            </div>
          </div>
        </section>
      </div>

      {/* ── RESPONSIVE FOOTER ─────────────────────────────────────────── */}
      <footer className="relative z-20 py-5 px-4 sm:px-8 md:px-12 border-t border-white/10 bg-black/95 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between text-[10.5px] sm:text-[11px] text-neutral-500 font-mono gap-3 text-center sm:text-left">
        <div>© 2026 SOLIS LUXURY ESTATES. ALL RIGHTS RESERVED.</div>
        <div className="flex items-center justify-center space-x-4 sm:space-x-6">
          <a href="#" className="hover:text-white transition-colors">PRIVACY</a>
          <a href="#" className="hover:text-white transition-colors">TERMS</a>
          <a href="#" className="hover:text-white transition-colors">CONTACT</a>
        </div>
      </footer>
    </div>
  );
}
