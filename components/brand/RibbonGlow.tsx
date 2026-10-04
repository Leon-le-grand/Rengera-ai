'use client';

import { useEffect, useRef } from 'react';

const MAX_DPR = 2;
const NAME = 'RibbonGlow';
const LAYERS = 84;
const TWIST = 1.25;
const DRAG = 0.18;

const VERT_SRC = `#version 300 es
const vec2 P[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() { gl_Position = vec4(P[gl_VertexID], 0.0, 1.0); }
`;

const FIELD_SRC = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uC1;
uniform vec3 uC2;
uniform float uSize;
uniform float uAngle;
uniform vec2 uMouse;
uniform float uOn;
uniform float uReach;
uniform vec2 uVel;
out vec4 o;
const float LAYERS = ${LAYERS.toFixed(1)};
const float TWIST = ${TWIST.toFixed(3)};
const float DRAG = ${DRAG.toFixed(3)};
const float GAIN = 0.62;
const vec2 CENTRE = vec2(-0.62, 0.24);
const float TILT = 0.6;
const float ZOOM = 1.05;
const float THETA = 2.13;
const float SHEAR = 0.963;
const float SHRINK = 0.953;
const vec2 WARP_FREQ = vec2(0.42, 2.4);
const vec2 WARP_AMP = vec2(0.13, 0.027);
const vec2 ASPECT = vec2(2.1, 0.17);
const float OFFSET = 0.36;
const float GLOW = 0.0021;
const float SOFT = 0.0019;
const float FALLOFF = 0.37;
const float PHASE = 12.0;
const float CYCLE = 0.16;
const float HUE_TRAVEL = 2.0;
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
void main() {
  vec2 R = uRes;
  vec2 pos = (gl_FragCoord.xy - 0.5 * R) / R.y;
  vec2 d = pos - uMouse;
  float w = uOn * exp(-dot(d, d) / (uReach * uReach));
  if (w > 1e-4) pos = uMouse + rot(w * TWIST) * d * (1.0 - 0.3 * min(w, 1.0)) - uVel * min(w, 1.0) * DRAG;
  pos = rot(uAngle) * pos / uSize;
  float t = uTime * 0.49 + PHASE;
  float breath = (-sin(uTime * 0.735) + sin(uTime * 0.49 + 1.0)) * 0.25 + 0.5;
  vec2 u = rot(TILT) * ((pos - CENTRE) * (ZOOM - breath * 0.085));
  mat2 fold = mat2(cos(THETA), sin(THETA), -SHEAR, cos(THETA));
  vec3 col = vec3(0.0);
  for (float i = 1.0; i <= LAYERS; i += 1.0) {
    u.x -= sin(u.y * WARP_FREQ.x + t + i * 0.007) * WARP_AMP.x;
    u.y -= sin(u.x * WARP_FREQ.y - t + i * 0.02) * WARP_AMP.y;
    u = fold * u * SHRINK;
    vec2 q = (u - vec2(OFFSET + breath * 0.1, 0.0)) * ASPECT;
    float g = GLOW / (dot(q, q) + SOFT) * (0.25 + breath * 0.4);
    float r = length(u);
    float k = sin(i * CYCLE + t * 1.2 + r * HUE_TRAVEL) * 0.5 + 0.5;
    col += g * mix(uC1, uC2, k) * (0.62 + 0.5 * k) * exp2(-r * FALLOFF);
  }
  vec3 x = max(col * GAIN, 0.0);
  col = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
  col = pow(clamp(col, 0.0, 1.0), vec3(0.85, 0.92, 0.98));
  col *= 1.0 - smoothstep(0.5, 1.6, length(pos)) * 0.07;
  o = vec4(col, 1.0);
}
`;

const FINISH_SRC = `#version 300 es
precision highp float;
uniform sampler2D uField;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uBg;
uniform float uPaper;
out vec4 o;
float ign(vec2 p, float f) {
  p += 5.588238 * mod(f, 64.0);
  return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y));
}
void main() {
  vec2 frag = gl_FragCoord.xy;
  vec3 L = max(texture(uField, frag / uRes).rgb, 0.0);
  vec3 dark = uBg + L * (1.0 - uBg);
  float strength = clamp(max(L.r, max(L.g, L.b)), 0.0, 1.0);
  vec3 paper = uBg * (1.0 - strength) + L * 0.96;
  vec3 col = mix(dark, paper, uPaper);
  col += (ign(frag, floor(uTime * 24.0)) - 0.5) / 255.0;
  o = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

type RGB = [number, number, number];

const colorCache = new Map<string, RGB | null>();

function parseColor(input: string | undefined): RGB | null {
  if (!input) return null;
  const key = String(input);
  if (colorCache.has(key)) return colorCache.get(key) ?? null;

  let text = key.trim();
  const fallbackMatch = text.match(/^var\(\s*--[^,]+,\s*(.+)\)$/);
  if (fallbackMatch) text = fallbackMatch[1].trim();

  let out: RGB | null = null;

  if (text.charAt(0) === '#') {
    let hex = text.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
        out = [r / 255, g / 255, b / 255];
      }
    }
  } else {
    const match = text.match(/^(rgba?|hsla?)\(([^)]*)\)/i);
    if (match) {
      const parts = match[2].split(/[\s,/]+/).filter(Boolean);
      const at = (index: number) => parseFloat(parts[index]);
      if (parts.length >= 3 && [0, 1, 2].every((i) => Number.isFinite(at(i)))) {
        if (match[1].toLowerCase().startsWith('rgb')) {
          const channel = (index: number) =>
            parts[index].endsWith('%') ? at(index) / 100 : at(index) / 255;
          out = [channel(0), channel(1), channel(2)];
        } else {
          const hue = (((at(0) % 360) + 360) % 360) / 360;
          const saturation = at(1) / 100;
          const lightness = at(2) / 100;
          const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
          const p = 2 * lightness - q;
          const toRgb = (t: number) => {
            let u = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
            if (u < 1 / 6) return p + (q - p) * 6 * u;
            if (u < 1 / 2) return q;
            if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
            return p;
          };
          out = [toRgb(hue + 1 / 3), toRgb(hue), toRgb(hue - 1 / 3)];
        }
        out = out.map((channel) => Math.min(1, Math.max(0, channel))) as RGB;
      }
    }
  }

  colorCache.set(key, out);
  return out;
}

function color(input: string | undefined, fallback: string): RGB {
  return parseColor(input) ?? (parseColor(fallback) as RGB);
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && isFinite(value) ? value : fallback;
}

function clampN(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value;
}

function link(
  gl: WebGL2RenderingContext,
  fragmentSource: string,
  label: string,
): WebGLProgram | null {
  const shader = (type: number, source: string) => {
    const sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, source);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error(`${NAME} ${label} shader:`, gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  };

  const vertex = shader(gl.VERTEX_SHADER, VERT_SRC);
  const fragment = shader(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(`${NAME} ${label} link:`, gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function locations(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  names: string[],
) {
  const out: Record<string, WebGLUniformLocation | null> = {};
  for (const name of names) out[name] = gl.getUniformLocation(program, name);
  return out;
}

function fieldTarget(gl: WebGL2RenderingContext) {
  const fbo = gl.createFramebuffer();
  let tex: WebGLTexture | null = null;
  let width = 0;
  let height = 0;
  let half = !!gl.getExtension('EXT_color_buffer_float');

  return {
    fbo,
    texture: () => tex,
    width: () => width,
    height: () => height,
    resize(nextWidth: number, nextHeight: number) {
      if (nextWidth === width && nextHeight === height && tex) return;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        if (tex) gl.deleteTexture(tex);
        tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          half ? gl.RGBA16F : gl.RGBA8,
          nextWidth,
          nextHeight,
          0,
          gl.RGBA,
          half ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
          null,
        );
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

        const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        if (ok || !half) break;
        half = false;
      }

      width = nextWidth;
      height = nextHeight;
    },
    dispose() {
      if (tex) gl.deleteTexture(tex);
      gl.deleteFramebuffer(fbo);
    },
  };
}

function trackPointer(root: HTMLElement) {
  const pointer = { tx: 0, ty: 0, inside: false, seen: false };

  const read = (event: PointerEvent) => {
    const rect = root.getBoundingClientRect();
    const scaleX = root.offsetWidth / (rect.width || 1);
    const scaleY = root.offsetHeight / (rect.height || 1);
    pointer.tx = (event.clientX - rect.left) * scaleX;
    pointer.ty = (event.clientY - rect.top) * scaleY;
    pointer.inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    pointer.seen = true;
  };

  const out = (event: PointerEvent) => {
    if (!event.relatedTarget) pointer.inside = false;
  };

  window.addEventListener('pointermove', read, { passive: true });
  window.addEventListener('pointerdown', read, { passive: true });
  document.addEventListener('pointerout', out);

  return {
    pointer,
    dispose() {
      window.removeEventListener('pointermove', read);
      window.removeEventListener('pointerdown', read);
      document.removeEventListener('pointerout', out);
    },
  };
}

const DEFAULTS = {
  background: '#0B0A10',
  color1: '#2FD3F2',
  color2: '#7B61FF',
};

export interface RibbonGlowProps {
  style?: React.CSSProperties;
  background?: string;
  color1?: string;
  color2?: string;
  speed?: number;
  size?: number;
  angle?: number;
  hover?: number;
  reach?: number;
  width?: number;
  height?: number;
  className?: string;
}

export default function RibbonGlow({
  style,
  background = DEFAULTS.background,
  color1 = DEFAULTS.color1,
  color2 = DEFAULTS.color2,
  speed = 50,
  size = 100,
  angle = -180,
  hover = 100,
  reach = 240,
  width,
  height,
  className,
}: RibbonGlowProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef({ background, color1, color2, speed: 1, size: 1, angle: 0, hover: 1, reach: 240 });

  configRef.current = {
    background,
    color1,
    color2,
    speed: clampN(num(speed, 50), 0, 100) / 50,
    size: clampN(num(size, 100), 50, 200) / 100,
    angle: (clampN(num(angle, 0), -180, 180) * Math.PI) / 180,
    hover: clampN(num(hover, 100), 0, 200) / 100,
    reach: clampN(num(reach, 240), 10, 800),
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;

    // Reduced motion still gets one painted frame, then stops.
    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Phones and low-core machines get a smaller buffer, so the 84-layer
    // fragment shader has far fewer pixels to cover per frame.
    const lowPower =
      typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 8) <= 4;
    const dprCap = lowPower ? 1 : MAX_DPR;
    // The field pass is already half resolution. Drop it further on weak GPUs.
    const fieldScale = lowPower ? 3 : 2;

    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
    });

    if (!gl) {
      console.error(`${NAME}: WebGL2 unavailable`);
      return;
    }

    const field = link(gl, FIELD_SRC, 'field');
    const finish = link(gl, FINISH_SRC, 'finish');
    if (!field || !finish) return;

    const fieldUniforms = locations(gl, field, [
      'uRes', 'uTime', 'uC1', 'uC2', 'uSize', 'uAngle', 'uMouse', 'uOn', 'uReach', 'uVel',
    ]);
    const finishUniforms = locations(gl, finish, ['uField', 'uRes', 'uTime', 'uBg', 'uPaper']);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const target = fieldTarget(gl);
    const tracker = trackPointer(root);
    const pointer = tracker.pointer;

    let mouseX = 0;
    let mouseY = 0;
    let velocityX = 0;
    let velocityY = 0;
    let on = 0;
    let frameId = 0;
    let last = -1;
    let clock = 0;
    let running = true;

    const render = (now: number) => {
      // Reduced motion paints exactly one frame; every other path keeps going.
      if (!reducedMotion) {
        frameId = requestAnimationFrame(render);
      }
      const delta = last < 0 ? 0 : clampN((now - last) / 1000, 0, 0.05);
      last = now;

      const config = configRef.current;
      clock = (clock + delta * config.speed) % 3600;

      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      const cssWidth = canvas.clientWidth || 1200;
      const cssHeight = canvas.clientHeight || 800;
      const bufferWidth = Math.max(1, Math.round(cssWidth * dpr));
      const bufferHeight = Math.max(1, Math.round(cssHeight * dpr));

      if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
        canvas.width = bufferWidth;
        canvas.height = bufferHeight;
      }
      target.resize(
        Math.max(1, Math.round(bufferWidth / fieldScale)),
        Math.max(1, Math.round(bufferHeight / fieldScale)),
      );

      const present = pointer.inside ? 1 : 0;
      if (present && on < 0.02) {
        mouseX = pointer.tx;
        mouseY = pointer.ty;
      }
      on += (present - on) * (1 - Math.exp(-delta * 5));

      const smoothing = 1 - Math.exp(-delta * 16);
      const nextX = mouseX + (pointer.tx - mouseX) * smoothing;
      const nextY = mouseY + (pointer.ty - mouseY) * smoothing;

      if (delta > 0) {
        const velocitySmoothing = 1 - Math.exp(-delta * 8);
        velocityX += ((nextX - mouseX) / delta - velocityX) * velocitySmoothing;
        velocityY += ((nextY - mouseY) / delta - velocityY) * velocitySmoothing;
      }
      mouseX = nextX;
      mouseY = nextY;

      const velocityLength = Math.hypot(velocityX, velocityY) / cssHeight;
      const velocityCap = velocityLength > 3 ? 3 / velocityLength : 1;

      const c1 = color(config.color1, DEFAULTS.color1);
      const c2 = color(config.color2, DEFAULTS.color2);
      const bg = color(config.background, DEFAULTS.background);
      const bgLuminance = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2];

      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      gl.viewport(0, 0, target.width(), target.height());
      gl.useProgram(field);
      gl.uniform2f(fieldUniforms.uRes, target.width(), target.height());
      gl.uniform1f(fieldUniforms.uTime, clock);
      gl.uniform3f(fieldUniforms.uC1, c1[0], c1[1], c1[2]);
      gl.uniform3f(fieldUniforms.uC2, c2[0], c2[1], c2[2]);
      gl.uniform1f(fieldUniforms.uSize, config.size);
      gl.uniform1f(fieldUniforms.uAngle, config.angle);
      gl.uniform2f(
        fieldUniforms.uMouse,
        (mouseX - cssWidth / 2) / cssHeight,
        (cssHeight / 2 - mouseY) / cssHeight,
      );
      gl.uniform1f(fieldUniforms.uOn, on * config.hover);
      gl.uniform1f(fieldUniforms.uReach, config.reach / cssHeight);
      gl.uniform2f(
        fieldUniforms.uVel,
        (velocityX / cssHeight) * velocityCap,
        (-velocityY / cssHeight) * velocityCap,
      );
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, bufferWidth, bufferHeight);
      gl.useProgram(finish);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, target.texture());
      gl.uniform1i(finishUniforms.uField, 0);
      gl.uniform2f(finishUniforms.uRes, bufferWidth, bufferHeight);
      gl.uniform1f(finishUniforms.uTime, clock);
      gl.uniform3f(finishUniforms.uBg, bg[0], bg[1], bg[2]);
      gl.uniform1f(finishUniforms.uPaper, clampN((bgLuminance - 0.35) / 0.3, 0, 1));
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (reducedMotion) {
        frameId = 0;
        drewOnce = true;
      }
    };

    let onScreen = true;
    let drewOnce = false;

    const gate = () => {
      const shouldRun = running && !document.hidden && (onScreen || (!drewOnce && reducedMotion));
      if (shouldRun) {
        if (!frameId) {
          last = -1;
          frameId = requestAnimationFrame(render);
        }
      } else if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
    };

    const onVisibility = () => gate();
    document.addEventListener('visibilitychange', onVisibility);

    // Without this the hero keeps rendering after the user scrolls past it,
    // which is the single biggest cost on a phone.
    const observer = new IntersectionObserver(
      (entries) => {
        onScreen = entries.some((entry) => entry.isIntersecting);
        gate();
      },
      { rootMargin: '160px' },
    );
    observer.observe(root);

    gate();

    return () => {
      running = false;
      observer.disconnect();
      if (frameId) cancelAnimationFrame(frameId);
      document.removeEventListener('visibilitychange', onVisibility);
      tracker.dispose();
      target.dispose();
      gl.deleteVertexArray(vao);
      gl.deleteProgram(field);
      gl.deleteProgram(finish);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background,
        // The upstream preset pins minWidth/minHeight to 1200x800, which
        // forces horizontal scrolling on phones. The canvas fills its parent
        // instead, and the parent controls the height.
        minWidth: 0,
        minHeight: 0,
        width: typeof width === 'number' && width > 0 ? width : '100%',
        height: typeof height === 'number' && height > 0 ? height : '100%',
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}