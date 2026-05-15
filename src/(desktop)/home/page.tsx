"use client";

import { useState } from "react";
import CRTScreen from "../../_components/BackgroundScreen";

interface Window {
  id: string;
  title: string;
  content: React.ReactNode;
  x: number;
  y: number;
  minimised: boolean;
}

const INITIAL_WINDOWS: Window[] = [
  {
    id: "about",
    title: "ABOUT.exe",
    content: (
      <div className="space-y-2 p-4 text-[16px] leading-7">
        <p className="text-accent-green">► Who am I?</p>
        <p className="text-accent-green/80">
          Junior Full-stack developer based in Eskişehir.
          I build interactive web experiences that blur the line
          between design and engineering.
        </p>
        <p className="mt-3 text-accent-green">► Stack</p>
        <p className="text-accent-green/80">
          TypeScript · Next.js · React
        </p>
      </div>
    ),
    x: 60,
    y: 60,
    minimised: false,
  },
  {
    id: "projects",
    title: "PROJECTS.exe",
    content: (
      <div className="space-y-3 p-4 text-[16px] leading-7">
        <p className="text-accent-green">── No entries yet ──</p>
        <p className="text-accent-green/50 text-sm">Coming soon...</p>
      </div>
    ),
    x: 180,
    y: 100,
    minimised: true,
  },
  {
    id: "skills",
    title: "SKILLS.exe",
    content: (
      <div className="space-y-2 p-4 text-[16px] leading-7">
        <p className="text-accent-green">── No entries yet ──</p>
        <p className="text-accent-green/50 text-sm">Coming soon...</p>
      </div>
    ),
    x: 300,
    y: 140,
    minimised: true,
  },
  {
    id: "contact",
    title: "CONTACT.exe",
    content: (
      <div className="space-y-2 p-4 text-[16px] leading-7">
        <p className="text-accent-green">── No entries yet ──</p>
        <p className="text-accent-green/50 text-sm">Coming soon...</p>
      </div>
    ),
    x: 420,
    y: 180,
    minimised: true,
  },
];

function WindowFrame({
  win,
  onClose,
  onMinimise,
  onFocus,
  zIndex,
}: {
  win: Window;
  onClose: () => void;
  onMinimise: () => void;
  onFocus: () => void;
  zIndex: number;
}) {
  if (win.minimised) return null;

  return (
    <div
      className="absolute min-w-[320px] border border-accent-green/50 bg-[#0c0c0c] shadow-[0_0_20px_rgba(0,255,133,0.08)]"
      style={{ left: win.x, top: win.y, zIndex }}
      onMouseDown={onFocus}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-accent-green/30 bg-accent-green/10 px-3 py-1">
        <span className="text-[14px] tracking-widest text-accent-green [text-shadow:0_0_6px_var(--color-accent-green)]">
          {win.title}
        </span>
        <div className="flex gap-2">
          <button
            onClick={onMinimise}
            className="px-2 text-[13px] text-accent-green/60 hover:text-accent-green"
          >
            _
          </button>
          <button
            onClick={onClose}
            className="px-2 text-[13px] text-accent-green/60 hover:text-red-400"
          >
            ✕
          </button>
        </div>
      </div>
      {/* Body */}
      <div className="min-h-[120px] text-accent-green/80">{win.content}</div>
    </div>
  );
}

export default function Desktop() {
  const [windows, setWindows] = useState(INITIAL_WINDOWS);
  const [focusOrder, setFocusOrder] = useState(INITIAL_WINDOWS.map((w) => w.id));
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString());

  // Update clock
  useState(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  });

  function focusWindow(id: string) {
    setFocusOrder((prev) => [...prev.filter((x) => x !== id), id]);
  }

  function closeWindow(id: string) {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  }

  function toggleMinimise(id: string) {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, minimised: !w.minimised } : w)),
    );
  }

  function openWindow(id: string) {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, minimised: false } : w)),
    );
    focusWindow(id);
  }

  return (
    <CRTScreen>
      {/* Desktop area */}
      <div className="relative h-screen w-screen overflow-hidden">
        {/* Desktop label */}
        <p className="absolute left-6 top-5 text-[12px] tracking-[0.2em] text-accent-green/30">
          OG-OS DESKTOP v1.0
        </p>

        {/* Windows */}
        {windows.map((win) => (
          <WindowFrame
            key={win.id}
            win={win}
            zIndex={focusOrder.indexOf(win.id) + 10}
            onClose={() => closeWindow(win.id)}
            onMinimise={() => toggleMinimise(win.id)}
            onFocus={() => focusWindow(win.id)}
          />
        ))}

        {/* Taskbar */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 border-t border-accent-green/30 bg-[#0c0c0c] px-4 py-1">
          <span className="mr-3 text-[13px] tracking-widest text-accent-green [text-shadow:0_0_6px_var(--color-accent-green)]">
            OG-OS
          </span>
          <span className="mr-3 h-4 w-px bg-accent-green/30" />
          {INITIAL_WINDOWS.map((win) => {
            const current = windows.find((w) => w.id === win.id);
            const isOpen = !!current;
            const isMin = current?.minimised ?? false;
            return (
              <button
                key={win.id}
                onClick={() => (isOpen ? toggleMinimise(win.id) : openWindow(win.id))}
                className={`border px-3 py-0.5 text-[13px] tracking-wider transition-colors ${
                  isOpen && !isMin
                    ? "border-accent-green/60 text-accent-green"
                    : "border-accent-green/20 text-accent-green/40 hover:border-accent-green/50 hover:text-accent-green/80"
                }`}
              >
                {win.title}
              </button>
            );
          })}
          <span className="ml-auto text-[13px] tracking-widest text-accent-green/60">
            {clock}
          </span>
        </div>
      </div>
    </CRTScreen>
  );
}
