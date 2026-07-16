import type { WebGpuColor } from './types';

export function parseSrgbColor(value: string): WebGpuColor | null {
  const number = '(\\d+(?:\\.\\d+)?|\\.\\d+)';
  const match = new RegExp(
    `^color\\(\\s*srgb\\s+${number}\\s+${number}\\s+${number}(?:\\s*\\/\\s*${number})?\\s*\\)$`,
    'i',
  ).exec(value);
  if (!match) return null;
  return [
    Math.min(1, Number(match[1])),
    Math.min(1, Number(match[2])),
    Math.min(1, Number(match[3])),
    match[4] === undefined ? 1 : Math.min(1, Number(match[4])),
  ];
}
