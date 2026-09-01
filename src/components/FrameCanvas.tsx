"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ── Config ──────────────────────────────────────────────────────────────────
const TOTAL_FRAMES = 593;
const FRAME_PATH = "/frames/frame_"; // e.g. /frames/frame_0001.jpg

/** Zero-pad a number to 4 digits */
function padFrame(n: number): string {
  return String(n).padStart(4, "0");
}

/** Build the URL for a given frame index (1-based) */
function frameSrc(index: number): string {
  return `${FRAME_PATH}${padFrame(index)}.jpg`;
}

// ── Component ───────────────────────────────────────────────────────────────
export default function FrameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>(
    new Array(TOTAL_FRAMES).fill(null)
  );
  const [progress, setProgress] = useState(0); // 0 → 100
  const [isLoaded, setIsLoaded] = useState(false);
  const currentFrameRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // ── Draw a specific frame onto the canvas ─────────────────────────────
  const drawFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imagesRef.current[frameIndex];
    if (!img) return;

    // Resize canvas to match the window (retina-aware)
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
    }

    // Cover-fit the image (like background-size: cover)
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = w / h;

    let drawW: number, drawH: number, offsetX: number, offsetY: number;

    if (imgRatio > canvasRatio) {
      // Image is wider → fit height, crop sides
      drawH = h;
      drawW = h * imgRatio;
      offsetX = (w - drawW) / 2;
      offsetY = 0;
    } else {
      // Image is taller → fit width, crop top/bottom
      drawW = w;
      drawH = w / imgRatio;
      offsetX = 0;
      offsetY = (h - drawH) / 2;
    }

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
  }, []);

  // ── Render the first frame once loaded ────────────────────────────────
  const renderFirstFrame = useCallback(() => {
    if (imagesRef.current[0]) {
      drawFrame(0);
    }
  }, [drawFrame]);

  // ── Preload all frames ────────────────────────────────────────────────
  useEffect(() => {
    let loadedCount = 0;
    let cancelled = false;

    // Concurrency limiter: load N images at a time to avoid overwhelming
    const CONCURRENCY = 10;
    let nextIndex = 0;

    function loadNext() {
      if (cancelled) return;
      if (nextIndex >= TOTAL_FRAMES) return;

      const idx = nextIndex++;
      const img = new Image();
      img.src = frameSrc(idx + 1); // 1-based filenames

      img.onload = () => {
        if (cancelled) return;
        imagesRef.current[idx] = img;
        loadedCount++;

        const pct = Math.round((loadedCount / TOTAL_FRAMES) * 100);
        setProgress(pct);

        // Draw first frame as soon as it loads
        if (idx === 0) {
          renderFirstFrame();
        }

        if (loadedCount >= TOTAL_FRAMES) {
          setIsLoaded(true);
        }

        // Load the next one in queue
        loadNext();
      };

      img.onerror = () => {
        if (cancelled) return;
        // Skip failed frames, still count them
        loadedCount++;
        const pct = Math.round((loadedCount / TOTAL_FRAMES) * 100);
        setProgress(pct);

        if (loadedCount >= TOTAL_FRAMES) {
          setIsLoaded(true);
        }

        loadNext();
      };
    }

    // Kick off initial batch
    for (let i = 0; i < CONCURRENCY; i++) {
      loadNext();
    }

    return () => {
      cancelled = true;
    };
  }, [renderFirstFrame]);

  // ── Handle window resize ──────────────────────────────────────────────
  useEffect(() => {
    function onResize() {
      drawFrame(currentFrameRef.current);
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [drawFrame]);

  // ── Public API: expose setFrame for parent (scroll controller) ────────
  // This is stored on the canvas element as a data attribute for now;
  // scroll-linking will call this later.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Attach a setter the scroll controller can call
    (canvas as HTMLCanvasElement & { __setFrame?: (n: number) => void }).__setFrame =
      (frameIndex: number) => {
        const clamped = Math.max(0, Math.min(TOTAL_FRAMES - 1, frameIndex));
        if (clamped !== currentFrameRef.current) {
          currentFrameRef.current = clamped;
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(() => drawFrame(clamped));
        }
      };
  }, [drawFrame]);

  return (
    <>
      {/* ── Preloader overlay ──────────────────────────────────────────── */}
      <div
        className={`preloader ${isLoaded ? "preloader--hidden" : ""}`}
        aria-hidden={isLoaded}
      >
        <div className="preloader__content">
          <div className="preloader__percentage">{progress}%</div>
          <div className="preloader__bar-track">
            <div
              className="preloader__bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="preloader__label">Loading experience</p>
        </div>
      </div>

      {/* ── Canvas ─────────────────────────────────────────────────────── */}
      <canvas
        ref={canvasRef}
        className="frame-canvas"
        id="frame-sequence"
      />
    </>
  );
}
