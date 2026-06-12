interface Firefly {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  vx: number;
  vy: number;
  phase: number;
  size: number;
  depth: number;
  life: number;
  maxLife: number;
  pulseSpeed: number;
  wander: number;
  hueShift: number;
  flash: number;
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
  let time = 0;
  const fireflies = createFireflies(canvas.width, canvas.height, 118);

  function draw(): void {
    if (!active || !ctx) {
      return;
    }

    const width = canvas.width;
    const height = canvas.height;
    time += 0.016;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';

    for (let index = fireflies.length - 1; index >= 0; index -= 1) {
      const fly = fireflies[index];
      fly.previousX = fly.x;
      fly.previousY = fly.y;
      fly.phase += fly.pulseSpeed * (0.8 + intensity * 0.9);
      fly.wander += 0.012 + fly.depth * 0.01;
      fly.life += 1;

      const field = Math.sin((fly.x + time * 70) * 0.004 + fly.wander)
        + Math.cos((fly.y - time * 40) * 0.005 + fly.phase * 0.45);
      fly.vx += Math.cos(fly.wander + field) * 0.012 * fly.depth;
      fly.vy += Math.sin(fly.wander * 0.8 - field) * 0.01 * fly.depth;
      fly.vx *= 0.986;
      fly.vy *= 0.986;
      fly.x += fly.vx * (0.8 + fly.depth * 0.7);
      fly.y += fly.vy * (0.8 + fly.depth * 0.7);

      if (Math.random() < 0.0025 * intensity) {
        fly.flash = 1;
      }
      fly.flash *= 0.9;

      if (fly.life > fly.maxLife || fly.x < -70 || fly.x > width + 70 || fly.y < -70 || fly.y > height + 70) {
        Object.assign(fly, createFirefly(width, height, true));
        continue;
      }

      drawFirefly(ctx, fly, intensity);
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

function createFireflies(width: number, height: number, count: number): Firefly[] {
  return Array.from({ length: count }, () => createFirefly(width, height, false));
}

function createFirefly(width: number, height: number, edgeSpawn: boolean): Firefly {
  const depth = Math.random();
  const fromLeft = Math.random() > 0.5;
  const x = edgeSpawn
    ? (fromLeft ? -24 - Math.random() * 40 : width + 24 + Math.random() * 40)
    : Math.random() * width;
  const y = edgeSpawn ? Math.random() * height : Math.random() * height;
  return {
    x,
    y,
    previousX: x,
    previousY: y,
    vx: (fromLeft ? 0.12 : -0.12) + (Math.random() - 0.5) * 0.42,
    vy: (Math.random() - 0.5) * 0.32,
    phase: Math.random() * Math.PI * 2,
    size: 0.8 + depth * 1.55 + Math.random() * 0.45,
    depth,
    life: Math.random() * 180,
    maxLife: 480 + Math.random() * 560,
    pulseSpeed: 0.018 + Math.random() * 0.045,
    wander: Math.random() * Math.PI * 2,
    hueShift: Math.random(),
    flash: Math.random() > 0.88 ? Math.random() : 0,
  };
}

function drawFirefly(ctx: CanvasRenderingContext2D, fly: Firefly, intensity: number): void {
  const lifeIn = Math.min(1, fly.life / 90);
  const lifeOut = Math.min(1, (fly.maxLife - fly.life) / 120);
  const lifeAlpha = Math.max(0, Math.min(lifeIn, lifeOut));
  const pulse = Math.max(0, Math.sin(fly.phase)) ** 2.4;
  const alpha = (0.14 + pulse * 0.36 + fly.flash * 0.38) * lifeAlpha * (0.5 + intensity * 0.75);
  const coreRadius = fly.size * (0.8 + pulse * 0.5 + fly.flash * 0.55);
  const glowRadius = coreRadius * (3.2 + fly.depth * 2.4);
  const green = 210 + Math.round(fly.hueShift * 38);
  const blue = 128 + Math.round(fly.hueShift * 42);

  const trail = ctx.createLinearGradient(fly.previousX, fly.previousY, fly.x, fly.y);
  trail.addColorStop(0, 'rgba(105, 255, 166, 0)');
  trail.addColorStop(1, `rgba(165, ${green}, ${blue}, ${alpha * 0.16})`);
  ctx.strokeStyle = trail;
  ctx.lineWidth = Math.max(0.5, coreRadius * 0.65);
  ctx.beginPath();
  ctx.moveTo(fly.previousX, fly.previousY);
  ctx.lineTo(fly.x, fly.y);
  ctx.stroke();

  const aura = ctx.createRadialGradient(fly.x, fly.y, 0, fly.x, fly.y, glowRadius);
  aura.addColorStop(0, `rgba(238, 255, 198, ${Math.min(0.85, alpha * 1.2)})`);
  aura.addColorStop(0.18, `rgba(168, ${green}, ${blue}, ${alpha * 0.34})`);
  aura.addColorStop(0.6, `rgba(76, 210, 130, ${alpha * 0.08})`);
  aura.addColorStop(1, 'rgba(76, 210, 130, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(fly.x, fly.y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255, 255, 218, ${Math.min(1, alpha * 1.8)})`;
  ctx.beginPath();
  ctx.arc(fly.x, fly.y, Math.max(0.7, coreRadius * 0.42), 0, Math.PI * 2);
  ctx.fill();
}
