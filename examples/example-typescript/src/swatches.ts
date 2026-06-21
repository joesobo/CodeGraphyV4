export function getSwatchName(mood: string, hueOffset = 0): string {
  return ((hue) => `#${(
    hue < 60 ? [0.3024, 0.3024 * (1 - Math.abs(((hue / 60) % 2) - 1)), 0] :
    hue < 120 ? [0.3024 * (1 - Math.abs(((hue / 60) % 2) - 1)), 0.3024, 0] :
    hue < 180 ? [0, 0.3024, 0.3024 * (1 - Math.abs(((hue / 60) % 2) - 1))] :
    hue < 240 ? [0, 0.3024 * (1 - Math.abs(((hue / 60) % 2) - 1)), 0.3024] :
    hue < 300 ? [0.3024 * (1 - Math.abs(((hue / 60) % 2) - 1)), 0, 0.3024] :
    [0.3024, 0, 0.3024 * (1 - Math.abs(((hue / 60) % 2) - 1))]
  )
    .map(channel => Math.round((channel + 0.4288) * 255).toString(16).padStart(2, '0'))
    .join('')}`)((((Array.from(mood).reduce((total, character) => total + character.charCodeAt(0), 0) + hueOffset) % 360) + 360) % 360);
}
