import { smoothNoise, type EffectController, type EffectRuntime } from './shared';

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
  const seedParticles = ({ width, height }: EffectRuntime): void => {
    if (particles.length > 0) {
      return;
    }
    for (let i = 0; i < 180; i += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      particles.push({ x, y, previousX: x, previousY: y, life: Math.random() });
    }
  };
  seedParticles(runtime);

  return {
    resize: seedParticles,
    step({ width, height }, deltaSeconds) {
      const frameScale = deltaSeconds * 60;
      for (const particle of particles) {
        particle.previousX = particle.x;
        particle.previousY = particle.y;
        const noise = smoothNoise(particle.x * 0.004 + time * 0.0008, particle.y * 0.004 + 100);
        const angle = noise * Math.PI * 6;
        const speed = 0.26 + smoothNoise(particle.x * 0.003, particle.y * 0.003 + 50) * 0.62;
        particle.x += Math.cos(angle) * speed * frameScale;
        particle.y += Math.sin(angle) * speed * frameScale;
        particle.life -= 0.00055 * frameScale;
        if (particle.life <= 0 || particle.x < 0 || particle.x > width || particle.y < 0 || particle.y > height) {
          particle.x = Math.random() * width;
          particle.y = Math.random() * height;
          particle.previousX = particle.x;
          particle.previousY = particle.y;
          particle.life = 1;
        }
      }
      time += frameScale;
    },
    draw({ ctx, width, height, color, intensity }) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';
      for (const particle of particles) {
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
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },
  };
}
