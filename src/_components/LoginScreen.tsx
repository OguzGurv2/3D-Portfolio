"use client";

import { useState, useEffect, useRef } from "react";
import CRTScreen from "./CRTScreen";
import { useCRTCanvas } from "./three/useCRTCanvas";
import { ACCENT, BG, FONT } from "../_constants/crt";

const ACCENT60 = "rgba(0,255,133,0.6)";
const ACCENT70 = "rgba(0,255,133,0.7)";
const ACCENT40 = "rgba(0,255,133,0.4)";

const SYSTEM_LINES = [
  "OG-OS  v1.0.0  [Build 2004]",
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

  // Keep latest onLogin callback without re-running effects
  const onLoginRef = useRef(onLogin);
  useEffect(() => { onLoginRef.current = onLogin; });

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
    const t = setTimeout(() => onLoginRef.current(), 700);
    return () => clearTimeout(t);
  }, [phase, authIndex]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Canvas 2D draw ──────────────────────────────────────────────────────
  const stateRef = useRef({ phase, bootLine, typedUser, typedPass, authIndex });
  useEffect(() => {
    stateRef.current = { phase, bootLine, typedUser, typedPass, authIndex };
  });

  useCRTCanvas(canvasRef, (ctx, w, h, t) => {
    const { phase: ph, bootLine: bl, typedUser: tu, typedPass: tp, authIndex: ai } = stateRef.current;

    const cx    = w / 2;
    const panelW = Math.min(560, w * 0.9);
    const panelX = cx - panelW / 2;
    const lh    = Math.round(h * 0.036);
    const sz17  = Math.round(h * 0.030);
    const sz20  = Math.round(h * 0.035);
    const blink = Math.floor(t * 1.4) % 2 === 0;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);

    // Phosphor bloom
    const bloom = ctx.createRadialGradient(cx, h / 2, 0, cx, h / 2, w * 0.55);
    bloom.addColorStop(0, "rgba(0,255,133,0.07)");
    bloom.addColorStop(1, "transparent");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, w, h);

    // ── Boot log box ─────────────────────────────────────
    const boxY  = Math.round(h * 0.28);
    const boxPx = Math.round(panelW * 0.045);
    const boxPy = Math.round(lh * 0.5);

    ctx.strokeStyle = "rgba(0,255,133,0.4)";
    ctx.lineWidth   = 1;
    ctx.strokeRect(panelX, boxY, panelW, (SYSTEM_LINES.length + 1) * lh + boxPy * 2);

    ctx.font        = `${sz17}px ${FONT}`;
    ctx.fillStyle   = ACCENT;
    ctx.shadowBlur  = 8;
    ctx.shadowColor = "rgba(0,255,133,0.3)";

    for (let i = 0; i < bl; i++) {
      const line = SYSTEM_LINES[i];
      ctx.fillText(line || "", panelX + boxPx, boxY + boxPy + (i + 1) * lh);
    }

    if (ph === "boot" && blink) {
      ctx.fillText("█", panelX + boxPx, boxY + boxPy + (bl + 1) * lh);
    }
    ctx.shadowBlur = 0;

    // ── Login section ────────────────────────────────────
    if (ph !== "boot") {
      const loginY = boxY + (SYSTEM_LINES.length + 2) * lh + boxPy * 2 + Math.round(lh * 0.8);

      ctx.font        = `${sz20}px ${FONT}`;
      ctx.fillStyle   = ACCENT60;
      ctx.shadowBlur  = 6;
      ctx.shadowColor = "rgba(0,255,133,0.3)";
      ctx.fillText("\u2500\u2500 USER IDENTIFICATION \u2500\u2500", panelX, loginY);
      ctx.shadowBlur  = 0;

      const row1Y  = loginY + lh * 1.8;
      const row2Y  = row1Y + lh * 1.4;
      const labelW = Math.round(panelW * 0.23);

      // Username
      ctx.font      = `${sz20}px ${FONT}`;
      ctx.fillStyle = ACCENT70;
      ctx.fillText("USERNAME", panelX, row1Y);
      ctx.fillStyle = ACCENT40;
      ctx.fillText(":", panelX + labelW, row1Y);
      ctx.fillStyle = ACCENT;
      ctx.shadowBlur  = 8;
      ctx.shadowColor = "rgba(0,255,133,0.3)";
      ctx.fillText(tu, panelX + labelW + Math.round(lh * 0.6), row1Y);
      if (ph === "type" && tu.length < USERNAME.length && blink) {
        ctx.fillText("█", panelX + labelW + Math.round(lh * 0.6) + ctx.measureText(tu).width, row1Y);
      }

      // Password
      ctx.fillStyle = ACCENT70;
      ctx.shadowBlur = 0;
      ctx.fillText("PASSWORD", panelX, row2Y);
      ctx.fillStyle = ACCENT40;
      ctx.fillText(":", panelX + labelW, row2Y);
      ctx.fillStyle = ACCENT;
      ctx.shadowBlur  = 8;
      ctx.fillText(tp, panelX + labelW + Math.round(lh * 0.6), row2Y);
      if (ph === "type" && tu.length >= USERNAME.length && tp.length < PASSWORD.length && blink) {
        ctx.fillText("█", panelX + labelW + Math.round(lh * 0.6) + ctx.measureText(tp).width, row2Y);
      }
      ctx.shadowBlur = 0;

      // Auth message
      if (ph === "auth") {
        ctx.font        = `${sz17}px ${FONT}`;
        ctx.fillStyle   = ACCENT;
        ctx.shadowBlur  = 8;
        ctx.shadowColor = "rgba(0,255,133,0.3)";
        ctx.fillText(AUTH_MESSAGES[ai], panelX, row2Y + lh * 1.6);
        ctx.shadowBlur  = 0;
      }
    }
  }, []);

  return (
    <CRTScreen>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </CRTScreen>
  );
}
