"use client";

/**
 * Desktop — Three.js / WebGL version.
 *
 * The entire UI (desktop label, draggable windows, taskbar) is drawn with
 * Canvas 2D API onto an offscreen canvas that feeds a CRT barrel-distortion
 * CanvasTexture. Mouse events on the WebGL canvas are mapped back to logical
 * screen coordinates so dragging and clicking work correctly.
 */

import { useEffect, useRef } from "react";
import { getRenderer } from "../../_components/three/renderer";
import { createCRTMaterial } from "../../_components/three/CRTMaterial";
import CRTScreen from "../../_components/CRTScreen";
import * as THREE from "three";

// ── Window data ────────────────────────────────────────────────────────────
interface WinData {
  id: string;
  title: string;
  lines: string[][];   // [line, colour] pairs for body content
  x: number;
  y: number;
  closed: boolean;
  centered: boolean;
  openAnim: number;    // 0→1 body reveal progress
}

const INITIAL_WINS: WinData[] = [
  {
    id: "about", title: "ABOUT.exe",
    lines: [
      ["► Who am I?",                                      "#00ff85"],
      ["Junior Full-stack developer",                       "rgba(0,255,133,0.8)"],
      ["based in Eskişehir.",                               "rgba(0,255,133,0.8)"],
      ["I build interactive web experiences",               "rgba(0,255,133,0.8)"],
      ["that blur the line between",                        "rgba(0,255,133,0.8)"],
      ["design and engineering.",                           "rgba(0,255,133,0.8)"],
      ["",                                                  ""],
      ["► Stack",                                           "#00ff85"],
      ["TypeScript · Next.js · React",                      "rgba(0,255,133,0.8)"],
    ],
    x: 0, y: 0, closed: false, centered: true, openAnim: 0,
  },
  {
    id: "projects", title: "PROJECTS.exe",
    lines: [
      ["── No entries yet ──", "#00ff85"],
      ["Coming soon...",       "rgba(0,255,133,0.5)"],
    ],
    x: 180, y: 100, closed: true, centered: false, openAnim: 0,
  },
  {
    id: "skills", title: "SKILLS.exe",
    lines: [
      ["── No entries yet ──", "#00ff85"],
      ["Coming soon...",       "rgba(0,255,133,0.5)"],
    ],
    x: 300, y: 140, closed: true, centered: false, openAnim: 0,
  },
  {
    id: "contact", title: "CONTACT.exe",
    lines: [
      ["── No entries yet ──", "#00ff85"],
      ["Coming soon...",       "rgba(0,255,133,0.5)"],
    ],
    x: 420, y: 180, closed: true, centered: false, openAnim: 0,
  },
];

// ── Layout constants ────────────────────────────────────────────────────────
const TASKBAR_H    = 34;
const TITLEBAR_H   = 26;
const LINE_H       = 26;
const WIN_PAD      = 14;
const WIN_MIN_W    = 320;
const FONT         = "VT323, monospace";
const ACCENT       = "#00ff85";
const ACCENT_DIM   = "rgba(0,255,133,0.4)";
const ACCENT30     = "rgba(0,255,133,0.3)";
const BG           = "#0c0c0c";
const WIN_BG       = "#0c0c0c";
const TITLEBAR_BG  = "rgba(0,255,133,0.1)";
const WIN_BORDER   = "rgba(0,255,133,0.5)";

function winWidth(ctx: CanvasRenderingContext2D, win: WinData): number {
  ctx.font = `18px ${FONT}`;
  let maxW = ctx.measureText(win.title).width + 60;
  ctx.font = `17px ${FONT}`;
  for (const [line] of win.lines) {
    maxW = Math.max(maxW, ctx.measureText(line).width + WIN_PAD * 2);
  }
  return Math.max(WIN_MIN_W, maxW);
}

function winBodyHeight(win: WinData, progress: number): number {
  const full = win.lines.length * LINE_H + WIN_PAD * 2;
  return full * progress;
}

function winRect(ctx: CanvasRenderingContext2D, win: WinData, cw: number, ch: number) {
  const ww = winWidth(ctx, win);
  const x  = win.centered ? (cw - ww) / 2 : win.x;
  const y  = win.centered ? (ch - (TITLEBAR_H + win.lines.length * LINE_H + WIN_PAD * 2)) / 2 : win.y;
  return { x, y, w: ww };
}

// ── Draw helpers ────────────────────────────────────────────────────────────
function drawWindow(
  ctx: CanvasRenderingContext2D,
  win: WinData,
  cw: number,
  ch: number,
  focused: boolean,
) {
  if (win.closed) return;
  const { x, y, w } = winRect(ctx, win, cw, ch);
  const bh = winBodyHeight(win, win.openAnim);
  const totalH = TITLEBAR_H + bh;

  ctx.shadowBlur  = focused ? 18 : 6;
  ctx.shadowColor = "rgba(0,255,133,0.12)";

  // Window bg
  ctx.fillStyle = WIN_BG;
  ctx.fillRect(x, y, w, totalH);

  // Border
  ctx.strokeStyle = WIN_BORDER;
  ctx.lineWidth   = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, totalH - 1);

  // Title bar bg
  ctx.fillStyle = TITLEBAR_BG;
  ctx.fillRect(x, y, w, TITLEBAR_H);

  // Title bar border-bottom
  ctx.strokeStyle = ACCENT30;
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + TITLEBAR_H);
  ctx.lineTo(x + w, y + TITLEBAR_H);
  ctx.stroke();

  // Title text
  ctx.font        = `18px ${FONT}`;
  ctx.fillStyle   = ACCENT;
  ctx.shadowBlur  = 8;
  ctx.shadowColor = "rgba(0,255,133,0.5)";
  ctx.fillText(win.title, x + WIN_PAD, y + TITLEBAR_H - 6);
  ctx.shadowBlur  = 0;

  // Close button ✕
  ctx.font      = `16px ${FONT}`;
  ctx.fillStyle = ACCENT_DIM;
  ctx.fillText("✕", x + w - 24, y + TITLEBAR_H - 6);

  // Body — clipped to animated height
  if (bh > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y + TITLEBAR_H, w, bh);
    ctx.clip();

    ctx.font = `17px ${FONT}`;
    for (let i = 0; i < win.lines.length; i++) {
      const [text, color] = win.lines[i];
      if (!text) continue;
      ctx.fillStyle   = color;
      ctx.shadowBlur  = 6;
      ctx.shadowColor = "rgba(0,255,133,0.25)";
      ctx.fillText(text, x + WIN_PAD, y + TITLEBAR_H + WIN_PAD + (i + 1) * LINE_H - 4);
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

function drawTaskbar(
  ctx: CanvasRenderingContext2D,
  wins: WinData[],
  cw: number,
  ch: number,
  clock: string,
  hoverBtn: string | null,
) {
  const y = ch - TASKBAR_H;

  ctx.fillStyle = BG;
  ctx.fillRect(0, y, cw, TASKBAR_H);
  ctx.strokeStyle = ACCENT30;
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(0, y + 0.5);
  ctx.lineTo(cw, y + 0.5);
  ctx.stroke();

  // OG-OS label
  ctx.font        = `18px ${FONT}`;
  ctx.fillStyle   = ACCENT;
  ctx.shadowBlur  = 8;
  ctx.shadowColor = "rgba(0,255,133,0.4)";
  ctx.fillText("OG-OS", 20, y + TASKBAR_H - 8);
  ctx.shadowBlur  = 0;

  // Separator
  ctx.strokeStyle = ACCENT30;
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(74, y + 8);
  ctx.lineTo(74, y + TASKBAR_H - 8);
  ctx.stroke();

  // Buttons
  let bx = 84;
  ctx.font = `17px ${FONT}`;
  for (const win of wins) {
    const isOpen = !win.closed;
    const isHover = hoverBtn === win.id;
    const btnW = ctx.measureText(win.title).width + 18;

    ctx.strokeStyle = isOpen
      ? "rgba(0,255,133,0.6)"
      : isHover
        ? "rgba(0,255,133,0.5)"
        : "rgba(0,255,133,0.2)";
    ctx.lineWidth   = 1;
    ctx.strokeRect(bx + 0.5, y + 5.5, btnW - 1, TASKBAR_H - 11);

    ctx.fillStyle = isOpen
      ? ACCENT
      : isHover
        ? "rgba(0,255,133,0.8)"
        : "rgba(0,255,133,0.4)";
    ctx.fillText(win.title, bx + 9, y + TASKBAR_H - 9);

    bx += btnW + 6;
  }

  // Clock
  ctx.font      = `17px ${FONT}`;
  ctx.fillStyle = "rgba(0,255,133,0.6)";
  const cw2 = ctx.measureText(clock).width;
  ctx.fillText(clock, cw - cw2 - 20, y + TASKBAR_H - 8);
}

// ── Hit testing ─────────────────────────────────────────────────────────────
function taskbarButtonRects(ctx: CanvasRenderingContext2D, wins: WinData[], cw: number, ch: number) {
  const y  = ch - TASKBAR_H;
  const rects: { id: string; x: number; y: number; w: number; h: number }[] = [];
  let bx = 84;
  ctx.font = `17px ${FONT}`;
  for (const win of wins) {
    const btnW = ctx.measureText(win.title).width + 18;
    rects.push({ id: win.id, x: bx, y: y + 5, w: btnW, h: TASKBAR_H - 10 });
    bx += btnW + 6;
  }
  return rects;
}

function titlebarRect(ctx: CanvasRenderingContext2D, win: WinData, cw: number, ch: number) {
  const { x, y, w } = winRect(ctx, win, cw, ch);
  return { x, y, w, h: TITLEBAR_H };
}

function closeButtonRect(ctx: CanvasRenderingContext2D, win: WinData, cw: number, ch: number) {
  const { x, y, w } = winRect(ctx, win, cw, ch);
  return { x: x + w - 28, y, w: 28, h: TITLEBAR_H };
}

function inRect(px: number, py: number, r: { x: number; y: number; w: number; h: number }) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// ── Main component ──────────────────────────────────────────────────────────
export default function Desktop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const glCanvas = canvasRef.current;
    if (!glCanvas) return;

    const renderer = getRenderer(glCanvas);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene  = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const off   = document.createElement("canvas");
    off.width   = window.innerWidth;
    off.height  = window.innerHeight;
    const ctx   = off.getContext("2d")!;

    const tex = new THREE.CanvasTexture(off);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;

    const mat  = createCRTMaterial(tex);
    // Keep in sync with getPos barrel mapping below
    const BARREL_K = 0.04;
    mat.uniforms.u_barrel.value = BARREL_K;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    scene.add(mesh);

    // ── Mutable state ──────────────────────────────────────────────────────
    const wins: WinData[] = INITIAL_WINS.map(w => ({ ...w, lines: w.lines.map(l => [...l] as [string, string]) }));
    const focusOrder      = wins.map(w => w.id);
    let   clock           = new Date().toLocaleTimeString();
    let   hoverBtn: string | null = null;

    // Dragging
    let dragging: { id: string; ox: number; oy: number; startX: number; startY: number } | null = null;

    function focusWin(id: string) {
      const i = focusOrder.indexOf(id);
      if (i !== -1) { focusOrder.splice(i, 1); focusOrder.push(id); }
    }

    function closeWin(id: string) {
      const w = wins.find(w => w.id === id);
      if (w) { w.closed = true; w.openAnim = 0; }
    }

    function openWin(id: string) {
      const w = wins.find(w => w.id === id);
      if (w) { w.closed = false; w.openAnim = 0; focusWin(id); }
    }

    // ── Clock ticker ───────────────────────────────────────────────────────
    const clockInterval = setInterval(() => {
      clock = new Date().toLocaleTimeString();
    }, 1000);

    // ── Draw ───────────────────────────────────────────────────────────────
    function drawFrame(t: number) {
      const cw = off.width;
      const ch = off.height;

      // Animate window body open
      for (const w of wins) {
        if (!w.closed && w.openAnim < 1) {
          w.openAnim = Math.min(1, w.openAnim + 0.04);
        }
      }

      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, cw, ch);

      // Phosphor bloom
      const bloom = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, cw * 0.55);
      bloom.addColorStop(0, "rgba(0,255,133,0.07)");
      bloom.addColorStop(1, "transparent");
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, cw, ch);

      // Desktop label
      ctx.font        = `14px ${FONT}`;
      ctx.fillStyle   = "rgba(0,255,133,0.3)";
      ctx.shadowBlur  = 0;
      ctx.fillText("OG-OS DESKTOP v1.0", 24, 28);

      // Windows in focus order (back-to-front)
      for (const id of focusOrder) {
        const w = wins.find(w => w.id === id);
        if (w) drawWindow(ctx, w, cw, ch - TASKBAR_H, id === focusOrder[focusOrder.length - 1]);
      }

      // Taskbar
      drawTaskbar(ctx, wins, cw, ch, clock, hoverBtn);

      // Flicker
      const flick = 0.018 * (0.5 + 0.5 * Math.sin(t * 97.3));
      ctx.fillStyle = `rgba(0,0,0,${flick})`;
      ctx.fillRect(0, 0, cw, ch);
    }

    // ── RAF ────────────────────────────────────────────────────────────────
    let raf = 0;
    let cancelled = false;

    function loop(t: number) {
      if (cancelled) return;
      raf = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, off.width, off.height);
      drawFrame(t * 0.001);
      tex.needsUpdate = true;
      mat.uniforms.u_time.value  = t * 0.001;
      mat.uniforms.u_res.value.set(off.width, off.height);
      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(loop);

    // ── Mouse events ───────────────────────────────────────────────────────
    function getPos(e: MouseEvent) {
      const rect = (glCanvas as HTMLCanvasElement).getBoundingClientRect();
      // Map screen pixel → normalised UV → apply barrel to get logical canvas coordinate
      const sx = (e.clientX - rect.left) / rect.width;
      const sy = (e.clientY - rect.top)  / rect.height;
      const cx = sx - 0.5, cy = sy - 0.5;
      const r2 = cx * cx + cy * cy;
      const lx = 0.5 + cx * (1.0 + BARREL_K * r2);
      const ly = 0.5 + cy * (1.0 + BARREL_K * r2);
      return { x: lx * off.width, y: ly * off.height };
    }

    function onMouseMove(e: MouseEvent) {
      const { x, y } = getPos(e);

      if (dragging) {
        const dx = x - dragging.startX;
        const dy = y - dragging.startY;
        const w  = wins.find(w => w.id === dragging!.id);
        if (w) {
          if (w.centered) {
            // Convert from centered to absolute on first drag
            const cw = off.width;
            const ch = off.height - TASKBAR_H;
            const ww = winWidth(ctx, w);
            const wh = TITLEBAR_H + w.lines.length * LINE_H + WIN_PAD * 2;
            dragging!.ox = (cw - ww) / 2;
            dragging!.oy = (ch - wh) / 2;
            w.x = dragging!.ox + dx;
            w.y = dragging!.oy + dy;
            w.centered = false;
          } else {
            w.x = dragging.ox + dx;
            w.y = dragging.oy + dy;
          }
        }
        return;
      }

      // Hover over taskbar buttons
      const rects = taskbarButtonRects(ctx, wins, off.width, off.height);
      const hit   = rects.find(r => inRect(x, y, r));
      hoverBtn = hit ? hit.id : null;
    }

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return;
      const { x, y } = getPos(e);
      const cw = off.width;
      const ch = off.height;

      // Check close buttons (top priority, back-to-front reversed)
      for (let fi = focusOrder.length - 1; fi >= 0; fi--) {
        const id = focusOrder[fi];
        const w  = wins.find(w => w.id === id);
        if (!w || w.closed) continue;
        const cr = closeButtonRect(ctx, w, cw, ch - TASKBAR_H);
        if (inRect(x, y, cr)) { closeWin(id); return; }
      }

      // Check title bars for drag
      for (let fi = focusOrder.length - 1; fi >= 0; fi--) {
        const id = focusOrder[fi];
        const w  = wins.find(w => w.id === id);
        if (!w || w.closed) continue;
        const tr = titlebarRect(ctx, w, cw, ch - TASKBAR_H);
        if (inRect(x, y, tr)) {
          focusWin(id);
          dragging = { id, ox: w.x, oy: w.y, startX: x, startY: y };
          (glCanvas as HTMLCanvasElement).style.cursor = "grabbing";
          return;
        }
        // Click anywhere in window — just focus
        const { x: wx, y: wy, w: ww } = winRect(ctx, w, cw, ch - TASKBAR_H);
        const totalH = TITLEBAR_H + winBodyHeight(w, w.openAnim);
        if (inRect(x, y, { x: wx, y: wy, w: ww, h: totalH })) {
          focusWin(id);
          return;
        }
      }

      // Taskbar button click
      const rects = taskbarButtonRects(ctx, wins, cw, ch);
      const hit   = rects.find(r => inRect(x, y, r));
      if (hit) {
        const w = wins.find(w => w.id === hit.id);
        if (w) {
          if (!w.closed) closeWin(hit.id);
          else openWin(hit.id);
        }
      }
    }

    function onMouseUp() {
      dragging = null;
      (glCanvas as HTMLCanvasElement).style.cursor = "";
    }

    function onMouseLeave() {
      hoverBtn = null;
    }

    glCanvas.addEventListener("mousemove",  onMouseMove);
    glCanvas.addEventListener("mousedown",  onMouseDown);
    glCanvas.addEventListener("mouseup",    onMouseUp);
    glCanvas.addEventListener("mouseleave", onMouseLeave);

    // ── Resize ────────────────────────────────────────────────────────────
    function onResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      off.width  = w;
      off.height = h;
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearInterval(clockInterval);
      glCanvas.removeEventListener("mousemove",  onMouseMove);
      glCanvas.removeEventListener("mousedown",  onMouseDown);
      glCanvas.removeEventListener("mouseup",    onMouseUp);
      glCanvas.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("resize", onResize);
      tex.dispose();
      mat.dispose();
      mesh.geometry.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <CRTScreen>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full cursor-default" />
    </CRTScreen>
  );
}
