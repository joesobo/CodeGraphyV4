import type { LiquidElements, LiquidInstance, LiquidOptions } from './types';
import {
  FRAG_ADVECT,
  FRAG_CLEAR,
  FRAG_CURL,
  FRAG_DISPLAY,
  FRAG_DIVERGENCE,
  FRAG_GRADIENT,
  FRAG_PRESSURE,
  FRAG_SPLAT,
  FRAG_VORTICITY,
  VERT,
} from './shaders';

const DEFAULTS: Required<LiquidOptions> = {
  simResolution: 128,
  dyeResolution: 512,
  densityDissipation: 0.96,
  velocityDissipation: 1,
  pressure: 0.8,
  pressureIterations: 4,
  curl: 1.9,
  radius: 0.3,
  force: 1.1,
  intensity: 2,
  distortion: 0.4,
  blend: 5,
  color: [0.145, 0.239, 0.867],
  rainbow: false,
};

const DT = 1 / 60;

function srgbToLinear(value: number): number {
  return value <= 0.04045
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4);
}

type PaintableCanvas = HTMLCanvasElement & {
  onpaint?: (() => void) | null;
  requestPaint?: () => void;
};

type ElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => void;
};

interface Target {
  fbo: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
}

interface DoubleTarget {
  read: Target;
  write: Target;
  swap: () => void;
}

export function supportsHtmlInCanvas(): boolean {
  if (typeof document === "undefined") return false;
  const probe = document.createElement("canvas") as PaintableCanvas;
  const ctx = probe.getContext("2d") as ElementImageContext | null;
  return Boolean(
    ctx &&
    typeof ctx.drawElementImage === "function" &&
    typeof probe.requestPaint === "function",
  );
}

export function createLiquid(
  elements: LiquidElements,
  options: LiquidOptions = {},
): LiquidInstance | null {
  const config = { ...DEFAULTS, ...options };
  const { source, content, interactionTarget, output } = elements;

  const gl = output.getContext("webgl2", {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: true,
  });
  if (!gl || gl.isContextLost()) return null;

  const sourceCtx = source.getContext("2d") as ElementImageContext | null;
  const paintable = source as PaintableCanvas;
  const htmlInCanvas = Boolean(
    sourceCtx &&
    typeof sourceCtx.drawElementImage === "function" &&
    typeof paintable.requestPaint === "function",
  );

  let contentDirty = false;
  let wake = () => {};

  if (htmlInCanvas) {
    paintable.onpaint = () => {
      try {
        sourceCtx!.reset();
        sourceCtx!.drawElementImage!(content, 0, 0);
        contentDirty = true;
        wake();
      } catch {
        // Keep the original image visible when the experimental capture API fails.
      }
    };
  }

  gl.getExtension("EXT_color_buffer_float");
  const supportsLinear = Boolean(gl.getExtension("OES_texture_float_linear"));
  const filtering = supportsLinear ? gl.LINEAR : gl.NEAREST;

  const shaders: WebGLShader[] = [];

  function compile(type: number, source: string): WebGLShader {
    const shader = gl!.createShader(type)!;
    gl!.shaderSource(shader, source);
    gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      console.error("Liquid shader error:", gl!.getShaderInfoLog(shader));
    }
    shaders.push(shader);
    return shader;
  }

  const vertexShader = compile(gl.VERTEX_SHADER, VERT);

  interface Program {
    program: WebGLProgram;
    uniforms: Record<string, WebGLUniformLocation>;
  }

  const programs: WebGLProgram[] = [];

  function createProgram(fragSource: string): Program {
    const program = gl!.createProgram();
    gl!.attachShader(program, vertexShader);
    gl!.attachShader(program, compile(gl!.FRAGMENT_SHADER, fragSource));
    gl!.linkProgram(program);
    programs.push(program);
    const uniforms: Record<string, WebGLUniformLocation> = {};
    const count = Number(gl!.getProgramParameter(program, gl!.ACTIVE_UNIFORMS));
    for (let i = 0; i < count; i++) {
      const info = gl!.getActiveUniform(program, i)!;
      uniforms[info.name] = gl!.getUniformLocation(program, info.name)!;
    }
    return { program, uniforms };
  }

  const displayProgram = createProgram(FRAG_DISPLAY);
  const splatProgram = createProgram(FRAG_SPLAT);
  const advectProgram = createProgram(FRAG_ADVECT);
  const clearProgram = createProgram(FRAG_CLEAR);
  const divergenceProgram = createProgram(FRAG_DIVERGENCE);
  const curlProgram = createProgram(FRAG_CURL);
  const vorticityProgram = createProgram(FRAG_VORTICITY);
  const pressureProgram = createProgram(FRAG_PRESSURE);
  const gradientProgram = createProgram(FRAG_GRADIENT);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  function createTarget(
    size: number,
    internalFormat: number,
    format: number,
    filter: number,
  ): Target {
    const texture = gl!.createTexture();
    gl!.bindTexture(gl!.TEXTURE_2D, texture);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, filter);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, filter);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.texImage2D(
      gl!.TEXTURE_2D,
      0,
      internalFormat,
      size,
      size,
      0,
      format,
      gl!.HALF_FLOAT,
      null,
    );
    const fbo = gl!.createFramebuffer();
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
    gl!.framebufferTexture2D(
      gl!.FRAMEBUFFER,
      gl!.COLOR_ATTACHMENT0,
      gl!.TEXTURE_2D,
      texture,
      0,
    );
    gl!.viewport(0, 0, size, size);
    gl!.clearColor(0, 0, 0, 1);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    return { fbo, texture, width: size, height: size };
  }

  function createDoubleTarget(
    size: number,
    internalFormat: number,
    format: number,
    filter: number,
  ): DoubleTarget {
    let read = createTarget(size, internalFormat, format, filter);
    let write = createTarget(size, internalFormat, format, filter);
    return {
      get read() {
        return read;
      },
      get write() {
        return write;
      },
      swap() {
        const previousRead = read;
        read = write;
        write = previousRead;
      },
    };
  }

  const velocity = createDoubleTarget(
    config.simResolution,
    gl.RG16F,
    gl.RG,
    filtering,
  );
  const dye = createDoubleTarget(
    config.dyeResolution,
    gl.RGBA16F,
    gl.RGBA,
    filtering,
  );
  const divergence = createTarget(
    config.simResolution,
    gl.R16F,
    gl.RED,
    gl.NEAREST,
  );
  const curl = createTarget(config.simResolution, gl.R16F, gl.RED, gl.NEAREST);
  const pressure = createDoubleTarget(
    config.simResolution,
    gl.R16F,
    gl.RED,
    gl.NEAREST,
  );

  function releaseAll() {
    [
      velocity.read,
      velocity.write,
      dye.read,
      dye.write,
      pressure.read,
      pressure.write,
      divergence,
      curl,
    ].forEach((target) => {
      gl!.deleteFramebuffer(target.fbo);
      gl!.deleteTexture(target.texture);
    });
  }

  let texelX = 0;
  let texelY = 0;

  function updateTexelSize() {
    const width = Math.max(output.clientWidth, 1);
    const height = Math.max(output.clientHeight, 1);
    texelX = 1 / (config.simResolution * (width / (height + 400)));
    texelY = 1 / config.simResolution;
  }

  function syncCanvasSize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(output.clientWidth * dpr));
    const height = Math.max(1, Math.round(output.clientHeight * dpr));
    if (output.width !== width || output.height !== height) {
      output.style.opacity = "0";
      output.width = width;
      output.height = height;
    }
    if (htmlInCanvas) {
      const cssWidth = Math.max(1, Math.round(source.clientWidth));
      const cssHeight = Math.max(1, Math.round(source.clientHeight));
      if (source.width !== cssWidth || source.height !== cssHeight) {
        source.width = cssWidth;
        source.height = cssHeight;
      }
      paintable.requestPaint!();
    }
    updateTexelSize();
  }

  syncCanvasSize();

  const contentTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, contentTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 0]),
  );

  function uploadContent() {
    if (!htmlInCanvas || !contentDirty) return;
    contentDirty = false;
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture);
    gl!.texImage2D(
      gl!.TEXTURE_2D,
      0,
      gl!.RGBA,
      gl!.RGBA,
      gl!.UNSIGNED_BYTE,
      source,
    );
  }

  function blit(target: Target | null) {
    if (target) {
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, target.fbo);
      gl!.viewport(0, 0, target.width, target.height);
    } else {
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
      gl!.viewport(0, 0, output.width, output.height);
    }
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  }

  function bindTexture(texture: WebGLTexture, unit: number): number {
    gl!.activeTexture(gl!.TEXTURE0 + unit);
    gl!.bindTexture(gl!.TEXTURE_2D, texture);
    return unit;
  }

  function applySplat(x: number, y: number, dx: number, dy: number) {
    const aspect = output.clientWidth / Math.max(output.clientHeight, 1);
    const radius = config.radius / 100;

    gl!.useProgram(splatProgram.program);
    gl!.uniform1i(
      splatProgram.uniforms.uTarget,
      bindTexture(velocity.read.texture, 0),
    );
    gl!.uniform1f(splatProgram.uniforms.uAspect, aspect);
    gl!.uniform2f(splatProgram.uniforms.uPoint, x, y);
    gl!.uniform3f(splatProgram.uniforms.uColor, dx, dy, 10);
    gl!.uniform1f(splatProgram.uniforms.uRadius, radius);
    blit(velocity.write);
    velocity.swap();

    gl!.uniform1i(
      splatProgram.uniforms.uTarget,
      bindTexture(dye.read.texture, 0),
    );
    blit(dye.write);
    dye.swap();
  }

  function step(delta: number) {
    gl!.disable(gl!.BLEND);

    gl!.useProgram(curlProgram.program);
    gl!.uniform2f(curlProgram.uniforms.texelSize, texelX, texelY);
    gl!.uniform1i(
      curlProgram.uniforms.uVelocity,
      bindTexture(velocity.read.texture, 0),
    );
    blit(curl);

    gl!.useProgram(vorticityProgram.program);
    gl!.uniform2f(vorticityProgram.uniforms.texelSize, texelX, texelY);
    gl!.uniform1i(
      vorticityProgram.uniforms.uVelocity,
      bindTexture(velocity.read.texture, 0),
    );
    gl!.uniform1i(
      vorticityProgram.uniforms.uCurl,
      bindTexture(curl.texture, 1),
    );
    gl!.uniform1f(vorticityProgram.uniforms.uCurlStrength, config.curl);
    gl!.uniform1f(vorticityProgram.uniforms.uDt, DT);
    blit(velocity.write);
    velocity.swap();

    gl!.useProgram(divergenceProgram.program);
    gl!.uniform2f(divergenceProgram.uniforms.texelSize, texelX, texelY);
    gl!.uniform1i(
      divergenceProgram.uniforms.uVelocity,
      bindTexture(velocity.read.texture, 0),
    );
    blit(divergence);

    gl!.useProgram(clearProgram.program);
    gl!.uniform1i(
      clearProgram.uniforms.uTexture,
      bindTexture(pressure.read.texture, 0),
    );
    gl!.uniform1f(
      clearProgram.uniforms.uValue,
      Math.pow(config.pressure, delta * 60),
    );
    blit(pressure.write);
    pressure.swap();

    gl!.useProgram(pressureProgram.program);
    gl!.uniform2f(pressureProgram.uniforms.texelSize, texelX, texelY);
    gl!.uniform1i(
      pressureProgram.uniforms.uDivergence,
      bindTexture(divergence.texture, 0),
    );
    for (let i = 0; i < config.pressureIterations; i++) {
      gl!.uniform1i(
        pressureProgram.uniforms.uPressure,
        bindTexture(pressure.read.texture, 1),
      );
      blit(pressure.write);
      pressure.swap();
    }

    gl!.useProgram(gradientProgram.program);
    gl!.uniform2f(gradientProgram.uniforms.texelSize, texelX, texelY);
    gl!.uniform1i(
      gradientProgram.uniforms.uPressure,
      bindTexture(pressure.read.texture, 0),
    );
    gl!.uniform1i(
      gradientProgram.uniforms.uVelocity,
      bindTexture(velocity.read.texture, 1),
    );
    blit(velocity.write);
    velocity.swap();

    gl!.useProgram(advectProgram.program);
    gl!.uniform2f(advectProgram.uniforms.texelSize, texelX, texelY);
    gl!.uniform1i(
      advectProgram.uniforms.uVelocity,
      bindTexture(velocity.read.texture, 0),
    );
    gl!.uniform1i(
      advectProgram.uniforms.uSource,
      bindTexture(velocity.read.texture, 0),
    );
    gl!.uniform1f(advectProgram.uniforms.uDt, DT);
    gl!.uniform1f(
      advectProgram.uniforms.uDissipation,
      Math.pow(config.velocityDissipation, delta * 60),
    );
    blit(velocity.write);
    velocity.swap();

    gl!.uniform1i(
      advectProgram.uniforms.uVelocity,
      bindTexture(velocity.read.texture, 0),
    );
    gl!.uniform1i(
      advectProgram.uniforms.uSource,
      bindTexture(dye.read.texture, 1),
    );
    gl!.uniform1f(
      advectProgram.uniforms.uDissipation,
      Math.pow(config.densityDissipation, delta * 60),
    );
    blit(dye.write);
    dye.swap();
  }

  function render() {
    uploadContent();
    gl!.useProgram(displayProgram.program);
    gl!.uniform1i(
      displayProgram.uniforms.uContent,
      bindTexture(contentTexture, 0),
    );
    gl!.uniform1i(
      displayProgram.uniforms.uFluid,
      bindTexture(dye.read.texture, 1),
    );
    gl!.uniform3f(
      displayProgram.uniforms.uColor,
      srgbToLinear(config.color[0]),
      srgbToLinear(config.color[1]),
      srgbToLinear(config.color[2]),
    );
    gl!.uniform1f(displayProgram.uniforms.uDistortion, config.distortion);
    gl!.uniform1f(displayProgram.uniforms.uIntensity, config.intensity);
    gl!.uniform1f(displayProgram.uniforms.uBlend, config.blend);
    gl!.uniform1f(displayProgram.uniforms.uRainbow, config.rainbow ? 1 : 0);
    gl!.uniform1f(displayProgram.uniforms.uHasContent, htmlInCanvas ? 1 : 0);
    blit(null);
    output.style.opacity = "1";
  }

  const queued: Array<[number, number, number, number]> = [];

  let raf = 0;
  let lastTime = performance.now();
  let destroyed = false;
  let running = false;
  let visible = true;
  let idleAt = 0;

  function idleDelayMs() {
    const dissipation = Math.min(config.densityDissipation, 0.999);
    const frames = Math.log(1e-7) / Math.log(dissipation);
    return (frames / 60) * 1000;
  }

  function frame(now: number) {
    if (destroyed) return;
    if (!visible) {
      running = false;
      return;
    }
    const delta = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;
    if (queued.length > 0) {
      idleAt = now + idleDelayMs();
      while (queued.length > 0) {
        const [x, y, dx, dy] = queued.pop()!;
        applySplat(x, y, dx, dy);
      }
    }
    step(delta);
    render();
    if (now >= idleAt && !contentDirty) {
      running = false;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (destroyed || running || !visible) return;
    running = true;
    lastTime = performance.now();
    raf = requestAnimationFrame(frame);
  }

  wake = start;
  start();

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionQuery.matches;

  function onMotionChange() {
    reducedMotion = motionQuery.matches;
    if (!reducedMotion) start();
  }
  motionQuery.addEventListener("change", onMotionChange);

  const pointers = new Map<number, { x: number; y: number }>();

  function onPointerMove(event: PointerEvent) {
    if (reducedMotion) return;
    const rect = output.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const previous = pointers.get(event.pointerId);
    pointers.set(event.pointerId, { x: px, y: py });
    if (!previous) return;
    const dx = (px - previous.x) * config.force;
    const dy = -(py - previous.y) * config.force;
    queued.push([px / rect.width, 1 - py / rect.height, dx, dy]);
    start();
  }

  function onPointerLeave(event: PointerEvent) {
    pointers.delete(event.pointerId);
  }

  const listenTarget = interactionTarget ?? output.parentElement ?? output;
  listenTarget.addEventListener("pointermove", onPointerMove as EventListener);
  listenTarget.addEventListener(
    "pointerleave",
    onPointerLeave as EventListener,
  );
  listenTarget.addEventListener(
    "pointercancel",
    onPointerLeave as EventListener,
  );

  const observer = new ResizeObserver(() => {
    syncCanvasSize();
    start();
  });
  observer.observe(output);

  const intersection = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1]?.isIntersecting ?? true;
    if (visible) start();
  });
  intersection.observe(output);

  return {
    splat(x, y, dx, dy) {
      if (reducedMotion) return;
      queued.push([x, y, dx, dy]);
      start();
    },
    setOptions(next) {
      const { simResolution, dyeResolution, ...rest } = next;
      void simResolution;
      void dyeResolution;
      Object.assign(config, rest);
      start();
    },
    resize() {
      syncCanvasSize();
      start();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      intersection.disconnect();
      motionQuery.removeEventListener("change", onMotionChange);
      releaseAll();
      gl.deleteTexture(contentTexture);
      programs.forEach((program) => gl.deleteProgram(program));
      shaders.forEach((shader) => gl.deleteShader(shader));
      gl.deleteBuffer(quad);
      if (htmlInCanvas) paintable.onpaint = null;
      listenTarget.removeEventListener(
        "pointermove",
        onPointerMove as EventListener,
      );
      listenTarget.removeEventListener(
        "pointerleave",
        onPointerLeave as EventListener,
      );
      listenTarget.removeEventListener(
        "pointercancel",
        onPointerLeave as EventListener,
      );
    },
  };
}
