import { rgba, type EffectController, type EffectRuntime } from './shared';

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

export function createEmbersEffect(runtime: EffectRuntime): EffectController {
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
