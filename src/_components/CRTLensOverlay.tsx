"use client";

import { useEffect, useRef } from "react";

/**
 * Renders a WebGL fullscreen barrel-distortion lens overlay.
 *
 * Strategy: subdivide a quad into a fine grid. Each vertex is pushed
 * outward from the centre by a barrel/fisheye function (identical to
 * the math used in CRT monitor simulation shaders). The mesh is drawn
 * with a dark colour that fades to transparent toward the centre, so
 * only the curved edges and corners pick up the warp darkness – giving
 * the impression that the flat DOM surface is curved like real CRT glass.
 *
 * Corners are preserved: the barrel displacement is clamped so vertices
 * that are already at the very corner don't move, keeping the bounding
 * rectangle intact.
 */

const VERT = `
attribute vec2 a_pos;        // [-1, 1] NDC
attribute float a_alpha;     // per-vertex darkness contribution

varying float v_alpha;

void main() {
  v_alpha = a_alpha;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `
precision mediump float;

varying float v_alpha;

uniform vec3 u_color;

void main() {
  gl_FragColor = vec4(u_color, v_alpha);
}
`;

// Number of subdivisions along each axis.
// Higher = smoother curve, costs more geometry (still cheap for GPU).
const SEGMENTS = 64;

// Barrel strength: how much the centre bulges outward.
// 0 = flat, 0.3 = noticeable CRT curve, 0.6 = very pronounced
const BARREL_STRENGTH = 0.22;

// How dark the deepest curved rim gets (0-1)
const RIM_DARKNESS = 0.72;

function buildMesh(w: number, h: number) {
  const aspect = w / h;
  const positions: number[] = [];
  const alphas: number[] = [];
  const indices: number[] = [];

  const S = SEGMENTS;

  // Build grid vertices
  for (let iy = 0; iy <= S; iy++) {
    for (let ix = 0; ix <= S; ix++) {
      // Normalised [0,1]
      const nx = ix / S;
      const ny = iy / S;

      // NDC [-1, 1] — Y flipped for WebGL
      const x = nx * 2 - 1;
      const y = -(ny * 2 - 1);

      // Barrel displacement: push outward from centre
      // using the classic r' = r * (1 + k * r²) formula
      const cx = x * aspect; // aspect-corrected for uniform bulge
      const cy = y;
      const r2 = cx * cx + cy * cy;
      const scale = 1.0 + BARREL_STRENGTH * r2;

      const bx = (x * scale);
      const by = (y * scale);

      // Clamp back to screen so corners don't exceed [-1,1]
      const clampedX = Math.max(-1, Math.min(1, bx));
      const clampedY = Math.max(-1, Math.min(1, by));

      positions.push(clampedX, clampedY);

      // Alpha: 0 at centre, RIM_DARKNESS at max radius
      // Use smooth cubic ease so the centre stays fully transparent
      const dist = Math.sqrt(r2) / (Math.sqrt(2) * aspect > 1 ? Math.sqrt(2) : Math.sqrt(2));
      const t = Math.min(dist, 1.0);
      const alpha = RIM_DARKNESS * t * t * t;
      alphas.push(alpha);
    }
  }

  // Build triangle indices
  for (let iy = 0; iy < S; iy++) {
    for (let ix = 0; ix < S; ix++) {
      const tl = iy * (S + 1) + ix;
      const tr = tl + 1;
      const bl = tl + (S + 1);
      const br = bl + 1;
      indices.push(tl, bl, tr, tr, bl, br);
    }
  }

  return { positions, alphas, indices };
}

export default function CRTLensOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    // ── Compile shaders ────────────────────────────────────────────
    function compile(type: number, src: string) {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      return s;
    }

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const aPos = gl.getAttribLocation(prog, "a_pos");
    const aAlpha = gl.getAttribLocation(prog, "a_alpha");
    const uColor = gl.getUniformLocation(prog, "u_color");

    // Dark greenish-black rim colour to match CRT phosphor aesthetic
    gl.uniform3f(uColor, 0.0, 0.02, 0.01);

    // ── Build & upload mesh ────────────────────────────────────────
    function rebuild() {
      const w = canvas!.width;
      const h = canvas!.height;
      const { positions, alphas, indices } = buildMesh(w, h);

      const posBuf = gl!.createBuffer();
      gl!.bindBuffer(gl!.ARRAY_BUFFER, posBuf);
      gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array(positions), gl!.STATIC_DRAW);
      gl!.enableVertexAttribArray(aPos);
      gl!.vertexAttribPointer(aPos, 2, gl!.FLOAT, false, 0, 0);

      const alphaBuf = gl!.createBuffer();
      gl!.bindBuffer(gl!.ARRAY_BUFFER, alphaBuf);
      gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array(alphas), gl!.STATIC_DRAW);
      gl!.enableVertexAttribArray(aAlpha);
      gl!.vertexAttribPointer(aAlpha, 1, gl!.FLOAT, false, 0, 0);

      const idxBuf = gl!.createBuffer();
      gl!.bindBuffer(gl!.ELEMENT_ARRAY_BUFFER, idxBuf);
      gl!.bufferData(gl!.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl!.STATIC_DRAW);

      return indices.length;
    }

    let indexCount = rebuild();

    // ── Draw ───────────────────────────────────────────────────────
    function draw() {
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.enable(gl!.BLEND);
      gl!.blendFunc(gl!.SRC_ALPHA, gl!.ONE_MINUS_SRC_ALPHA);
      gl!.drawElements(gl!.TRIANGLES, indexCount, gl!.UNSIGNED_SHORT, 0);
    }

    draw();

    // ── Resize handling ────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const parent = canvas!.parentElement;
      if (!parent) return;
      canvas!.width = parent.clientWidth;
      canvas!.height = parent.clientHeight;
      indexCount = rebuild();
      draw();
    });

    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      indexCount = rebuild();
      draw();
      ro.observe(parent);
    }

    return () => ro.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30 h-full w-full"
    />
  );
}
