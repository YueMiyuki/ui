"use client";

import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { type ComponentProps, type PointerEvent, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface ColourSplitProps extends ComponentProps<"div"> {
  src: string;
  alt: string;
  shift?: number;
  displacement?: number;
  zoom?: number;
  tilt?: number;
}

const SETTLE = { stiffness: 420, damping: 34 };

const VERTEX = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAGMENT = `
precision mediump float;
uniform sampler2D u_tex;
uniform vec2 u_res;
uniform vec2 u_img;
uniform vec2 u_pointer;
uniform vec2 u_lean;
uniform float u_active;
uniform float u_shift;
uniform float u_disp;
uniform float u_zoom;
varying vec2 v_uv;

vec2 cover(vec2 uv) {
  float ra = u_res.x / u_res.y;
  float ri = u_img.x / u_img.y;
  vec2 scale = ra > ri ? vec2(1.0, ri / ra) : vec2(ra / ri, 1.0);
  vec2 p = (uv - 0.5) * scale + 0.5;
  return 1.0 - abs(1.0 - mod(p, 2.0));
}

void main() {
  float zoom = mix(1.01, u_zoom, u_active);
  vec2 uv = (v_uv - 0.5) / zoom + 0.5 - u_pointer * u_disp * 0.5 * u_active;
  vec2 c = v_uv - 0.5;
  vec2 rest = c * dot(c, c) * 1.3 * u_shift;
  vec2 lean = (u_pointer * 0.75 + u_lean * 2.2) * u_shift * u_active;
  vec2 off = rest + lean;
  float r = texture2D(u_tex, cover(uv + off)).r;
  float g = texture2D(u_tex, cover(uv)).g;
  float b = texture2D(u_tex, cover(uv - off)).b;
  gl_FragColor = vec4(r, g, b, 1.0);
}
`;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function ColourSplit({
  src,
  alt,
  shift = 0.012,
  displacement = 0.04,
  zoom = 1.04,
  tilt = 6,
  className,
  style,
  children,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  ...props
}: ColourSplitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const reduce = useReducedMotion() ?? false;
  const [ready, setReady] = useState(false);
  const px = useSpring(0, SETTLE);
  const py = useSpring(0, SETTLE);
  const active = useSpring(0, SETTLE);
  const rotateX = useTransform(py, (v) => -v * tilt);
  const rotateY = useTransform(px, (v) => v * tilt);
  const live = ready && !reduce;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, premultipliedAlpha: false });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const uRes = u("u_res");
    const uImg = u("u_img");
    const uPointer = u("u_pointer");
    const uLean = u("u_lean");
    const uActive = u("u_active");
    gl.uniform1f(u("u_shift"), shift);
    gl.uniform1f(u("u_disp"), displacement);
    gl.uniform1f(u("u_zoom"), Math.max(1, zoom));
    gl.uniform1i(u("u_tex"), 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    let loaded = false;
    let onScreen = true;
    let frame = 0;
    let disposed = false;

    const draw = () => {
      frame = 0;
      if (!loaded || !onScreen || disposed) return;
      const x = px.get();
      const y = py.get();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uPointer, x, y);
      gl.uniform2f(uLean, target.current.x - x, target.current.y - y);
      gl.uniform1f(uActive, active.get());
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      schedule();
    };

    const image = new Image();
    if (!/^(data|blob):/.test(src)) image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => {
      if (disposed) return;
      try {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      } catch {
        return;
      }
      gl.uniform2f(uImg, image.naturalWidth || 1, image.naturalHeight || 1);
      loaded = true;
      resize();
      draw();
      setReady(true);
    };
    image.src = src;

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? true;
      if (onScreen) schedule();
    });
    io.observe(canvas);
    const lost = (e: Event) => {
      e.preventDefault();
      setReady(false);
    };
    canvas.addEventListener("webglcontextlost", lost);
    const offs = [px, py, active].map((v) => v.on("change", schedule));

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      image.onload = null;
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("webglcontextlost", lost);
      offs.forEach((off) => off());
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      setReady(false);
    };
  }, [src, shift, displacement, zoom, px, py, active]);

  const follow = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    const y = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
    target.current = { x, y };
    px.set(x);
    py.set(y);
    active.set(1);
  };

  return (
    <div
      {...props}
      className={cn("relative", className)}
      style={{ perspective: 900, ...style }}
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        if (live && e.pointerType !== "touch") follow(e);
      }}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        if (live && e.pointerType !== "touch") follow(e);
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        target.current = { x: 0, y: 0 };
        px.set(0);
        py.set(0);
        active.set(0);
      }}
    >
      <motion.div
        className="relative size-full overflow-hidden rounded-[inherit] shadow-lg"
        style={live ? { rotateX, rotateY } : undefined}
      >
        <img src={src} alt={alt} draggable={false} className="absolute inset-0 size-full object-cover" />
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 block size-full transition-opacity duration-300 ease-settle",
            ready ? "opacity-100" : "opacity-0",
          )}
        />
        {children != null ? <div className="absolute inset-0">{children}</div> : null}
      </motion.div>
    </div>
  );
}
