import type { EffectController, EffectRuntime } from '../runtime';

interface RainDrop {
  x: number;
  y: number;
  len: number;
  speed: number;
  alpha: number;
}

export function createRainEffect(_runtime: EffectRuntime): EffectController {
  const drops: RainDrop[] = [];
  const maxDrops = 130;

  const makeDrop = (width: number): RainDrop => {
    const len = 20 + Math.random() * 40;
    return {
      x: Math.random() * width,
      y: -len,
      len,
      speed: 4 + Math.random() * 8,
      alpha: 0.26 + Math.random() * 0.24,
    };
  };

  return {
    step({ width, height, intensity, size }, deltaSeconds) {
      const frameScale = deltaSeconds * 60;
      const speedMult = 0.35 + intensity * 0.65;
      const targetDrops = Math.round(maxDrops * Math.max(0.35, intensity));
      while (drops.length < targetDrops) {
        drops.push(makeDrop(width));
      }

      for (let index = drops.length - 1; index >= 0; index -= 1) {
        const drop = drops[index];
        drop.y += drop.speed * speedMult * frameScale;
        if (drop.y > height + drop.len * size) {
          Object.assign(drop, makeDrop(width));
        }
      }
    },
    draw({ ctx, width, height, color, size }) {
      ctx.clearRect(0, 0, width, height);

      for (const drop of drops) {
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
