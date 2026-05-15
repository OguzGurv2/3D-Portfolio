"use client";

import { useEffect, useRef, useState } from "react";

const FRAME_COUNT = 125;
const AUTOPLAY_SPEED = 0.9;
const FADE_START_RATIO = 0.82;
const FADE_DURATION_MS = 650;

const viewportClassName = "fixed inset-0 z-0 isolate font-sans";
const canvasClassName = "absolute inset-0 z-0 block h-screen w-screen transition-opacity duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-opacity";
const hintClassName = "fixed pointer-events-none bottom-[calc(env(safe-area-inset-bottom)+1.75rem)] left-1/2 z-50 flex -translate-x-1/2 animate-[hint-slide-in_1s_ease-out] items-center gap-2 text-[#f2f2f2]";
const hintTextClassName = "text-[12px] tracking-[0.08em]";
const hintIconsClassName = "flex flex-col items-center gap-0.5";
const hintChevronClassName = "text-[12px]";
const hintChevronUpClassName = "animate-[hint-chevron-up_1.4s_ease-in-out_infinite]";
const hintMouseClassName = "text-[18px] leading-none";
const hintChevronDownClassName = "animate-[hint-chevron-down_1.4s_ease-in-out_infinite]";

interface ScrollAnimationProps {
  onComplete?: () => void;
}

function getFrameSrc(index: number): string {
  const padded = String(index).padStart(3, "0");
  return `/render/Sequence5_${padded}.webp`;
}

interface FrameData {
  img: HTMLImageElement;
  iw: number;
  ih: number;
}

function loadFrame(index: number, frames: FrameData[]): Promise<void> {
  const img = new Image();
  img.src = getFrameSrc(index);

  return new Promise<void>((resolve) => {
    const onReady = async () => {
      try {
        await img.decode();
      } catch {}

      frames[index] = {
        img,
        iw: img.naturalWidth,
        ih: img.naturalHeight,
      };
      resolve();
    };

    if (img.complete && img.naturalWidth > 0) {
      onReady();
      return;
    }

    img.onload = () => onReady();
    img.onerror = () => resolve();
  });
}

function drawFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  frame: FrameData,
) {
  const cw = canvas.width;
  const ch = canvas.height;
  const { img, iw, ih } = frame;

  const scale = Math.max(cw / iw, ch / ih);
  const sw = iw * scale;
  const sh = ih * scale;
  const sx = (cw - sw) / 2;
  const sy = (ch - sh) / 2;

  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(img, sx, sy, sw, sh);
}

function ScrollHint() {
  return (
    <div className={hintClassName}>
      <p className={hintTextClassName}>SCROLL DOWN TO START</p>
      <div className={hintIconsClassName}>
        <i
          className={`bi bi-chevron-compact-up ${hintChevronClassName} ${hintChevronUpClassName}`}
          aria-hidden="true"
        />
        <i className={`bi bi-mouse ${hintMouseClassName}`} aria-hidden="true" />
        <i
          className={`bi bi-chevron-compact-down ${hintChevronClassName} ${hintChevronDownClassName}`}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export default function ScrollAnimation({ onComplete }: ScrollAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const canvas = canvasElement;

    const context = canvas.getContext("2d", { desynchronized: true });
    if (!context) return;

    const ctx = context;

    let cancelled = false;
    let lastDrawnFrame = -1;
    let fading = false;
    let autoplaying = false;
    let allFramesReady = false;
    let allowPageScroll = false;
    let hasCompleted = false;
    let currentProgress = 0;
    let rafId: number | null = null;
    let fadeUnlockTimeoutId: number | null = null;
    const fadeStartFrame = Math.floor((FRAME_COUNT - 1) * FADE_START_RATIO);
    const frames: FrameData[] = new Array(FRAME_COUNT);

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function renderFrame(index: number) {
      const frame = frames[index];
      if (!frame) return;

      drawFrameToCanvas(ctx, canvas, frame);
    }

    function render() {
      if (cancelled) return;

      if (autoplaying) {
        currentProgress = Math.min(FRAME_COUNT - 1, currentProgress + AUTOPLAY_SPEED);
      }

      const frameIndex = Math.min(Math.round(currentProgress), FRAME_COUNT - 1);
      if (frameIndex !== lastDrawnFrame) {
        renderFrame(frameIndex);
        lastDrawnFrame = frameIndex;
      }

      if (autoplaying && !fading && frameIndex >= fadeStartFrame) {
        fading = true;
        canvas.style.opacity = "0";

        fadeUnlockTimeoutId = window.setTimeout(() => {
          if (cancelled) return;
          allowPageScroll = true;
        }, FADE_DURATION_MS);
      }

      if (autoplaying && frameIndex >= FRAME_COUNT - 1) {
        autoplaying = false;
        if (!hasCompleted) {
          hasCompleted = true;
          onComplete?.();
        }
        return;
      }

      rafId = requestAnimationFrame(render);
    }

    function onWheel(event: WheelEvent) {
      if (!allowPageScroll) {
        event.preventDefault();
      }

      if (autoplaying || fading) return;
      if (!allFramesReady) return;
      if (event.deltaY <= 0) return;

      autoplaying = true;
      setHasStarted(true);

      if (rafId == null) {
        rafId = requestAnimationFrame(render);
      }
    }

    function onResize() {
      resizeCanvas();
      lastDrawnFrame = -1;
      renderFrame(Math.min(Math.round(currentProgress), FRAME_COUNT - 1));
    }

    resizeCanvas();
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);

    loadFrame(0, frames).then(() => {
      if (cancelled) return;

      renderFrame(0);

      const remainingLoads: Promise<void>[] = [];
      for (let i = 1; i < FRAME_COUNT; i++) {
        remainingLoads.push(loadFrame(i, frames));
      }

      Promise.all(remainingLoads).then(() => {
        if (cancelled) return;

        allFramesReady = true;
        allowPageScroll = true;
        setIsReady(true);
      });
    });

    return () => {
      cancelled = true;
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);

      if (fadeUnlockTimeoutId != null) {
        clearTimeout(fadeUnlockTimeoutId);
      }

      if (rafId != null) {
        cancelAnimationFrame(rafId);
      }

      canvas.style.opacity = "1";
    };
  }, [onComplete]);

  return (
    <div className={viewportClassName}>
      <canvas ref={canvasRef} className={canvasClassName} />
      {isReady && !hasStarted ? <ScrollHint /> : null}
    </div>
  );
}
