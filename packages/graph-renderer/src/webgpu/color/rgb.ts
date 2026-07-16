import type { WebGpuColor } from './types';

export function parseRgbColor(value: string): WebGpuColor | null {
  const number = '(\\d+(?:\\.\\d+)?|\\.\\d+)';
  const match = new RegExp(
    `^rgba?\\(\\s*${number}[, ]+${number}[, ]+${number}(?:\\s*[,/]\\s*${number})?\\s*\\)$`,
    'i',
  ).exec(value);
  if (!match) return null;
  return [
    Math.min(255, Number(match[1])) / 255,
    Math.min(255, Number(match[2])) / 255,
    Math.min(255, Number(match[3])) / 255,
    match[4] === undefined ? 1 : Math.min(1, Number(match[4])),
  ];
}
