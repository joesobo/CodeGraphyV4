import type { EffectController, EffectRuntime } from '../runtime';

interface Sparkle {
  x: number;
  y: number;
  size: number;
  phase: number;
  speed: number;
  life: number;
}

export function createSparklesEffect(runtime: EffectRuntime): EffectController {
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
    for (let i = 0; i < 50; i += 1) {
      sparkles.push(makeSpark(nextRuntime));
    }
  };
  seedSparkles(runtime);

  return {
    resize: seedSparkles,
    step(nextRuntime, deltaSeconds) {
      const frameScale = deltaSeconds * 60;
      for (const sparkle of sparkles) {
        sparkle.phase += sparkle.speed * frameScale;
        if (sparkle.phase > Math.PI * 6) {
          Object.assign(sparkle, makeSpark(nextRuntime));
        }
      }
    },
    draw(nextRuntime) {
      const { ctx, width, height, color, intensity, size } = nextRuntime;
      ctx.clearRect(0, 0, width, height);
      for (const sparkle of sparkles) {
        const twinkle = Math.sin(sparkle.phase);
        const alpha = Math.max(0, twinkle) * 0.25 * sparkle.life * intensity;
        const scale = 0.5 + Math.max(0, twinkle) * 0.5;
        if (alpha > 0.01) {
          drawSparkle(ctx, sparkle.x, sparkle.y, sparkle.size * scale * size, color, alpha);
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
