"use client";

import { useRef } from "react";
import CRTScreen from "./CRTScreen";
import { useCRTCanvas } from "./three/useCRTCanvas";
import { ACCENT, BG, FONT } from "../_constants/crt";

function drawLoading(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dots: number,
) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  // Phosphor bloom
  const bloom = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.55);
  bloom.addColorStop(0, "rgba(0,255,133,0.07)");
  bloom.addColorStop(1, "transparent");
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, w, h);

  const dotStr = ".".repeat(dots);
  const text   = `Loading${dotStr}`;
  ctx.font        = `${Math.round(h * 0.042)}px ${FONT}`;
  ctx.fillStyle   = ACCENT;
  ctx.shadowBlur  = 14;
  ctx.shadowColor = "rgba(0,255,133,0.4)";
  ctx.fillText(text, Math.round(w * 0.045), Math.round(h * 0.1));
  ctx.shadowBlur  = 0;
}

export default function LoadingScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef({ dots: 0, lastDotTime: 0 });

  useCRTCanvas(canvasRef, (ctx, w, h, t) => {
    const ms = t * 1000;
    if (ms - animRef.current.lastDotTime > 400) {
      animRef.current.dots = (animRef.current.dots + 1) % 4;
      animRef.current.lastDotTime = ms;
    }
    drawLoading(ctx, w, h, animRef.current.dots);
  }, []);

  return (
    <CRTScreen>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </CRTScreen>
  );
}
