"use client";

import { useEffect, useState } from "react";
import CRTLensOverlay from "./CRTLensOverlay";

// ── Barrel displacement map ───────────────────────────────────────────────────
// Each pixel encodes how far to shift the source sample for that screen position.
// R channel = X displacement, G channel = Y displacement.
// 128 → no shift; below 128 → shift toward centre (barrel / fisheye bulge).
//
// Formula: shift = -k · r² · (component)   (negative = pull toward centre)
// This makes screen edges sample from closer to centre → content bows outward
// like a convex CRT phosphor surface.
const MAP_SIZE = 256;
const BARREL_K = 480; // strength — higher = more pronounced curve

function buildBarrelMap(): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = MAP_SIZE;
  canvas.height = MAP_SIZE;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(MAP_SIZE, MAP_SIZE);

  for (let py = 0; py < MAP_SIZE; py++) {
    for (let px = 0; px < MAP_SIZE; px++) {
      const nx = px / MAP_SIZE - 0.5; // [-0.5, 0.5]
      const ny = py / MAP_SIZE - 0.5;
      const r2 = nx * nx + ny * ny;
      // Pull sample toward centre → barrel outward bulge
      const R = Math.max(0, Math.min(255, Math.round(128 - nx * r2 * BARREL_K)));
      const G = Math.max(0, Math.min(255, Math.round(128 - ny * r2 * BARREL_K)));
      const i = (py * MAP_SIZE + px) * 4;
      img.data[i]     = R;
      img.data[i + 1] = G;
      img.data[i + 2] = 0;
      img.data[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}
// ─────────────────────────────────────────────────────────────────────────────

export default function BackgroundScreen({ children }: { children: React.ReactNode }) {
  const [mapUrl, setMapUrl] = useState("");

  useEffect(() => {
    setMapUrl(buildBarrelMap());
  }, []);

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden rounded-[4%/6%] bg-[#0c0c0c]">

      {/* SVG filter definition — referenced by id below */}
      <svg width="0" height="0" className="absolute overflow-visible" aria-hidden="true">
        <defs>
          <filter
            id="crt-barrel"
            x="-5%" y="-5%" width="110%" height="110%"
            colorInterpolationFilters="sRGB"
          >
            {mapUrl && (
              <feImage
                href={mapUrl}
                result="dispmap"
                preserveAspectRatio="none"
                x="0%" y="0%" width="100%" height="100%"
              />
            )}
            <feDisplacementMap
              in="SourceGraphic"
              in2="dispmap"
              scale={72}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Phosphor bloom — ambient green glow behind content */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 animate-[crt-glow-pulse_4s_ease-in-out_infinite] [background:radial-gradient(ellipse_55%_40%_at_50%_50%,rgba(0,255,133,0.07)_0%,transparent_70%)]"
      />

      {/* Content — barrel distortion applied via SVG filter */}
      <div
        className="relative z-10 h-full w-full"
        style={mapUrl ? { filter: "url(#crt-barrel)" } : undefined}
      >
        {children}
      </div>

      {/* Scanlines */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 [background:repeating-linear-gradient(0deg,transparent_0px,transparent_2px,rgba(0,0,0,0.13)_2px,rgba(0,0,0,0.13)_4px)]"
      />

      {/* Fisheye vignette — heavy radial dark rim simulates curved CRT glass */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 [background:radial-gradient(ellipse_68%_68%_at_50%_50%,transparent_38%,rgba(0,0,0,0.17)_100%)]"
      />

      {/* Screen-curve edge glow — thin convex highlight at the rim */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 rounded-[4%/6%] [box-shadow:inset_0_0_0_2px_rgba(255,255,255,0.04),inset_0_0_80px_20px_rgba(0,0,0,0.7)]"
      />

      {/* CRT flicker */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 animate-[crt-flicker_6s_steps(1,end)_infinite] opacity-0"
      />

      {/* WebGL barrel-distortion lens — curved CRT glass effect */}
      <CRTLensOverlay />
    </div>
  );
}
