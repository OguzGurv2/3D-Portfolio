/**
 * Creates a fresh WebGLRenderer bound to the given canvas.
 * Each screen component calls this on mount and disposes on unmount.
 */
import * as THREE from "three";

export function getRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const r = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  return r;
}
