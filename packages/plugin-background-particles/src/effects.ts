export const BACKGROUND_PARTICLE_PRESETS = [
  'synapse',
  'rain',
  'constellations',
  'perlin-flow',
  'petals',
  'sparkles',
  'embers',
] as const;

export type OdysseusBackgroundEffectPreset = typeof BACKGROUND_PARTICLE_PRESETS[number];

export interface CustomParticleEffectContext {
  canvas: HTMLCanvasElement;
  intensity: number;
  color: string;
  backgroundColor: string;
}

export interface CustomParticleEffectModule {
  activateParticleEffect?: (context: CustomParticleEffectContext) => void | (() => void) | Promise<void | (() => void)>;
  default?: {
    activateParticleEffect?: (context: CustomParticleEffectContext) => void | (() => void) | Promise<void | (() => void)>;
  } | ((context: CustomParticleEffectContext) => void | (() => void) | Promise<void | (() => void)>);
}

interface OdysseusBackgroundEffectOptions {
  canvas: HTMLCanvasElement;
  preset: OdysseusBackgroundEffectPreset;
  intensity: number;
  color?: string;
  backgroundColor?: string;
  prewarmFrames?: number;
  reduceMotion?: boolean;
}

interface CustomParticleEffectOptions extends CustomParticleEffectContext {
  moduleUrl: string;
}

interface EffectRuntime {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  dpr: number;
  intensity: number;
  size: number;
  color: string;
  backgroundColor: string;
}

type DrawEffect = (runtime: EffectRuntime) => void;
type ResizeEffect = (runtime: EffectRuntime) => void;

interface EffectController {
  draw: DrawEffect;
  resize?: ResizeEffect;
}

interface Pulse {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

interface RainDrop {
  x: number;
  y: number;
  len: number;
  speed: number;
  alpha: number;
}

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
}

interface FlowParticle {
  x: number;
  y: number;
  life: number;
}

interface Petal {
  x: number;
  y: number;
  size: number;
  rot: number;
  vr: number;
  vy: number;
  drift: number;
  driftSpeed: number;
  wobble: number;
}

interface Sparkle {
  x: number;
  y: number;
  size: number;
  phase: number;
  speed: number;
  life: number;
}

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  maxLife: number;
  wobble: number;
  spark: boolean;
}

// Canvas effects adapted from Odysseus static/js/theme.js.
// Source: https://github.com/pewdiepie-archdaemon/odysseus (AGPL-3.0)
export function startOdysseusBackgroundEffect({
  canvas,
  preset,
  intensity,
  color = '#9cdef2',
  backgroundColor = '#0b1020',
  prewarmFrames = 120,
  reduceMotion = false,
}: OdysseusBackgroundEffectOptions): () => void {
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext('2d');
  } catch {
    ctx = null;
  }
  if (!ctx) {
    return () => undefined;
  }

  let active = true;
  let animationFrame: number | null = null;
  const runtime: EffectRuntime = {
    ctx,
    canvas,
    width: 0,
    height: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    intensity: Math.max(0, Math.min(1, intensity)),
    size: 1,
    color,
    backgroundColor,
  };
  const effect = createEffectController(preset, runtime);

  const resize = (): void => {
    const rect = canvas.getBoundingClientRect();
    runtime.width = Math.max(1, rect.width || canvas.clientWidth || canvas.parentElement?.clientWidth || 1);
    runtime.height = Math.max(1, rect.height || canvas.clientHeight || canvas.parentElement?.clientHeight || 1);
    canvas.width = Math.round(runtime.width * runtime.dpr);
    canvas.height = Math.round(runtime.height * runtime.dpr);
    ctx.setTransform(runtime.dpr, 0, 0, runtime.dpr, 0, 0);
    effect.resize?.(runtime);
  };

  const tick = (): void => {
    if (!active) {
      return;
    }
    effect.draw(runtime);
    if (!reduceMotion) {
      animationFrame = requestAnimationFrame(tick);
    }
  };

  resize();
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
  observer?.observe(canvas);
  window.addEventListener('resize', resize);
  for (let frame = 0; frame < prewarmFrames; frame += 1) {
    effect.draw(runtime);
  }
  tick();

  return () => {
    active = false;
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
    }
    window.removeEventListener('resize', resize);
    observer?.disconnect();
    ctx.clearRect(0, 0, runtime.width, runtime.height);
  };
}

export function startCustomParticleEffect({
  canvas,
  intensity,
  color,
  backgroundColor,
  moduleUrl,
}: CustomParticleEffectOptions): () => void {
  let cleanup: void | (() => void);
  let active = true;

  void import(/* @vite-ignore */ moduleUrl)
    .then((mod: CustomParticleEffectModule) => {
      if (!active) {
        return undefined;
      }
      const activate = resolveCustomParticleEffectActivator(mod);
      if (!activate) {
        console.warn(`[CodeGraphy] Custom particle effect module "${moduleUrl}" has no activateParticleEffect export`);
        return undefined;
      }
      return activate({ canvas, intensity, color, backgroundColor });
    })
    .then((nextCleanup) => {
      if (typeof nextCleanup !== 'function') {
        return;
      }
      if (!active) {
        nextCleanup();
        return;
      }
      cleanup = nextCleanup;
    })
    .catch((error: unknown) => {
      console.error(`[CodeGraphy] Failed to load custom particle effect module "${moduleUrl}":`, error);
    });

  return () => {
    active = false;
    cleanup?.();
  };
}

function resolveCustomParticleEffectActivator(
  mod: CustomParticleEffectModule,
): CustomParticleEffectModule['activateParticleEffect'] {
  if (typeof mod.activateParticleEffect === 'function') {
    return mod.activateParticleEffect;
  }
  if (typeof mod.default === 'function') {
    return mod.default;
  }
  return mod.default?.activateParticleEffect;
}

function createEffectController(
  preset: OdysseusBackgroundEffectPreset,
  runtime: EffectRuntime,
): EffectController {
  switch (preset) {
    case 'synapse':
      return createSynapseEffect(runtime);
    case 'rain':
      return createRainEffect();
    case 'constellations':
      return createConstellationsEffect(runtime);
    case 'perlin-flow':
      return createPerlinFlowEffect(runtime);
    case 'petals':
      return createPetalsEffect(runtime);
    case 'sparkles':
      return createSparklesEffect(runtime);
    case 'embers':
      return createEmbersEffect(runtime);
  }
}

function createSynapseEffect(runtime: EffectRuntime): EffectController {
  const grid = 24;
  const maxPulses = 20;
  const speedMin = 2;
  const speedMax = 22;
  const trailLen = 12;
  let cols = Math.ceil(runtime.width / grid);
  let rows = Math.ceil(runtime.height / grid);
  const pulses: Pulse[] = [];

  const spawnPulse = (): void => {
    const speed = speedMin + Math.random() * (speedMax - speedMin);
    if (Math.random() > 0.5) {
      const row = Math.floor(Math.random() * (rows + 1));
      pulses.push({ x: -trailLen, y: row * grid, dx: speed, dy: 0 });
    } else {
      const col = Math.floor(Math.random() * (cols + 1));
      pulses.push({ x: col * grid, y: -trailLen, dx: 0, dy: speed });
    }
  };

  return {
    resize(nextRuntime) {
      cols = Math.ceil(nextRuntime.width / grid);
      rows = Math.ceil(nextRuntime.height / grid);
    },
    draw({ ctx, width, height, color, intensity }) {
      ctx.clearRect(0, 0, width, height);
      drawSynapseGrid(ctx, width, height, color, intensity);
      if (pulses.length < maxPulses && Math.random() < 0.12 * intensity) {
        spawnPulse();
      }

      for (let index = pulses.length - 1; index >= 0; index -= 1) {
        const pulse = pulses[index];
        pulse.x += pulse.dx;
        pulse.y += pulse.dy;

        if (pulse.x > width + trailLen || pulse.y > height + trailLen) {
          pulses.splice(index, 1);
          continue;
        }

        const tx = pulse.x - (pulse.dx > 0 ? trailLen : 0);
        const ty = pulse.y - (pulse.dy > 0 ? trailLen : 0);
        const gradient = ctx.createLinearGradient(tx, ty, pulse.x, pulse.y);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, color);
        ctx.strokeStyle = gradient;
        ctx.globalAlpha = 0.35 * intensity;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(pulse.x, pulse.y);
        ctx.stroke();

        ctx.globalAlpha = 0.55 * intensity;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
}

function drawSynapseGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
  intensity: number,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.035 * intensity;
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function createRainEffect(): EffectController {
  const drops: RainDrop[] = [];
  const maxDrops = 130;

  return {
    draw({ ctx, width, height, color, intensity, size }) {
      ctx.clearRect(0, 0, width, height);
      const speedMult = 0.35 + intensity * 0.65;
      if (drops.length < maxDrops * intensity && Math.random() < 0.6 * intensity) {
        const len = 20 + Math.random() * 40;
        const speed = 4 + Math.random() * 8;
        drops.push({
          x: Math.random() * width,
          y: -len,
          len,
          speed,
          alpha: 0.32 + Math.random() * 0.28,
        });
      }

      for (let index = drops.length - 1; index >= 0; index -= 1) {
        const drop = drops[index];
        drop.y += drop.speed * speedMult;
        if (drop.y > height + drop.len * size) {
          drops.splice(index, 1);
          continue;
        }

        const effLen = drop.len * size;
        const gradient = ctx.createLinearGradient(drop.x, drop.y - effLen, drop.x, drop.y);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, color);
        ctx.strokeStyle = gradient;
        ctx.globalAlpha = drop.alpha;
        ctx.lineWidth = 1.3 * Math.min(2, Math.max(0.6, size));
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y - effLen);
        ctx.lineTo(drop.x, drop.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
  };
}

function createConstellationsEffect(runtime: EffectRuntime): EffectController {
  const starCount = 50;
  const connectDist = 120;
  let stars = makeStars(runtime.width, runtime.height, starCount);
  let time = 0;

  return {
    resize({ width, height }) {
      stars = makeStars(width, height, starCount);
    },
    draw({ ctx, width, height, color, intensity }) {
      time += 0.01;
      ctx.clearRect(0, 0, width, height);

      for (const star of stars) {
        star.x += star.vx;
        star.y += star.vy;
        if (star.x < 0) star.x = width;
        if (star.x > width) star.x = 0;
        if (star.y < 0) star.y = height;
        if (star.y > height) star.y = 0;
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 0.5;
      for (let i = 0; i < stars.length; i += 1) {
        for (let j = i + 1; j < stars.length; j += 1) {
          const dx = stars[i].x - stars[j].x;
          const dy = stars[i].y - stars[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < connectDist) {
            ctx.globalAlpha = (1 - dist / connectDist) * 0.15 * intensity;
            ctx.beginPath();
            ctx.moveTo(stars[i].x, stars[i].y);
            ctx.lineTo(stars[j].x, stars[j].y);
            ctx.stroke();
          }
        }
      }

      ctx.fillStyle = color;
      for (const star of stars) {
        const twinkle = 0.5 + 0.5 * Math.sin(time * 2 + star.phase);
        ctx.globalAlpha = (0.15 + twinkle * 0.25) * intensity;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
}

function makeStars(width: number, height: number, count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.15,
    vy: (Math.random() - 0.5) * 0.15,
    r: 0.8 + Math.random() * 0.8,
    phase: Math.random() * Math.PI * 2,
  }));
}

function createPerlinFlowEffect(runtime: EffectRuntime): EffectController {
  let time = 0;
  const particles: FlowParticle[] = [];
  const seedParticles = ({ width, height }: EffectRuntime): void => {
    if (particles.length > 0) {
      return;
    }
    for (let i = 0; i < 200; i += 1) {
      particles.push({ x: Math.random() * width, y: Math.random() * height, life: Math.random() });
    }
  };
  seedParticles(runtime);

  return {
    resize: seedParticles,
    draw({ ctx, width, height, color, backgroundColor, intensity }) {
      ctx.fillStyle = rgba(backgroundColor, 0.02);
      ctx.fillRect(0, 0, width, height);
      for (const particle of particles) {
        const noise = bgSmoothNoise(particle.x * 0.004 + time * 0.0008, particle.y * 0.004 + 100);
        const angle = noise * Math.PI * 6;
        const speed = 1 + bgSmoothNoise(particle.x * 0.003, particle.y * 0.003 + 50) * 1.5;
        particle.x += Math.cos(angle) * speed;
        particle.y += Math.sin(angle) * speed;
        particle.life -= 0.001;
        if (particle.life <= 0 || particle.x < 0 || particle.x > width || particle.y < 0 || particle.y > height) {
          particle.x = Math.random() * width;
          particle.y = Math.random() * height;
          particle.life = 1;
        }
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 1, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = particle.life * 0.15 * intensity;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      time += 1;
    },
  };
}

function createPetalsEffect(runtime: EffectRuntime): EffectController {
  const petals: Petal[] = [];
  const makePetal = (width: number): Petal => ({
    x: -20 + Math.random() * Math.min(width * 0.25, 160),
    y: -10 - Math.random() * 40,
    size: 3 + Math.random() * 5,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.03,
    vy: 0.3 + Math.random() * 0.6,
    drift: Math.random() * Math.PI * 2,
    driftSpeed: 0.008 + Math.random() * 0.012,
    wobble: 0.3 + Math.random() * 0.8,
  });
  const seedPetals = ({ width, height }: EffectRuntime): void => {
    if (petals.length > 0) {
      return;
    }
    for (let i = 0; i < 30; i += 1) {
      const petal = makePetal(width);
      petal.y = Math.random() * height;
      petals.push(petal);
    }
  };
  seedPetals(runtime);

  return {
    resize: seedPetals,
    draw({ ctx, width, height, color, intensity, size }) {
      ctx.clearRect(0, 0, width, height);
      for (const petal of petals) {
        petal.y += petal.vy;
        petal.rot += petal.vr;
        petal.drift += petal.driftSpeed;
        petal.x += Math.sin(petal.drift) * petal.wobble;
        if (petal.y > height + 15) {
          Object.assign(petal, makePetal(width));
        }
        ctx.save();
        ctx.translate(petal.x, petal.y);
        ctx.rotate(petal.rot);
        ctx.globalAlpha = 0.2 * intensity;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(-petal.size * 0.2 * size, 0, petal.size * 0.6 * size, petal.size * 0.3 * size, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.15 * intensity;
        ctx.beginPath();
        ctx.ellipse(petal.size * 0.2 * size, 0, petal.size * 0.6 * size, petal.size * 0.3 * size, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
  };
}

function createSparklesEffect(runtime: EffectRuntime): EffectController {
  const sparkles: Sparkle[] = [];
  const makeSpark = ({ width, height }: EffectRuntime): Sparkle => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: 2 + Math.random() * 5,
    phase: Math.random() * Math.PI * 2,
    speed: 0.015 + Math.random() * 0.03,
    life: 0.5 + Math.random() * 0.5,
  });
  const seedSparkles = (nextRuntime: EffectRuntime): void => {
    if (sparkles.length > 0) {
      return;
    }
    for (let i = 0; i < 35; i += 1) {
      sparkles.push(makeSpark(nextRuntime));
    }
  };
  seedSparkles(runtime);

  return {
    resize: seedSparkles,
    draw(nextRuntime) {
      const { ctx, width, height, color, intensity, size } = nextRuntime;
      ctx.clearRect(0, 0, width, height);
      for (const sparkle of sparkles) {
        sparkle.phase += sparkle.speed;
        const twinkle = Math.sin(sparkle.phase);
        const alpha = Math.max(0, twinkle) * 0.25 * sparkle.life * intensity;
        const scale = 0.5 + Math.max(0, twinkle) * 0.5;
        if (alpha > 0.01) {
          drawSparkle(ctx, sparkle.x, sparkle.y, sparkle.size * scale * size, color, alpha);
        }
        if (sparkle.phase > Math.PI * 6) {
          Object.assign(sparkle, makeSpark(nextRuntime));
        }
      }
      ctx.globalAlpha = 1;
    },
  };
}

function drawSparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(0, -radius);
  ctx.quadraticCurveTo(radius * 0.15, -radius * 0.15, radius, 0);
  ctx.quadraticCurveTo(radius * 0.15, radius * 0.15, 0, radius);
  ctx.quadraticCurveTo(-radius * 0.15, radius * 0.15, -radius, 0);
  ctx.quadraticCurveTo(-radius * 0.15, -radius * 0.15, 0, -radius);
  ctx.fill();
  ctx.restore();
}

function createEmbersEffect(runtime: EffectRuntime): EffectController {
  const embers: Ember[] = [];
  const makeEmber = (width: number, height: number): Ember => ({
    x: Math.random() * width,
    y: height + Math.random() * 40,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -0.3 - Math.random() * 0.8,
    r: 0.3 + Math.random() * 0.6,
    life: 0,
    maxLife: 220 + Math.random() * 220,
    wobble: Math.random() * Math.PI * 2,
    spark: false,
  });
  const seedEmbers = ({ width, height }: EffectRuntime): void => {
    if (embers.length > 0) {
      return;
    }
    for (let i = 0; i < 60; i += 1) {
      const ember = makeEmber(width, height);
      ember.y = Math.random() * height;
      ember.life = Math.random() * ember.maxLife;
      embers.push(ember);
    }
  };
  seedEmbers(runtime);

  return {
    resize: seedEmbers,
    draw({ ctx, width, height, color, intensity, size }) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      for (let index = embers.length - 1; index >= 0; index -= 1) {
        const ember = embers[index];
        ember.wobble += 0.03;
        ember.x += ember.vx + Math.sin(ember.wobble) * 0.5;
        ember.y += ember.vy;
        ember.life += 1;
        if (ember.life > ember.maxLife || ember.y < -20) {
          embers.splice(index, 1);
          if (embers.length < 70) {
            embers.push(makeEmber(width, height));
          }
          continue;
        }
        if (!ember.spark && Math.random() < 0.003) {
          ember.spark = true;
        }
        const lifeRatio = ember.life / ember.maxLife;
        const fade = Math.min(1, Math.min(lifeRatio * 4, (1 - lifeRatio) * 3));
        const radius = ember.r * (ember.spark ? 2.4 : 1) * size;
        const alpha = (ember.spark ? 0.9 : 0.55) * fade * intensity;
        const gradient = ctx.createRadialGradient(ember.x, ember.y, 0, ember.x, ember.y, radius * 4);
        gradient.addColorStop(0, rgba(color, alpha));
        gradient.addColorStop(0.4, rgba(color, alpha * 0.3));
        gradient.addColorStop(1, rgba(color, 0));
        ctx.fillStyle = gradient;
        ctx.fillRect(ember.x - radius * 4, ember.y - radius * 4, radius * 8, radius * 8);
        ctx.fillStyle = rgba('#ffffff', alpha * 0.6);
        ctx.beginPath();
        ctx.arc(ember.x, ember.y, radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ember.spark = false;
      }

      if (Math.random() < 0.015 * intensity) {
        const bx = Math.random() * width;
        for (let i = 0; i < 5; i += 1) {
          const ember = makeEmber(width, height);
          ember.x = bx + (Math.random() - 0.5) * 40;
          ember.y = height - 10;
          ember.vy *= 1.5;
          embers.push(ember);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    },
  };
}

function bgNoise2d(x: number, y: number): number {
  const noise = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return noise - Math.floor(noise);
}

function bgSmoothNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const topLeft = bgNoise2d(ix, iy);
  const topRight = bgNoise2d(ix + 1, iy);
  const bottomLeft = bgNoise2d(ix, iy + 1);
  const bottomRight = bgNoise2d(ix + 1, iy + 1);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return topLeft
    + (topRight - topLeft) * ux
    + (bottomLeft - topLeft) * uy
    + (topLeft - topRight - bottomLeft + bottomRight) * ux * uy;
}

function rgba(color: string, alpha: number): string {
  const rgb = hexToRgb(color) ?? { r: 156, g: 222, b: 242 };
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let normalized = String(hex || '').trim().replace(/^#/, '');
  if (normalized.length === 3) {
    normalized = normalized.split('').map((channel) => channel + channel).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }
  const value = parseInt(normalized, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}
