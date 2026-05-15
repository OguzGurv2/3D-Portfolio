export default function BackgroundScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden rounded-[4%/6%] bg-[#0c0c0c]">
      {/* Phosphor bloom — ambient green glow behind content */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 animate-[crt-glow-pulse_4s_ease-in-out_infinite] [background:radial-gradient(ellipse_55%_40%_at_50%_50%,rgba(0,255,133,0.07)_0%,transparent_70%)]"
      />

      {/* Content — padded away from the rounded CRT corners */}
      <div className="relative z-10 h-full w-full">{children}</div>

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
    </div>
  );
}
