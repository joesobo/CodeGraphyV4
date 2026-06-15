import { rgba, type EffectController, type EffectRuntime } from '../runtime';

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

export function createEmbersEffect(_runtime: EffectRuntime): EffectController {
  const embers: Ember[] = [];
  return {
    step({ width, height, intensity }, deltaSeconds) {
      const frameScale = deltaSeconds * 60;
      fillEmbers(embers, width, height);
      updateEmbers(embers, width, height, frameScale);
      addEmberBurst(embers, width, height, intensity, frameScale);
    },
    draw({ ctx, width, height, color, intensity, size }) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      for (let index = embers.length - 1; index >= 0; index -= 1) {
        drawEmber(ctx, embers[index], color, intensity, size);
      }
      ctx.globalCompositeOperation = 'source-over';
    },
  };
}

function makeEmber(width: number, height: number): Ember {
  return {
    x: Math.random() * width,
    y: height + Math.random() * 40,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -0.3 - Math.random() * 0.5,
    r: 0.3 + Math.random() * 0.6,
    life: 0,
    maxLife: 220 + Math.random() * 220,
    wobble: Math.random() * Math.PI * 2,
    spark: false,
  };
}

function fillEmbers(embers: Ember[], width: number, height: number): void {
  while (embers.length < 60) {
    embers.push(makeEmber(width, height));
  }
}

function updateEmbers(embers: Ember[], width: number, height: number, frameScale: number): void {
  for (let index = embers.length - 1; index >= 0; index -= 1) {
    updateEmber(embers[index], width, height, frameScale);
  }
}

function updateEmber(ember: Ember, width: number, height: number, frameScale: number): void {
  ember.wobble += 0.03 * frameScale;
  ember.x += (ember.vx + Math.sin(ember.wobble) * 0.5) * frameScale;
  ember.y += ember.vy * frameScale;
  ember.life += frameScale;
  if (ember.life > ember.maxLife || ember.y < -20) {
    Object.assign(ember, makeEmber(width, height));
  }
  if (!ember.spark && Math.random() < 0.003 * frameScale) {
    ember.spark = true;
  }
}

function addEmberBurst(
  embers: Ember[],
  width: number,
  height: number,
  intensity: number,
  frameScale: number,
): void {
  if (Math.random() >= 0.015 * intensity * frameScale) {
    return;
  }

  const burstX = Math.random() * width;
  for (let i = 0; i < 5; i += 1) {
    const ember = makeEmber(width, height);
    ember.x = burstX + (Math.random() - 0.5) * 40;
    ember.y = height - 10;
    ember.vy *= 1.5;
    embers.push(ember);
  }
}

function drawEmber(
  ctx: CanvasRenderingContext2D,
  ember: Ember,
  color: string,
  intensity: number,
  size: number,
): void {
  const lifeRatio = ember.life / ember.maxLife;
  const fade = Math.min(1, Math.min(lifeRatio * 4, (1 - lifeRatio) * 3));
  const radius = ember.r * (ember.spark ? 2.4 : 1) * size;
  const alpha = (ember.spark ? 0.9 : 0.55) * fade * intensity;
  drawEmberGlow(ctx, ember, color, radius, alpha);
  drawEmberCore(ctx, ember, radius, alpha);
  ember.spark = false;
}

function drawEmberGlow(
  ctx: CanvasRenderingContext2D,
  ember: Ember,
  color: string,
  radius: number,
  alpha: number,
): void {
  const gradient = ctx.createRadialGradient(ember.x, ember.y, 0, ember.x, ember.y, radius * 4);
  gradient.addColorStop(0, rgba(color, alpha));
  gradient.addColorStop(0.4, rgba(color, alpha * 0.3));
  gradient.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(ember.x - radius * 4, ember.y - radius * 4, radius * 8, radius * 8);
}

function drawEmberCore(
  ctx: CanvasRenderingContext2D,
  ember: Ember,
  radius: number,
  alpha: number,
): void {
  ctx.fillStyle = rgba('#ffffff', alpha * 0.6);
  ctx.beginPath();
  ctx.arc(ember.x, ember.y, radius * 0.5, 0, Math.PI * 2);
  ctx.fill();
}
