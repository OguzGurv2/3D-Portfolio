"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const FRAME_COUNT = 125;

function getFrameSrc(index: number): string {
  const padded = String(index).padStart(3, "0");
  return `/render/Sequence5_${padded}.webp`;
}

export default function ScrollAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;

    // Set canvas to viewport size
    function resizeCanvas() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resizeCanvas();

    // Preload all images, then set up ScrollTrigger
    const images: HTMLImageElement[] = [];
    const frameObj = { current: 0 };

    const imagePromises: Promise<void>[] = [];
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      images[i] = img;
      img.src = getFrameSrc(i);
      imagePromises.push(
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        })
      );
    }
    imagesRef.current = images;

    // Draw image covering the canvas (like object-fit: cover)
    function drawFrame(index: number) {
      if (!ctx || !canvas) return;
      const img = imagesRef.current[index];
      if (!img || !img.complete) return;

      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;

      const scale = Math.max(cw / iw, ch / ih);
      const sw = iw * scale;
      const sh = ih * scale;
      const sx = (cw - sw) / 2;
      const sy = (ch - sh) / 2;

      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, sx, sy, sw, sh);
    }

    function onResize() {
      resizeCanvas();
      drawFrame(Math.round(frameObj.current));
    }
    window.addEventListener("resize", onResize);

    // Wait for all images, then init
    Promise.all(imagePromises).then(() => {
      if (cancelled) return;
      setLoading(false);
      drawFrame(0);

      gsap.to(frameObj, {
        current: FRAME_COUNT - 1,
        ease: "none",
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: "bottom top",
          scrub: 0.5,
          pin: canvas,
        },
        onUpdate: () => drawFrame(Math.round(frameObj.current)),
      });
    });

    return () => {
      cancelled = true;
      ScrollTrigger.getAll().forEach((t) => t.kill());
      gsap.killTweensOf(frameObj);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ height: "600vh", position: "relative" }}>
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
