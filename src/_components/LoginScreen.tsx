"use client";

import { useState, useEffect } from "react";
import CRTScreen from "./BackgroundScreen";

const SYSTEM_LINES = [
  "OG-OS  v1.0.0  [Build 1999]",
  "Copyright (C) Oguz Gur. All rights reserved.",
  "",
  "Checking system integrity........  OK",
  "Loading user profiles..............  OK",
  "Initialising display adapter.......  OK",
  "",
];

const USERNAME = "oguz.gur";
const PASSWORD = "••••••••";

const AUTH_MESSAGES = [
  "Authenticating",
  "Authenticating.",
  "Authenticating..",
  "Authenticating...",
  "Verifying credentials...",
  "Access granted.",
];

interface LoginScreenProps {
  onLogin: () => void;
}

type Phase = "boot" | "show" | "type" | "auth";

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [bootLine, setBootLine] = useState(0);
  const [phase, setPhase] = useState<Phase>("boot");
  const [typedUser, setTypedUser] = useState("");
  const [typedPass, setTypedPass] = useState("");
  const [authIndex, setAuthIndex] = useState(0);

  // Boot sequence
  useEffect(() => {
    if (phase !== "boot") return;
    if (bootLine >= SYSTEM_LINES.length) {
      const t = setTimeout(() => setPhase("show"), 500);
      return () => clearTimeout(t);
    }
    const delay = SYSTEM_LINES[bootLine] === "" ? 80 : 130;
    const t = setTimeout(() => setBootLine((n) => n + 1), delay);
    return () => clearTimeout(t);
  }, [phase, bootLine]);

  // Brief pause showing empty rows before typing begins
  useEffect(() => {
    if (phase !== "show") return;
    const t = setTimeout(() => setPhase("type"), 800);
    return () => clearTimeout(t);
  }, [phase]);

  // Type username first, then password
  useEffect(() => {
    if (phase !== "type") return;
    const userDone = typedUser.length >= USERNAME.length;
    const passDone = typedPass.length >= PASSWORD.length;
    if (userDone && passDone) {
      const t = setTimeout(() => setPhase("auth"), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      if (!userDone) {
        setTypedUser(USERNAME.slice(0, typedUser.length + 1));
      } else {
        setTypedPass(PASSWORD.slice(0, typedPass.length + 1));
      }
    }, 100 + Math.random() * 60);
    return () => clearTimeout(t);
  }, [phase, typedUser, typedPass]);

  // Auth sequence
  useEffect(() => {
    if (phase !== "auth") return;
    if (authIndex < AUTH_MESSAGES.length - 1) {
      const t = setTimeout(() => setAuthIndex((n) => n + 1), 340);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => onLogin(), 700);
    return () => clearTimeout(t);
  }, [phase, authIndex, onLogin]);

  const showCursor = phase === "type";

  return (
    <CRTScreen>
      <div className="w-[min(560px,90vw)] font-[var(--font-body),monospace] text-accent-green [text-shadow:0_0_4px_var(--color-accent-green),0_0_10px_rgba(0,255,133,0.25)]">

        {/* Boot log */}
        <div className="mb-6 border border-accent-green/40 px-5 py-3 text-[17px] leading-7">
          {SYSTEM_LINES.slice(0, bootLine).map((line, i) => (
            <p key={i} className="min-h-[1.75em] animate-[text-glitch-idle_5s_ease-in-out_infinite] tracking-wide">
              {line || "\u00a0"}
            </p>
          ))}
          {phase === "boot" && (
            <span className="animate-[blink_0.7s_steps(1,end)_infinite]">█</span>
          )}
        </div>

        {/* Login rows — appear after boot, both visible before typing starts */}
        {phase !== "boot" && (
          <div className="space-y-4 text-[20px]">
            <p className="mb-5 animate-[text-glitch-idle_5s_ease-in-out_infinite] tracking-[0.2em] text-accent-green/60">
              ── USER IDENTIFICATION ──
            </p>

            {/* Username row */}
            <div className="flex items-center gap-3">
              <span className="w-28 shrink-0 animate-[text-glitch-idle_5s_ease-in-out_infinite] tracking-widest text-accent-green/70">
                USERNAME
              </span>
              <span className="text-accent-green/40">:</span>
              <span className="animate-[text-glitch-idle_5s_ease-in-out_infinite]">
                {typedUser}
                {phase === "type" && typedUser.length < USERNAME.length && (
                  <span className="animate-[blink_0.6s_steps(1,end)_infinite]">█</span>
                )}
              </span>
            </div>

            {/* Password row — appears at the same time as username */}
            <div className="flex items-center gap-3">
              <span className="w-28 shrink-0 animate-[text-glitch-idle_5s_ease-in-out_infinite] tracking-widest text-accent-green/70">
                PASSWORD
              </span>
              <span className="text-accent-green/40">:</span>
              <span className="animate-[text-glitch-idle_5s_ease-in-out_infinite] tracking-[0.3em]">
                {typedPass}
                {phase === "type" && typedUser.length >= USERNAME.length && typedPass.length < PASSWORD.length && (
                  <span className="animate-[blink_0.6s_steps(1,end)_infinite]">█</span>
                )}
              </span>
            </div>

            {/* Auth messages */}
            {phase === "auth" && (
              <p className="animate-[text-glitch-idle_5s_ease-in-out_infinite] pt-3 text-[18px] tracking-widest">
                {AUTH_MESSAGES[authIndex]}
              </p>
            )}
          </div>
        )}
      </div>
    </CRTScreen>
  );
}
