"use client";
import BackgroundScreen from "./BackgroundScreen";

export default function LoadingScreen() {
  return (
    <BackgroundScreen>
      {/* Scanlines */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background:repeating-linear-gradient(0deg,transparent_0px,transparent_2px,rgba(0,0,0,0.13)_2px,rgba(0,0,0,0.13)_4px)]"
      />
      {/* Vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_68%_68%_at_50%_50%,transparent_38%,rgba(0,0,0,0.97)_100%)]"
      />

      {/* Text — top left */}
      <p className="fixed left-8 top-8 z-50 flex text-[28px] text-accent-green animate-[text-glitch-idle_5s_ease-in-out_infinite] [text-shadow:0_0_4px_var(--color-accent-green),0_0_10px_rgba(0,255,133,0.25)]">
        Loading
        <span className="inline-flex w-[1.8em] justify-start" aria-hidden="true">
          <span className="opacity-100">.</span>
          <span className="animate-[dot-second_1.2s_linear_infinite] opacity-0">.</span>
          <span className="animate-[dot-third_1.2s_linear_infinite] opacity-0">.</span>
        </span>
      </p>
    </BackgroundScreen>
  );
}
