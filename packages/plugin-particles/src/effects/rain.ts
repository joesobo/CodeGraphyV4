import type { EffectController } from './shared';

interface RainDrop {
  x: number;
  y: number;
  len: number;
  speed: number;
  alpha: number;
}

export function createRainEffect(): EffectController {
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
