"use client";

/**
 * LoadingScreen — Three.js / WebGL version.
 *
 * All content is drawn to an offscreen Canvas 2D context which feeds the CRT
 * barrel-distortion shader as a CanvasTexture. No HTML/CSS UI elements.
 */

import { useEffect, useRef } from "react";
import { getRenderer } from "./three/renderer";
import { createCRTMaterial } from "./three/CRTMaterial";
import CRTScreen from "./CRTScreen";
import * as THREE from "three";

const ACCENT = "#00ff85";
const BG     = "#0c0c0c";
const FONT   = "VT323, monospace";

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
    const ctx2d = off.getContext("2d")!;

    const tex = new THREE.CanvasTexture(off);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;

    const mat  = createCRTMaterial(tex);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    scene.add(mesh);

    let raf = 0;
    let cancelled = false;
    let dots = 0;
    let lastDotTime = 0;

    function loop(t: number) {
      if (cancelled) return;
      raf = requestAnimationFrame(loop);

      if (t - lastDotTime > 400) {
        dots = (dots + 1) % 4;
        lastDotTime = t;
      }

      const w = off.width;
      const h = off.height;
      ctx2d.clearRect(0, 0, w, h);
      drawLoading(ctx2d, w, h, dots);
      tex.needsUpdate = true;
      mat.uniforms.u_time.value = t * 0.001;
      mat.uniforms.u_res.value.set(w, h);
      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(loop);

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
      window.removeEventListener("resize", onResize);
      tex.dispose();
      mat.dispose();
      mesh.geometry.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <CRTScreen>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </CRTScreen>
  );
}
