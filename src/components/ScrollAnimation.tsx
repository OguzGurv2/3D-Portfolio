"use client";

import { useEffect, useRef, useState } from "react";

const FRAME_COUNT = 125;
const SCROLL_SENSITIVITY = 3.6; // pixels of deltaY per "scroll unit"

function getFrameSrc(index: number): string {
  const padded = String(index).padStart(3, "0");
  return `/render/Sequence5_${padded}.webp`;
}

interface FrameData {
  img: HTMLImageElement;
  iw: number;
  ih: number;
}

export default function ScrollAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { desynchronized: true });
    if (!ctx) return;

    let cancelled = false;
    let lastDrawnFrame = -1;
    let fading = false; // whether auto-fade is active

    const maxProgress = FRAME_COUNT - 1;
    let targetProgress = 0;
    let currentProgress = 0;
    const LERP_SPEED = 0.08;

    function resizeCanvas() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resizeCanvas();

    const frames: FrameData[] = [];

    const imagePromises: Promise<void>[] = [];
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.src = getFrameSrc(i);
      imagePromises.push(
        new Promise<void>((resolve) => {
          const onReady = async () => {
            try { await img.decode(); } catch {}
            frames[i] = { img, iw: img.naturalWidth, ih: img.naturalHeight };
            resolve();
          };
          if (img.complete && img.naturalWidth > 0) {
            onReady();
          } else {
            img.onload = () => onReady();
            img.onerror = () => resolve();
          }
        })
      );
    }

    function drawFrame(index: number) {
      if (!ctx || !canvas) return;
      const frame = frames[index];
      if (!frame) return;

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

    function render() {
      if (!canvas) return;

      // Lerp toward target
      currentProgress += (targetProgress - currentProgress) * LERP_SPEED;

      // Snap when very close to avoid endless loop
      if (Math.abs(targetProgress - currentProgress) < 0.01) {
        currentProgress = targetProgress;
      }

      // Frame index: 0 to 124
      const frameIndex = Math.min(Math.round(currentProgress), FRAME_COUNT - 1);

      // Only redraw if frame changed
      if (frameIndex !== lastDrawnFrame) {
        drawFrame(frameIndex);
        lastDrawnFrame = frameIndex;
      }

      // Opacity: handled by CSS transition, not lerp
      if (!fading) {
        canvas.style.opacity = "1";
      }

      // Keep looping if not settled
      if (Math.abs(targetProgress - currentProgress) > 0.01) {
        requestAnimationFrame(render);
      }
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const delta = e.deltaY / (100 / SCROLL_SENSITIVITY);

      // Already at last frame
      if (currentProgress >= FRAME_COUNT - 1 && delta > 0) {
        // One scroll down triggers fade
        if (!fading) {
          fading = true;
          if (canvas) {
            canvas.style.transition = "opacity 1.5s ease";
            canvas.style.opacity = "0";
          }
        }
        return;
      }

      // Scrolling back up while faded
      if (fading && delta < 0) {
        fading = false;
        if (canvas) {
          canvas.style.transition = "opacity 1.5s ease";
          canvas.style.opacity = "1";
        }
        return;
      }

      targetProgress = Math.max(0, Math.min(maxProgress, targetProgress + delta));
      requestAnimationFrame(render);
    }

    function onResize() {
      resizeCanvas();
      lastDrawnFrame = -1;
      render();
    }

    window.addEventListener("resize", onResize);

    Promise.all(imagePromises).then(() => {
      if (cancelled) return;
      setLoading(false);
      requestAnimationFrame(() => drawFrame(0));
      window.addEventListener("wheel", onWheel, { passive: false });
    });

    return () => {
      cancelled = true;
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      if (canvas) canvas.style.opacity = "1";
    };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      {loading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#444444",
            zIndex: 10,
          }}
        >
          <div className="loader" />
          <style>{`
            .loader {
              width: 40px;
              height: 40px;
              border: 4px solid rgba(255,255,255,0.2);
              border-top-color: #fff;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{
          width: "100vw",
          height: "100vh",
          display: "block",
        }}
      />
    </div>
  );
}
