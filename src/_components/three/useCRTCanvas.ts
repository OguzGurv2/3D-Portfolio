"use client";

/**
 * useCRTCanvas
 * ─────────────────────────────────────────────────────────────────────────────
 * Sets up a Three.js WebGLRenderer on the provided <canvas> element, creates
 * an offscreen canvas of the same resolution, wraps it in a CanvasTexture,
 * applies the CRT barrel/scanline shader, and runs a RAF loop.
 *
 * Returns `ctx2d` — the CanvasRenderingContext2D the caller draws into.
 * The hook re-uploads the texture and re-renders every frame automatically.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createRenderer } from "./renderer";
import { createCRTMaterial } from "./CRTMaterial";

export interface CRTCanvasHandle {
  /** 2-D context to draw your screen content into */
  ctx2d: CanvasRenderingContext2D;
  /** Call this whenever you want an extra repaint (e.g. after state changes) */
  markDirty: () => void;
}

export function useCRTCanvas(
  glCanvasRef: React.RefObject<HTMLCanvasElement | null>,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void,
  deps: unknown[],
) {
  const handleRef = useRef<CRTCanvasHandle | null>(null);
  // Keep latest draw cb without restarting the effect
  const drawRef = useRef(draw);
  useEffect(() => { drawRef.current = draw; });

  useEffect(() => {
    const glCanvas = glCanvasRef.current;
    if (!glCanvas) return;

    // ── Three.js scene ────────────────────────────────────────────────────
    const renderer = createRenderer(glCanvas);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene  = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // ── Offscreen 2-D canvas ──────────────────────────────────────────────
    const off = document.createElement("canvas");
    off.width  = window.innerWidth;
    off.height = window.innerHeight;
    const ctx2d = off.getContext("2d")!;

    // ── CRT quad ──────────────────────────────────────────────────────────
    const tex = new THREE.CanvasTexture(off);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;

    const mat  = createCRTMaterial(tex);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    scene.add(mesh);

    handleRef.current = {
      ctx2d,
      markDirty: () => { tex.needsUpdate = true; },
    };

    // ── RAF loop ──────────────────────────────────────────────────────────
    let raf = 0;
    let cancelled = false;

    function loop(t: number) {
      if (cancelled) return;
      raf = requestAnimationFrame(loop);

      const w = renderer.domElement.width;
      const h = renderer.domElement.height;

      // Redraw 2D content
      ctx2d.clearRect(0, 0, w, h);
      drawRef.current(ctx2d, w, h, t * 0.001);
      tex.needsUpdate = true;

      // Update shader uniforms
      mat.uniforms.u_time.value = t * 0.001;
      mat.uniforms.u_res.value.set(w, h);

      renderer.render(scene, camera);
    }

    raf = requestAnimationFrame(loop);

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
      window.removeEventListener("resize", onResize);
      tex.dispose();
      mat.dispose();
      mesh.geometry.dispose();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glCanvasRef, ...deps]);

  return handleRef;
}
