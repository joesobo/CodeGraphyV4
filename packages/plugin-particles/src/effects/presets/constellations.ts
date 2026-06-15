import type { EffectController, EffectRuntime } from '../runtime';

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
}

export function createConstellationsEffect(runtime: EffectRuntime): EffectController {
  const starCount = 150;
  const connectDist = 120;
  let stars = makeStars(runtime.width, runtime.height, starCount);
  let time = 0;

  return {
    resize({ width, height }) {
      stars = makeStars(width, height, starCount);
    },
    step({ width, height }, deltaSeconds) {
      time += deltaSeconds;
      const frameScale = deltaSeconds * 60;
      for (const star of stars) {
        updateStar(star, width, height, frameScale);
      }
    },
    draw({ ctx, width, height, color, intensity }) {
      ctx.clearRect(0, 0, width, height);
      drawConnections(ctx, stars, connectDist, color, intensity);
      drawStars(ctx, stars, time, color, intensity);
      ctx.globalAlpha = 1;
    },
  };
}

function updateStar(star: Star, width: number, height: number, frameScale: number): void {
  star.x += star.vx * frameScale;
  star.y += star.vy * frameScale;
  if (star.x < 0) star.x = width;
  if (star.x > width) star.x = 0;
  if (star.y < 0) star.y = height;
  if (star.y > height) star.y = 0;
}

function drawConnections(
  ctx: CanvasRenderingContext2D,
  stars: readonly Star[],
  connectDist: number,
  color: string,
  intensity: number,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  for (let i = 0; i < stars.length; i += 1) {
    for (let j = i + 1; j < stars.length; j += 1) {
      drawConnection(ctx, stars[i], stars[j], connectDist, intensity);
    }
  }
}

function drawConnection(
  ctx: CanvasRenderingContext2D,
  left: Star,
  right: Star,
  connectDist: number,
  intensity: number,
): void {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist >= connectDist) {
    return;
  }
  ctx.globalAlpha = (1 - dist / connectDist) * 0.15 * intensity;
  ctx.beginPath();
  ctx.moveTo(left.x, left.y);
  ctx.lineTo(right.x, right.y);
  ctx.stroke();
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  stars: readonly Star[],
  time: number,
  color: string,
  intensity: number,
): void {
  ctx.fillStyle = color;
  for (const star of stars) {
    const twinkle = 0.5 + 0.5 * Math.sin(time * 2 + star.phase);
    ctx.globalAlpha = (0.15 + twinkle * 0.25) * intensity;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
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
