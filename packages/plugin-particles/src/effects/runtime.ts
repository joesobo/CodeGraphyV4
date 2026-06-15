export interface EffectRuntime {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  dpr: number;
  intensity: number;
  size: number;
  color: string;
  backgroundColor: string;
}

export type DrawEffect = (runtime: EffectRuntime) => void;
export type ResizeEffect = (runtime: EffectRuntime) => void;
export type StepEffect = (runtime: EffectRuntime, deltaSeconds: number) => void;

export interface EffectController {
  draw: DrawEffect;
  resize?: ResizeEffect;
  step?: StepEffect;
}

export function rgba(color: string, alpha: number): string {
  const rgb = cssRgbToRgb(color) ?? hexToRgb(color) ?? { r: 156, g: 222, b: 242 };
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

export function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const topLeft = noise2d(ix, iy);
  const topRight = noise2d(ix + 1, iy);
  const bottomLeft = noise2d(ix, iy + 1);
  const bottomRight = noise2d(ix + 1, iy + 1);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return topLeft
    + (topRight - topLeft) * ux
    + (bottomLeft - topLeft) * uy
    + (topLeft - topRight - bottomLeft + bottomRight) * ux * uy;
}

function noise2d(x: number, y: number): number {
  const noise = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return noise - Math.floor(noise);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let normalized = String(hex || '').trim().replace(/^#/, '');
  if (normalized.length === 3) {
    normalized = normalized.split('').map((channel) => channel + channel).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }
  const value = parseInt(normalized, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function cssRgbToRgb(color: string): { r: number; g: number; b: number } | null {
  const match = String(color || '').trim().match(/^rgb\(\s*(\d{1,3})(?:\s+|,\s*)(\d{1,3})(?:\s+|,\s*)(\d{1,3})\s*\)$/i);
  if (!match) {
    return null;
  }

  const [r, g, b] = match.slice(1).map(Number);
  if ([r, g, b].some(channel => channel < 0 || channel > 255)) {
    return null;
  }
  return { r, g, b };
}
