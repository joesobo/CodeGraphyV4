interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  size: number;
}

interface ParticleEffectContext {
  canvas: HTMLCanvasElement;
  intensity: number;
}

export function activateParticleEffect({ canvas, intensity }: ParticleEffectContext): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return () => undefined;
  }

  let active = true;
  let frame: number | null = null;
  const fireflies = createFireflies(54);

  function draw(): void {
    if (!active || !ctx) {
      return;
    }

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';

    for (const fly of fireflies) {
      fly.x = wrap(fly.x + fly.vx, width);
      fly.y = wrap(fly.y + fly.vy, height);
      fly.phase += 0.035 + intensity * 0.02;
      const glow = 0.25 + Math.sin(fly.phase) * 0.2 + intensity * 0.35;
      const radius = fly.size + glow * 5;
      const gradient = ctx.createRadialGradient(fly.x, fly.y, 0, fly.x, fly.y, radius);
      gradient.addColorStop(0, `rgba(132, 255, 170, ${Math.min(0.95, glow)})`);
      gradient.addColorStop(1, 'rgba(130, 255, 164, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(fly.x, fly.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    frame = requestAnimationFrame(draw);
  }

  draw();

  return () => {
    active = false;
    if (frame !== null) {
      cancelAnimationFrame(frame);
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
}

function createFireflies(count: number): Firefly[] {
  return Array.from({ length: count }, (_, index) => ({
    x: 40 + index * 37,
    y: 30 + (index % 11) * 43,
    vx: 0.12 + (index % 5) * 0.035,
    vy: -0.08 + (index % 7) * 0.025,
    phase: index * 0.7,
    size: 2 + (index % 4) * 0.8,
  }));
}

function wrap(value: number, max: number): number {
  if (max <= 0) {
    return 0;
  }
  if (value < -20) {
    return max + 20;
  }
  if (value > max + 20) {
    return -20;
  }
  return value;
}
