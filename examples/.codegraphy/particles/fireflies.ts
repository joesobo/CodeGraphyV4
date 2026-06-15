interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  pulseSpeed: number;
  drift: number;
  alpha: number;
}

interface ParticleEffectContext {
  canvas: HTMLCanvasElement;
  intensity: number;
}

const FIREFLY_COUNT = 100;

export function activateParticleEffect({ canvas, intensity }: ParticleEffectContext): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return () => undefined;
  }

  let active = true;
  let frame: number | null = null;
  const fireflies = Array.from({ length: FIREFLY_COUNT }, () => createFirefly(canvas.width, canvas.height));

  function tick(): void {
    if (!active) {
      return;
    }

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';

    for (const fly of fireflies) {
      stepFirefly(fly, width, height, intensity);
      drawFirefly(ctx, fly, intensity);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    frame = requestAnimationFrame(tick);
  }

  tick();

  return () => {
    active = false;
    if (frame !== null) {
      cancelAnimationFrame(frame);
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
}

function createFirefly(width: number, height: number): Firefly {
  const radius = 0.9 + Math.random() * 1.8;
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.22,
    vy: (Math.random() - 0.5) * 0.18,
    radius,
    phase: Math.random() * Math.PI * 2,
    pulseSpeed: 0.012 + Math.random() * 0.024,
    drift: Math.random() * Math.PI * 2,
    alpha: 0.25 + Math.random() * 0.5,
  };
}

function stepFirefly(fly: Firefly, width: number, height: number, intensity: number): void {
  fly.phase += fly.pulseSpeed * (0.8 + intensity * 0.4);
  fly.drift += 0.006;
  fly.x += fly.vx + Math.cos(fly.drift) * 0.04;
  fly.y += fly.vy + Math.sin(fly.drift * 0.8) * 0.035;

  if (fly.x < -24 || fly.x > width + 24 || fly.y < -24 || fly.y > height + 24) {
    Object.assign(fly, createFirefly(width, height));
  }
}

function drawFirefly(ctx: CanvasRenderingContext2D, fly: Firefly, intensity: number): void {
  const pulse = Math.max(0, Math.sin(fly.phase)) ** 2;
  const alpha = fly.alpha * (0.5 + pulse * 0.65) * (0.45 + intensity * 0.45);
  const glowRadius = fly.radius * (5 + pulse * 2);

  const glow = ctx.createRadialGradient(fly.x, fly.y, 0, fly.x, fly.y, glowRadius);
  glow.addColorStop(0, `rgba(255, 218, 142, ${alpha * 0.58})`);
  glow.addColorStop(0.32, `rgba(255, 154, 76, ${alpha * 0.24})`);
  glow.addColorStop(1, 'rgba(255, 112, 46, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(fly.x, fly.y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255, 230, 170, ${alpha * 0.72})`;
  ctx.beginPath();
  ctx.arc(fly.x, fly.y, fly.radius * (0.7 + pulse * 0.25), 0, Math.PI * 2);
  ctx.fill();
}
