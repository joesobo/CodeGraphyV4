import { rgba, type EffectController, type EffectRuntime } from './shared';

interface Snowflake {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  drift: number;
}

export function createSnowEffect(runtime: EffectRuntime): EffectController {
  const flakes: Snowflake[] = [];
  const flakeCount = 120;

  const makeFlake = (width: number, height: number, index = Math.random() * flakeCount): Snowflake => ({
    x: ((index + Math.random()) / flakeCount) * width,
    y: Math.random() * height,
    vx: -0.18 + Math.random() * 0.36,
    vy: 0.35 + Math.random() * 0.9,
    radius: 0.8 + Math.random() * 2.2,
    alpha: 0.28 + Math.random() * 0.44,
    drift: Math.random() * Math.PI * 2,
  });

  const seedFlakes = ({ width, height }: EffectRuntime): void => {
    if (flakes.length > 0) {
      return;
    }

    for (let index = 0; index < flakeCount; index += 1) {
      flakes.push(makeFlake(width, height, index));
    }
  };

  seedFlakes(runtime);

  return {
    resize: seedFlakes,
    draw({ ctx, width, height, color, intensity, size }) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = rgba(color, 1);

      for (const flake of flakes) {
        flake.drift += 0.01 + intensity * 0.012;
        flake.x += flake.vx + Math.sin(flake.drift) * 0.18;
        flake.y += flake.vy * (0.45 + intensity * 0.55);

        if (flake.y > height + 8) {
          flake.y = -8;
          flake.x = Math.random() * width;
        }
        if (flake.x < -8) {
          flake.x = width + 8;
        } else if (flake.x > width + 8) {
          flake.x = -8;
        }

        ctx.globalAlpha = flake.alpha * Math.max(0.2, intensity);
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius * size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    },
  };
}
