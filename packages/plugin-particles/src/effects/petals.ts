import type { EffectController, EffectRuntime } from './shared';

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

export function createPetalsEffect(runtime: EffectRuntime): EffectController {
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
