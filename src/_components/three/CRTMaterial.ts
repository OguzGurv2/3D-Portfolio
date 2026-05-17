/**
 * CRT post-process material.
 *
 * Takes a CanvasTexture (the current screen's 2D-rendered content) and applies:
 *   - Barrel / fisheye distortion
 *   - Scanlines
 *   - Phosphor vignette
 *   - Chromatic aberration fringe
 *   - CRT flicker
 */
import * as THREE from "three";
import { BARREL_K } from "../../_constants/crt";

export const CRT_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const CRT_FRAG = /* glsl */ `
precision highp float;

uniform sampler2D u_tex;
uniform vec2      u_res;       // viewport resolution in pixels
uniform float     u_time;      // seconds
uniform float     u_barrel;    // barrel strength  (0 = flat, 0.18 = strong)
uniform float     u_scan;      // scanline opacity (0–1)
uniform float     u_vign;      // vignette darkness (0–1)
uniform float     u_chroma;    // chromatic aberration offset (px fraction 0–1)
uniform float     u_flicker;   // flicker amplitude (0–1)

varying vec2 vUv;

// ── Barrel distortion ──────────────────────────────────────────────────────
vec2 barrel(vec2 uv) {
  vec2 c = uv - 0.5;
  float r2 = dot(c, c);
  return 0.5 + c * (1.0 + u_barrel * r2);
}

void main() {
  // --- Barrel distortion ---
  vec2 uv  = barrel(vUv);

  // Out-of-bounds pixels → pure black (no edge stretch artefact)
  vec2 bounds = step(vec2(0.0), uv) * step(uv, vec2(1.0));
  float inBounds = bounds.x * bounds.y;

  // --- Chromatic aberration ---
  float ca = u_chroma;
  vec2 buvR = barrel(vUv + vec2( ca,  0.0));
  vec2 buvB = barrel(vUv + vec2(-ca,  0.0));
  float r = texture2D(u_tex, clamp(buvR, 0.0, 1.0)).r;
  float g = texture2D(u_tex, clamp(uv,   0.0, 1.0)).g;
  float b = texture2D(u_tex, clamp(buvB, 0.0, 1.0)).b;

  vec3 col = vec3(r, g, b) * inBounds;

  // --- Scanlines ---
  float scanY = mod(gl_FragCoord.y, 4.0);
  float scanLine = (scanY < 2.0) ? 1.0 : (1.0 - u_scan * 0.55);
  col *= scanLine;

  // --- Phosphor vignette (radial, soft) ---
  vec2  vc   = vUv - 0.5;
  float vd   = dot(vc * vec2(u_res.x / u_res.y, 1.0), vc * vec2(u_res.x / u_res.y, 1.0));
  float vign = 1.0 - smoothstep(0.18, 0.72, vd) * u_vign;
  col *= vign;

  // --- CRT flicker ---
  float flick = 1.0 - u_flicker * (0.5 + 0.5 * sin(u_time * 97.3));
  col *= flick;

  gl_FragColor = vec4(col, 1.0);
}
`;

export function createCRTMaterial(texture: THREE.CanvasTexture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader:   CRT_VERT,
    fragmentShader: CRT_FRAG,
    uniforms: {
      u_tex:    { value: texture },
      u_res:    { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_time:   { value: 0 },
      u_barrel: { value: BARREL_K },
      u_scan:   { value: 0.35 },
      u_vign:   { value: 0.25 },
      u_chroma: { value: 0.0018 },
      u_flicker:{ value: 0.018 },
    },
  });
}
