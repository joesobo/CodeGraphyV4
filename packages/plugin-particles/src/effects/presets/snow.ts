import { rgba, type EffectController, type EffectRuntime } from '../runtime';

interface Snowflake {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  depth: number;
  drift: number;
  driftSpeed: number;
  swing: number;
  spin: number;
  spinSpeed: number;
  crystalline: boolean;
}

export function createSnowEffect(_runtime: EffectRuntime): EffectController {
  const flakes: Snowflake[] = [];
  const flakeCount = 150;

  return {
    step({ width, height, intensity }, deltaSeconds) {
      const frameScale = deltaSeconds * 60;
      while (flakes.length < flakeCount) {
        flakes.push(makeFlake(width, flakeCount, flakes.length));
      }
      const wind = Math.sin(Date.now() * 0.00012) * 0.1 * (0.6 + intensity);

      for (const flake of flakes) {
        updateFlake(flake, width, height, flakeCount, intensity, wind, frameScale);
      }
    },
    draw({ ctx, width, height, color, intensity, size }) {
      ctx.clearRect(0, 0, width, height);

      for (const flake of flakes) {
        drawSnowflake(ctx, flake, color, intensity, size);
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },
  };
}

function makeFlake(
  width: number,
  flakeCount: number,
  index = Math.random() * flakeCount,
): Snowflake {
  const depth = Math.random();
  const x = ((index + Math.random()) / flakeCount) * width;
  const y = -18 - Math.random() * 80;
  return {
    x,
    y,
    previousX: x,
    previousY: y,
    vx: -0.08 + Math.random() * 0.16,
    vy: 0.12 + depth * 0.1 + Math.random() * 0.12,
    radius: 0.35 + depth * 1.85 + Math.random() * 0.5,
    alpha: 0.06 + depth * 0.2 + Math.random() * 0.08,
    depth,
    drift: Math.random() * Math.PI * 2,
    driftSpeed: 0.006 + Math.random() * 0.018,
    swing: 0.08 + Math.random() * 0.44,
    spin: Math.random() * Math.PI * 2,
    spinSpeed: -0.012 + Math.random() * 0.024,
    crystalline: depth > 0.72 && Math.random() > 0.68,
  };
}

function updateFlake(
  flake: Snowflake,
  width: number,
  height: number,
  flakeCount: number,
  intensity: number,
  wind: number,
  frameScale: number,
): void {
  flake.previousX = flake.x;
  flake.previousY = flake.y;
  flake.drift += flake.driftSpeed * (0.8 + intensity) * frameScale;
  flake.spin += flake.spinSpeed * frameScale;
  flake.x += (flake.vx + wind * flake.depth + Math.sin(flake.drift) * flake.swing) * frameScale;
  flake.y += flake.vy * (0.28 + intensity * 0.54) * frameScale;
  resetVerticalBounds(flake, width, height, flakeCount);
  wrapHorizontalBounds(flake, width);
}

function resetVerticalBounds(
  flake: Snowflake,
  width: number,
  height: number,
  flakeCount: number,
): void {
  if (flake.y <= height + 18) {
    return;
  }
  Object.assign(flake, makeFlake(width, flakeCount));
  flake.x = Math.random() * width;
}

function wrapHorizontalBounds(flake: Snowflake, width: number): void {
  if (flake.x < -18) {
    flake.x = width + 18;
    flake.previousX = flake.x;
    return;
  }
  if (flake.x > width + 18) {
    flake.x = -18;
    flake.previousX = flake.x;
  }
}

function drawSnowflake(
  ctx: CanvasRenderingContext2D,
  flake: Snowflake,
  color: string,
  intensity: number,
  size: number,
): void {
  const radius = flake.radius * size;
  const alpha = flake.alpha * Math.max(0.22, intensity);
  const trailAlpha = alpha * 0.08 * flake.depth;

  if (trailAlpha > 0.02) {
    const trail = ctx.createLinearGradient(flake.previousX, flake.previousY, flake.x, flake.y);
    trail.addColorStop(0, rgba(color, 0));
    trail.addColorStop(1, rgba(color, trailAlpha));
    ctx.strokeStyle = trail;
    ctx.lineWidth = Math.max(0.4, radius * 0.45);
    ctx.beginPath();
    ctx.moveTo(flake.previousX, flake.previousY);
    ctx.lineTo(flake.x, flake.y);
    ctx.stroke();
  }

  const glow = ctx.createRadialGradient(flake.x, flake.y, 0, flake.x, flake.y, radius * 3);
  glow.addColorStop(0, rgba('#ffffff', alpha * 0.34));
  glow.addColorStop(0.45, rgba(color, alpha * 0.1));
  glow.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(flake.x, flake.y, radius * 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(flake.x, flake.y);
  ctx.rotate(flake.spin);
  ctx.strokeStyle = rgba('#ffffff', alpha * 0.48);
  ctx.fillStyle = rgba(color, alpha);
  ctx.lineWidth = Math.max(0.35, radius * 0.16);

  if (flake.crystalline) {
    for (let spoke = 0; spoke < 6; spoke += 1) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -radius * 1.55);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
