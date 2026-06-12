import { rgba, smoothNoise, type EffectController, type EffectRuntime } from './shared';

interface FlowParticle {
  x: number;
  y: number;
  life: number;
}

export function createPerlinFlowEffect(runtime: EffectRuntime): EffectController {
  let time = 0;
  const particles: FlowParticle[] = [];
  const seedParticles = ({ width, height }: EffectRuntime): void => {
    if (particles.length > 0) {
      return;
    }
    for (let i = 0; i < 200; i += 1) {
      particles.push({ x: Math.random() * width, y: Math.random() * height, life: Math.random() });
    }
  };
  seedParticles(runtime);

  return {
    resize: seedParticles,
    draw({ ctx, width, height, color, backgroundColor, intensity }) {
      ctx.fillStyle = rgba(backgroundColor, 0.02);
      ctx.fillRect(0, 0, width, height);
      for (const particle of particles) {
        const noise = smoothNoise(particle.x * 0.004 + time * 0.0008, particle.y * 0.004 + 100);
        const angle = noise * Math.PI * 6;
        const speed = 1 + smoothNoise(particle.x * 0.003, particle.y * 0.003 + 50) * 1.5;
        particle.x += Math.cos(angle) * speed;
        particle.y += Math.sin(angle) * speed;
        particle.life -= 0.001;
        if (particle.life <= 0 || particle.x < 0 || particle.x > width || particle.y < 0 || particle.y > height) {
          particle.x = Math.random() * width;
          particle.y = Math.random() * height;
          particle.life = 1;
        }
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 1, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = particle.life * 0.15 * intensity;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      time += 1;
    },
  };
}
