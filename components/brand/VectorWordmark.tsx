'use client';

import { useEffect, useRef } from 'react';

const MAX_DPR = 2;
const REF_WIDTH = 1200;
const MAX_TEX = 4096;

const HANDLES = 3;
const CELL_ASPECT = 0.6;
const DRIFT_X = 0.08;
const DRIFT_Y = 0.04;
const DRIFT_RATE = 1.3;
const DRIFT_RATE_Y = DRIFT_RATE * DRIFT_RATE;
const SWEEP_RATE = 0.5;

const SWEEP_BAND = 0.28;
const RESNAP = 0.2;
const DAMP_REF = 20;
const SPEED_REF = 50;
const DOT_DIAMETER = 4 / 440;
const DOT_PITCH = 12 / 440;

const clamp = (value: number, low: number, high: number) =>
  value < low ? low : value > high ? high : value;
const fract = (value: number) => value - Math.floor(value);

type RGBA = [number, number, number, number];

function parseColor(input: string | undefined, fallback: RGBA): RGBA {
  if (!input) return fallback;
  let text = String(input).trim();

  if (text.slice(0, 4).toLowerCase() === 'var(') {
    const comma = text.indexOf(',');
    const close = text.lastIndexOf(')');
    if (comma < 0 || close < comma) return fallback;
    text = text.slice(comma + 1, close).trim();
  }

  if (text[0] === '#') {
    let hex = text.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      let expanded = '';
      for (const character of hex) expanded += character + character;
      hex = expanded;
    }
    if (hex.length === 6) hex += 'ff';
    if (hex.length !== 8 || /[^0-9a-f]/i.test(hex)) return fallback;
    return [
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255,
      parseInt(hex.slice(6, 8), 16) / 255,
    ];
  }

  const match = text.match(/^(rgba?|hsla?)\(([^)]*)\)$/i);
  if (!match) return fallback;

  const parts = match[2].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return fallback;

  const num = (token: string, scale: number) => {
    const value = parseFloat(token);
    if (!Number.isFinite(value)) return 0;
    return token.includes('%') ? (value / 100) * scale : value;
  };

  const alpha = parts.length > 3 ? clamp(num(parts[3], 1), 0, 1) : 1;

  if (match[1].toLowerCase().slice(0, 3) === 'rgb') {
    return [
      clamp(num(parts[0], 255) / 255, 0, 1),
      clamp(num(parts[1], 255) / 255, 0, 1),
      clamp(num(parts[2], 255) / 255, 0, 1),
      alpha,
    ];
  }

  const hue = fract(parseFloat(parts[0]) / 360);
  const saturation = clamp(num(parts[1], 1), 0, 1);
  const lightness = clamp(num(parts[2], 1), 0, 1);
  const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  const channel = (t: number) => {
    let u = fract(t);
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };

  return [channel(hue + 1 / 3), channel(hue), channel(hue - 1 / 3), alpha];
}

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;

uniform sampler2D uMap;
uniform vec2 uRes;
uniform vec2 uAtlas;
uniform vec2 uPtr;
uniform float uReach;
uniform vec3 uText;
uniform vec3 uShade;
uniform vec4 uAccent;
uniform vec2 uV0;
uniform vec2 uV1;
uniform vec2 uV2;
uniform float uHalf;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 blurRG(vec2 uv, float e) {
  vec4 sum = vec4(0.0);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float th = radians(fi / 6.0 * 360.0);
    vec2 dir = vec2(cos(th), sin(th));
    vec2 off = dir * (hash(vec2(fi, uv.x + uv.y)) + e);
    sum += texture2D(uMap, uv + off * e);
  }
  return (sum / 6.0).rg;
}

vec2 segment(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  vec2 ap = p - a;
  float t = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-8), 0.0, 1.0);
  return vec2(length(ap - ab * t), t);
}

float stroke(float d, float lw, float px) {
  return 1.0 - smoothstep(lw, lw + px, d);
}

float dashedLine(vec2 p, vec2 a, vec2 b, float lw, float px) {
  vec2 s = segment(p, a, b);
  float dash = step(0.5, fract(s.y * length(b - a) * 100.0));
  return stroke(s.x, lw, px) * dash;
}

float boxEdge(vec2 p, vec2 c, float h, float lw, float px) {
  vec2 q = abs(p - c) - vec2(h);
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  return stroke(abs(d), lw, px);
}

void main() {
  float aspect = uRes.x / uRes.y;

  vec2 E = (vUv * uRes - (uRes - uAtlas) * 0.5) / uAtlas;
  float inside = step(0.0, E.x) * step(E.x, 1.0) * step(0.0, E.y) * step(E.y, 1.0);
  vec2 safeUv = clamp(E, 0.0, 1.0);

  float b = clamp(1.0 - E.y * 3.5, 0.0, 1.0) * 0.008;
  vec2 soft = blurRG(safeUv, b);
  vec2 sharp = blurRG(safeUv, b * 0.1);

  float d = length((vUv - uPtr) / vec2(1.0, aspect));
  float k = 1.0 - pow(smoothstep(0.0, max(uReach, 1e-4), d), 3.0);

  float mask = mix(soft.r, sharp.g, k) * inside;
  vec3 fill = mix(uShade, uText, smoothstep(0.0, 1.0, E.y));

  vec2 P = vec2(vUv.x * aspect, vUv.y);
  float px = 1.0 / uRes.y;
  float lw = px * 0.2;
  float lines = max(
    max(dashedLine(P, uV0, uV1, lw, px), dashedLine(P, uV1, uV2, lw, px)),
    dashedLine(P, uV2, uV0, lw, px)
  );
  float boxes = max(
    max(boxEdge(P, uV0, uHalf, lw, px), boxEdge(P, uV1, uHalf, lw, px)),
    boxEdge(P, uV2, uHalf, lw, px)
  );
  float A = max(lines, boxes) * uAccent.a * (1.0 - vUv.y);

  vec4 card = vec4(fill * mask, mask);
  vec4 comp = vec4(uAccent.rgb * A, A) + card * (1.0 - A);

  gl_FragColor = comp * pow(clamp(E.y, 0.0, 1.0), 0.7);
}`;

function compile(gl: WebGLRenderingContext, vs: string, fs: string) {
  const make = (type: number, src: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Could not create shader');
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    return shader;
  };
  const program = gl.createProgram();
  if (!program) throw new Error('Could not create program');
  gl.attachShader(program, make(gl.VERTEX_SHADER, vs));
  gl.attachShader(program, make(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(program, 0, 'aPos');
  gl.linkProgram(program);
  return program;
}

type Atlas = { canvas: HTMLCanvasElement; cssW: number; cssH: number };

type FontSpec = {
  family: string;
  weight: string;
  style: string;
  size: number;
  letterSpacing: string;
};

function fontString(font: FontSpec, px: number) {
  return `${font.style} ${font.weight} ${px}px ${font.family}`;
}

function buildAtlas(
  text: string,
  font: FontSpec,
  drawFontPx: number,
  dpr: number,
): Atlas | null {
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) return null;

  const setFont = (ctx: CanvasRenderingContext2D, px: number) => {
    ctx.font = fontString(font, px);
    try {
      if ('letterSpacing' in ctx) {
        (ctx as unknown as { letterSpacing: string }).letterSpacing = font.letterSpacing;
      }
    } catch {
      // Older browsers have no letterSpacing on 2d contexts. Safe to ignore.
    }
  };

  const measure = (px: number) => {
    setFont(probe, px);
    const m = probe.measureText(text);
    const ascent = m.actualBoundingBoxAscent || px * 0.8;
    const descent = m.actualBoundingBoxDescent || px * 0.22;
    return { w: Math.max(1, m.width), ascent, descent };
  };

  let fontPx = Math.max(8, drawFontPx * dpr);
  let m = measure(fontPx);
  let pad = fontPx * 0.12;

  const overflow = Math.max((m.w + pad * 2) / MAX_TEX, (m.ascent + m.descent + pad * 2) / MAX_TEX);
  if (overflow > 1) {
    fontPx = Math.max(8, fontPx / overflow);
    m = measure(fontPx);
    pad = fontPx * 0.12;
  }

  const width = Math.max(1, Math.ceil(m.w + pad * 2));
  const height = Math.max(1, Math.ceil(m.ascent + m.descent + pad * 2));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
  setFont(ctx, fontPx);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.globalCompositeOperation = 'lighter';

  // Red channel carries the fill, green carries the dashed outline. The shader
  // samples both so the pointer can blur one and sharpen the other.
  ctx.fillStyle = '#ff0000';
  ctx.fillText(text, pad, pad + m.ascent);

  const block = m.ascent + m.descent;
  ctx.strokeStyle = '#00ff00';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1, block * DOT_DIAMETER);
  ctx.setLineDash([0, Math.max(2, block * DOT_PITCH)]);
  ctx.strokeText(text, pad, pad + m.ascent);

  const cssPerPx = drawFontPx / fontPx;
  return { canvas, cssW: width * cssPerPx, cssH: height * cssPerPx };
}

type HandleGroup = { size: number; spread: number; labels: boolean };

const HANDLE_DEFAULTS: HandleGroup = { size: 109, spread: 27, labels: true };

export interface VectorWordmarkProps {
  text?: string;
  font?: React.CSSProperties;
  background?: string;
  textColor?: string;
  shade?: string;
  accent?: string;
  reach?: number;
  speed?: number;
  damping?: number;
  handles?: Partial<HandleGroup>;
  style?: React.CSSProperties;
  className?: string;
}

export default function VectorWordmark({
  text = 'RENGERA',
  font,
  background = 'transparent',
  textColor = '#0f172a',
  shade = '#cbd5e1',
  accent = '#b69d74',
  reach = 271,
  speed = 21,
  damping = 60,
  handles,
  style,
  className,
}: VectorWordmarkProps) {
  const group: HandleGroup = { ...HANDLE_DEFAULTS, ...(handles ?? {}) };

  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]);

  const rawSize = font?.fontSize;
  const fontSpec: FontSpec = {
    family: (font?.fontFamily as string) || 'Inter, system-ui, sans-serif',
    weight: String(font?.fontWeight ?? 500),
    style: font?.fontStyle === 'italic' ? 'italic' : 'normal',
    size: Math.max(8, parseFloat(String(rawSize ?? 240)) || 240),
    letterSpacing: String(font?.letterSpacing ?? '0px'),
  };

  const accentRgba = parseColor(accent, [0.714, 0.616, 0.455, 0.45]);
  const labelColor = `rgb(${Math.round(accentRgba[0] * 255)}, ${Math.round(
    accentRgba[1] * 255,
  )}, ${Math.round(accentRgba[2] * 255)})`;

  const live = useRef({
    text,
    fontSpec,
    textColor,
    shade,
    background,
    accentRgba,
    reach,
    speed,
    damping,
    group,
  });

  live.current.text = text;
  live.current.fontSpec = fontSpec;
  live.current.textColor = textColor;
  live.current.shade = shade;
  live.current.background = background;
  live.current.accentRgba = accentRgba;
  live.current.reach = reach;
  live.current.speed = speed;
  live.current.damping = damping;
  live.current.group = group;

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const attributes: WebGLContextAttributes = {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: 'high-performance',
    };

    const gl = (canvas.getContext('webgl2', attributes) ||
      canvas.getContext('webgl', attributes)) as WebGLRenderingContext | null;
    if (!gl) return;

    let program: WebGLProgram;
    try {
      program = compile(gl, VERT, FRAG);
    } catch {
      return;
    }

    const U = {
      map: gl.getUniformLocation(program, 'uMap'),
      res: gl.getUniformLocation(program, 'uRes'),
      atlas: gl.getUniformLocation(program, 'uAtlas'),
      ptr: gl.getUniformLocation(program, 'uPtr'),
      reach: gl.getUniformLocation(program, 'uReach'),
      text: gl.getUniformLocation(program, 'uText'),
      shade: gl.getUniformLocation(program, 'uShade'),
      accent: gl.getUniformLocation(program, 'uAccent'),
      v0: gl.getUniformLocation(program, 'uV0'),
      v1: gl.getUniformLocation(program, 'uV1'),
      v2: gl.getUniformLocation(program, 'uV2'),
      half: gl.getUniformLocation(program, 'uHalf'),
    };

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.BLEND);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255]),
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    let alive = true;
    let boxWidth = Math.max(1, host.offsetWidth);
    let boxHeight = Math.max(1, host.offsetHeight);
    let boxDirty = true;
    let dpr = 1;
    let bufferWidth = 0;
    let bufferHeight = 0;
    let atlasRatioW = 1;
    let atlasRatioH = 1;
    let atlasKey = '';

    const drawFontPx = () => live.current.fontSpec.size * (boxWidth / REF_WIDTH);

    const resize = () => {
      boxWidth = Math.max(1, host!.offsetWidth);
      boxHeight = Math.max(1, host!.offsetHeight);
      dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(boxWidth * dpr));
      const h = Math.max(1, Math.round(boxHeight * dpr));
      if (w === bufferWidth && h === bufferHeight) return;
      bufferWidth = w;
      bufferHeight = h;
      canvas!.width = w;
      canvas!.height = h;
    };

    const rebuildAtlas = () => {
      const state = live.current;
      const f = state.fontSpec;
      const px = Math.max(8, drawFontPx());
      const atlas = buildAtlas(state.text || ' ', f, px, dpr);
      if (!atlas) return;
      atlasRatioW = Math.max(1e-4, atlas.cssW / px);
      atlasRatioH = Math.max(1e-4, atlas.cssH / px);

      // The atlas is rasterised from a font, so it must be rebuilt once the
      // webfont has actually loaded or the wordmark renders in a fallback.
      if (typeof document !== 'undefined' && document.fonts) {
        try {
          const probe = fontString(f, 64);
          if (!document.fonts.check(probe)) {
            const reload = () => {
              if (alive) atlasKey = '';
            };
            document.fonts.load(probe, state.text).then(reload, reload);
          }
        } catch {
          // Font loading API is optional.
        }
      }

      gl!.bindTexture(gl!.TEXTURE_2D, tex);
      gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, true);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, atlas.canvas);
      gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, false);

      const cw = atlas.canvas.width;
      const ch = atlas.canvas.height;
      const powerOfTwo = (cw & (cw - 1)) === 0 && (ch & (ch - 1)) === 0;
      const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;

      if (isWebGL2 || powerOfTwo) {
        gl!.generateMipmap(gl!.TEXTURE_2D);
        gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR_MIPMAP_LINEAR);
      } else {
        gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
      }
    };

    const target = { x: -0.5, y: 0.5 };
    const eased = { x: -0.5, y: 0.5 };
    const cells = Array.from({ length: HANDLES }, () => ({ x: -0.5, y: 0.5 }));
    const verts = Array.from({ length: HANDLES }, () => ({ x: -0.5, y: 0.5 }));

    let hasPointer = false;
    let sweepClock = 0;
    let drift = 0;

    // Snap each handle to the nearest cell centre so the dashed boxes stay
    // locked to the glyph while the pointer drags them around.
    const snap = (x: number, y: number, cw: number, ch: number) => {
      const cx = Math.floor(x / cw);
      const cy = Math.floor(y / ch);
      const found: { x: number; y: number; d: number }[] = [];

      for (let i = -1; i <= 1; i += 1) {
        for (let j = -1; j <= 1; j += 1) {
          const px = (cx + i + 0.5) * cw;
          const py = (cy + j + 0.5) * ch;
          found.push({ x: px, y: py, d: Math.hypot(px - x, py - y) });
        }
      }

      found.sort((a, b) => a.d - b.d);
      for (let i = 0; i < HANDLES; i += 1) {
        cells[i].x = found[i + 1].x;
        cells[i].y = found[i + 1].y;
      }
    };

    const onMove = (event: PointerEvent) => {
      hasPointer = true;
      const rect = host!.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      target.x = (event.clientX - rect.left) / rect.width;
      target.y = 1 - (event.clientY - rect.top) / rect.height;
    };

    host.addEventListener('pointermove', onMove);

    const sync = () => {
      if (boxDirty) {
        boxDirty = false;
        resize();
      }
      const state = live.current;
      const f = state.fontSpec;
      const key = [
        state.text,
        f.family,
        f.weight,
        f.style,
        f.letterSpacing,
        dpr,
        Math.ceil(Math.max(8, drawFontPx()) / 64),
      ].join('|');

      if (key !== atlasKey) {
        atlasKey = key;
        rebuildAtlas();
      }
    };

    const step = (dt: number) => {
      const state = live.current;
      const rate = Math.max(0, state.speed) / SPEED_REF;
      const cw = Math.max(0.01, state.group.spread / 100);
      const ch = cw * CELL_ASPECT;
      const aspect = boxWidth / boxHeight;

      if (!hasPointer) {
        // Idle: sweep the handles across the word on their own.
        const band = (atlasRatioH * Math.max(8, drawFontPx())) / boxHeight;
        target.x += dt * SWEEP_RATE * rate;
        target.y = (1 - band) / 2 + SWEEP_BAND * band;
        if (target.x > 1.5) {
          target.x = -0.5;
          eased.x = -0.5;
        }
        sweepClock += dt;
        if (sweepClock >= RESNAP) {
          sweepClock = 0;
          snap(target.x * aspect, target.y, cw, ch);
        }
      } else {
        snap(target.x * aspect, target.y, cw, ch);
      }

      const damp = clamp((state.damping / 100) * DAMP_REF * dt, 0, 1);
      eased.x += (target.x - eased.x) * damp;
      eased.y += (target.y - eased.y) * damp;

      drift += dt * rate;
      for (let i = 0; i < HANDLES; i += 1) {
        const cell = cells[i];
        const sx = Math.round(cell.x / cw - 0.5);
        const sy = Math.round(cell.y / ch - 0.5);
        const h1 = fract(Math.sin(sx * 127.1 + sy * 311.7) * 43758.5453);
        const h2 = fract(Math.sin(sx * 269.5 + sy * 183.3) * 43758.5453);
        verts[i].x = cell.x + DRIFT_X * cw * Math.sin(drift * DRIFT_RATE + h1 * Math.PI * 2);
        verts[i].y = cell.y + DRIFT_Y * ch * Math.sin(drift * DRIFT_RATE_Y + h2 * Math.PI * 2);
      }
    };

    const writeLabels = () => {
      const state = live.current;
      const aspect = boxWidth / boxHeight;
      const half = state.group.size / 2;

      for (let i = 0; i < HANDLES; i += 1) {
        const element = labelRefs.current[i];
        if (!element) continue;
        const bx = verts[i].x / aspect;
        const by = verts[i].y;
        const gx = Math.round(clamp(bx * 100, 0, 100));
        const gy = Math.round(clamp(by * 100, 0, 100));
        element.style.transform = `translate(${bx * boxWidth - half}px, ${(1 - by) * boxHeight - half}px)`;
        element.style.opacity = '0.6';
        element.textContent = `${gx}, ${gy}`;
      }
    };

    const draw = () => {
      const state = live.current;
      const tc = parseColor(state.textColor, [0.059, 0.09, 0.16, 1]);
      const sc = parseColor(state.shade, [0.796, 0.835, 0.882, 1]);
      const ac = state.accentRgba;

      gl!.viewport(0, 0, bufferWidth, bufferHeight);
      gl!.useProgram(program);
      gl!.uniform1i(U.map, 0);
      gl!.activeTexture(gl.TEXTURE0);
      gl!.bindTexture(gl.TEXTURE_2D, tex);
      gl!.uniform2f(U.res, boxWidth, boxHeight);

      const px = Math.max(8, drawFontPx());
      gl!.uniform2f(U.atlas, atlasRatioW * px, atlasRatioH * px);
      gl!.uniform2f(U.ptr, eased.x, eased.y);
      gl!.uniform1f(U.reach, Math.max(1, state.reach) / boxWidth);
      gl!.uniform3f(U.text, tc[0], tc[1], tc[2]);
      gl!.uniform3f(U.shade, sc[0], sc[1], sc[2]);
      gl!.uniform4f(U.accent, ac[0], ac[1], ac[2], ac[3]);
      gl!.uniform2f(U.v0, verts[0].x, verts[0].y);
      gl!.uniform2f(U.v1, verts[1].x, verts[1].y);
      gl!.uniform2f(U.v2, verts[2].x, verts[2].y);
      gl!.uniform1f(U.half, state.group.size / 2 / boxHeight);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    };

    let frame = 0;
    let last = 0;
    let running = true;

    const loop = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      sync();
      step(dt);
      writeLabels();
      draw();
      frame = requestAnimationFrame(loop);
    };

    // Stop burning GPU while the tab is in the background.
    const gate = () => {
      if (running && !document.hidden) {
        if (!frame) {
          last = 0;
          frame = requestAnimationFrame(loop);
        }
      } else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const observer = new ResizeObserver(() => {
      boxDirty = true;
    });
    observer.observe(host);
    document.addEventListener('visibilitychange', gate);

    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(
        () => {
          if (alive) atlasKey = '';
        },
        () => {},
      );
    }

    gate();

    return () => {
      alive = false;
      running = false;
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', gate);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background,
        // Upstream pins 1200x800 minimums, which breaks every phone layout.
        minWidth: 0,
        minHeight: 0,
        width: '100%',
        height: '100%',
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />
      {group.labels
        ? [0, 1, 2].map((i) => (
            <div
              key={i}
              ref={(element) => {
                labelRefs.current[i] = element;
              }}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                opacity: 0.6,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 11,
                letterSpacing: '0.08em',
                color: labelColor,
              }}
            />
          ))
        : null}
    </div>
  );
}