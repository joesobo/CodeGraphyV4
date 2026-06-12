import type { EffectController, EffectRuntime } from './shared';

interface RainDrop {
  x: number;
  y: number;
  len: number;
  speed: number;
  alpha: number;
}

export function createRainEffect(runtime: EffectRuntime): EffectController {
  const drops: RainDrop[] = [];
  const maxDrops = 130;

  const makeDrop = (width: number, height: number, prewarmed = false): RainDrop => {
    const len = 20 + Math.random() * 40;
    return {
      x: Math.random() * width,
      y: prewarmed ? Math.random() * height : -len,
      len,
      speed: 4 + Math.random() * 8,
      alpha: 0.26 + Math.random() * 0.24,
    };
  };

  const seedDrops = ({ width, height, intensity }: EffectRuntime): void => {
    if (drops.length > 0) {
      return;
    }

    const seededDrops = Math.round(maxDrops * Math.max(0.35, intensity));
    for (let index = 0; index < seededDrops; index += 1) {
      drops.push(makeDrop(width, height, true));
    }
  };

  seedDrops(runtime);

  return {
    resize: seedDrops,
    draw({ ctx, width, height, color, intensity, size }) {
      ctx.clearRect(0, 0, width, height);
      const speedMult = 0.35 + intensity * 0.65;
      if (drops.length < maxDrops * intensity && Math.random() < 0.6 * intensity) {
        drops.push(makeDrop(width, height));
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
