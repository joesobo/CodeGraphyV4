import type { EffectController, EffectRuntime } from './shared';

interface Pulse {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

export function createSynapseEffect(runtime: EffectRuntime): EffectController {
  const grid = 24;
  const maxPulses = 20;
  const speedMin = 2;
  const speedMax = 22;
  const trailLen = 12;
  let cols = Math.ceil(runtime.width / grid);
  let rows = Math.ceil(runtime.height / grid);
  const pulses: Pulse[] = [];

  const spawnPulse = (): void => {
    const speed = speedMin + Math.random() * (speedMax - speedMin);
    if (Math.random() > 0.5) {
      const row = Math.floor(Math.random() * (rows + 1));
      pulses.push({ x: -trailLen, y: row * grid, dx: speed, dy: 0 });
    } else {
      const col = Math.floor(Math.random() * (cols + 1));
      pulses.push({ x: col * grid, y: -trailLen, dx: 0, dy: speed });
    }
  };

  return {
    resize(nextRuntime) {
      cols = Math.ceil(nextRuntime.width / grid);
      rows = Math.ceil(nextRuntime.height / grid);
    },
    draw({ ctx, width, height, color, intensity }) {
      ctx.clearRect(0, 0, width, height);
      drawSynapseGrid(ctx, width, height, color, intensity);
      if (pulses.length < maxPulses && Math.random() < 0.12 * intensity) {
        spawnPulse();
      }

      for (let index = pulses.length - 1; index >= 0; index -= 1) {
        const pulse = pulses[index];
        pulse.x += pulse.dx;
        pulse.y += pulse.dy;

        if (pulse.x > width + trailLen || pulse.y > height + trailLen) {
          pulses.splice(index, 1);
          continue;
        }

        const tx = pulse.x - (pulse.dx > 0 ? trailLen : 0);
        const ty = pulse.y - (pulse.dy > 0 ? trailLen : 0);
        const gradient = ctx.createLinearGradient(tx, ty, pulse.x, pulse.y);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, color);
        ctx.strokeStyle = gradient;
        ctx.globalAlpha = 0.35 * intensity;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(pulse.x, pulse.y);
        ctx.stroke();

        ctx.globalAlpha = 0.55 * intensity;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
}

function drawSynapseGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
  intensity: number,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.035 * intensity;
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}
