/**
 * CRTScreen
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared bezel wrapper for every screen (Loading, Login, Desktop).
 * Provides the CRT oval shape, overflow clip, and retro monitor frame overlay.
 * Each screen renders its own <canvas> as a direct child.
 */

export default function CRTScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-screen w-full overflow-hidden rounded-[4%/6%] bg-[#0c0c0c]">
      {children}
      {/* Retro CRT monitor frame: white hairline border + heavy edge shadow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[4%/6%]"
        style={{ boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.06), inset 0 0 80px 20px rgba(0,0,0,0.25)" }}
      />
    </div>
  );
}
