import type { NodeShape2D } from '../../../shared/types';

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function svgShapePath(shape: NodeShape2D | undefined, x: number, y: number, size: number): string {
  switch (shape) {
    case 'square':
      return `M${x - size},${y - size}h${size * 2}v${size * 2}h${-size * 2}Z`;
    case 'diamond':
      return `M${x},${y - size}L${x + size},${y}L${x},${y + size}L${x - size},${y}Z`;
    case 'triangle': {
      const points = [0, 1, 2].map(index => {
        const angle = -Math.PI / 2 + index * (2 * Math.PI / 3);
        return `${x + size * Math.cos(angle)},${y + size * Math.sin(angle)}`;
      });
      return `M${points.join('L')}Z`;
    }
    case 'hexagon': {
      const points = [0, 1, 2, 3, 4, 5].map(index => {
        const angle = -Math.PI / 2 + index * (2 * Math.PI / 6);
        return `${x + size * Math.cos(angle)},${y + size * Math.sin(angle)}`;
      });
      return `M${points.join('L')}Z`;
    }
    case 'star': {
      const points: string[] = [];
      for (let index = 0; index < 10; index += 1) {
        const radius = index % 2 === 0 ? size : size * 0.4;
        const angle = -Math.PI / 2 + index * (Math.PI / 5);
        points.push(`${x + radius * Math.cos(angle)},${y + radius * Math.sin(angle)}`);
      }
      return `M${points.join('L')}Z`;
    }
    default:
      return '';
  }
}
