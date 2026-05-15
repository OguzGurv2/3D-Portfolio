"use client";

import CRTScreen from "./CRTScreen";

export default function LoadingScreen() {
  return (
    <CRTScreen>
      <p className="flex text-[40px] text-accent-green animate-[text-glitch-in_2s_ease-out_forwards,text-glitch-idle_5s_ease-in-out_2s_infinite] [text-shadow:0_0_4px_var(--color-accent-green),0_0_10px_rgba(0,255,133,0.25)]">
        Loading
        <span className="inline-flex w-[1.8em] justify-start" aria-hidden="true">
          <span className="opacity-100">.</span>
          <span className="animate-[dot-second_1.2s_linear_infinite] opacity-0">.</span>
          <span className="animate-[dot-third_1.2s_linear_infinite] opacity-0">.</span>
        </span>
      </p>
    </CRTScreen>
  );
}
