import { getSwatchName } from './swatches';

export function getAccentSwatch(mood: string): string {
  return [
    `seed:        ${getSwatchName(mood)}`,
    `complement:  ${getSwatchName(mood, 180)}`,
    `analogous A: ${getSwatchName(mood, -30)}`,
    `analogous B: ${getSwatchName(mood, 30)}`,
    `triadic A:   ${getSwatchName(mood, 120)}`,
    `triadic B:   ${getSwatchName(mood, 240)}`,
  ].join('\n');
}
