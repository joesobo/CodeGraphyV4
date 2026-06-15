import type { EffectController, EffectRuntime } from '../runtime';

interface Leaf {
  x: number;
  y: number;
  size: number;
  rot: number;
  vr: number;
  vx: number;
  vy: number;
  drift: number;
  driftSpeed: number;
  wobble: number;
}

export function createLeavesEffect(_runtime: EffectRuntime): EffectController {
  const leaves: Leaf[] = [];
  const leafCount = 90;
  let spawnIndex = 0;
  const makeLeaf = (width: number): Leaf => {
    const offset = (spawnIndex % leafCount) * (width / leafCount);
    spawnIndex += 1;
    return {
      x: -30 - Math.random() * Math.min(width * 0.2, 140) - offset,
      y: -10 - Math.random() * 40,
      size: 3 + Math.random() * 5,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.03,
      vx: 0.28 + Math.random() * 0.58,
      vy: 0.08 + Math.random() * 0.13,
      drift: Math.random() * Math.PI * 2,
      driftSpeed: 0.008 + Math.random() * 0.012,
      wobble: 0.3 + Math.random() * 0.8,
    };
  };

  const stepLeaves = ({ width, height }: EffectRuntime, deltaSeconds: number): void => {
    const frameScale = deltaSeconds * 60;
    while (leaves.length < leafCount) {
      leaves.push(makeLeaf(width));
    }

    for (const leaf of leaves) {
      leaf.y += leaf.vy * frameScale;
      leaf.rot += leaf.vr * frameScale;
      leaf.drift += leaf.driftSpeed * frameScale;
      leaf.x += (leaf.vx + Math.sin(leaf.drift) * leaf.wobble) * frameScale;
      if (leaf.y > height + 15 || leaf.x > width + 30) {
        Object.assign(leaf, makeLeaf(width));
      }
    }
  };

  return {
    step: stepLeaves,
    draw({ ctx, width, height, color, intensity, size }) {
      ctx.clearRect(0, 0, width, height);
      for (const leaf of leaves) {
        ctx.save();
        ctx.translate(leaf.x, leaf.y);
        ctx.rotate(leaf.rot);
        ctx.globalAlpha = 0.2 * intensity;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(-leaf.size * 0.2 * size, 0, leaf.size * 0.6 * size, leaf.size * 0.3 * size, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.15 * intensity;
        ctx.beginPath();
        ctx.ellipse(leaf.size * 0.2 * size, 0, leaf.size * 0.6 * size, leaf.size * 0.3 * size, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
  };
}
