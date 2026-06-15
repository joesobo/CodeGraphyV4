import { smoothNoise, type EffectController, type EffectRuntime } from '../runtime';

interface FlowParticle {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  life: number;
}

export function createPerlinFlowEffect(runtime: EffectRuntime): EffectController {
  let time = 0;
  const particles: FlowParticle[] = [];
  seedParticles(particles, runtime);

  return {
    resize: nextRuntime => seedParticles(particles, nextRuntime),
    step({ width, height }, deltaSeconds) {
      const frameScale = deltaSeconds * 60;
      for (const particle of particles) {
        updateParticle(particle, width, height, time, frameScale);
      }
      time += frameScale;
    },
    draw({ ctx, width, height, color, intensity }) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';
      for (const particle of particles) {
        drawParticle(ctx, particle, color, intensity);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },
  };
}

function seedParticles(particles: FlowParticle[], { width, height }: EffectRuntime): void {
  if (particles.length > 0) {
    return;
  }
  for (let i = 0; i < 180; i += 1) {
    particles.push(createParticle(width, height, Math.random()));
  }
}

function createParticle(width: number, height: number, life: number): FlowParticle {
  const x = Math.random() * width;
  const y = Math.random() * height;
  return { x, y, previousX: x, previousY: y, life };
}

function updateParticle(
  particle: FlowParticle,
  width: number,
  height: number,
  time: number,
  frameScale: number,
): void {
  particle.previousX = particle.x;
  particle.previousY = particle.y;
  const angle = readFlowAngle(particle, time);
  const speed = readFlowSpeed(particle);
  particle.x += Math.cos(angle) * speed * frameScale;
  particle.y += Math.sin(angle) * speed * frameScale;
  particle.life -= 0.00055 * frameScale;
  if (shouldResetParticle(particle, width, height)) {
    Object.assign(particle, createParticle(width, height, 1));
  }
}

function readFlowAngle(particle: FlowParticle, time: number): number {
  const noise = smoothNoise(particle.x * 0.004 + time * 0.0008, particle.y * 0.004 + 100);
  return noise * Math.PI * 6;
}

function readFlowSpeed(particle: FlowParticle): number {
  return 0.26 + smoothNoise(particle.x * 0.003, particle.y * 0.003 + 50) * 0.62;
}

function shouldResetParticle(particle: FlowParticle, width: number, height: number): boolean {
  return particle.life <= 0 || particle.x < 0 || particle.x > width || particle.y < 0 || particle.y > height;
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  particle: FlowParticle,
  color: string,
  intensity: number,
): void {
  ctx.strokeStyle = color;
  ctx.globalAlpha = particle.life * 0.055 * intensity;
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.moveTo(particle.previousX, particle.previousY);
  ctx.lineTo(particle.x, particle.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(particle.x, particle.y, 1.05, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.globalAlpha = particle.life * 0.095 * intensity;
  ctx.fill();
}
