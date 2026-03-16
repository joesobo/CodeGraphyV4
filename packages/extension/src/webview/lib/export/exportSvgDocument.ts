import { resolveDirectionColor } from './common';
import type { SvgBounds, SvgExportOptions, SvgPalette } from './exportSvgTypes';

export function getPalette(options: SvgExportOptions): SvgPalette {
  return {
    showArrows: options.directionMode === 'arrows',
    arrowColor: resolveDirectionColor(options.directionColor),
    backgroundColor: options.theme === 'light' ? '#ffffff' : '#18181b',
    labelColor: options.theme === 'light' ? '#1e1e1e' : '#e2e8f0',
  };
}

export function createBaseParts(bounds: SvgBounds, backgroundColor: string): string[] {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}" width="${bounds.width}" height="${bounds.height}">`,
    `<rect x="${bounds.minX}" y="${bounds.minY}" width="${bounds.width}" height="${bounds.height}" fill="${backgroundColor}"/>`,
  ];
}

export function createDefinitions(showArrows: boolean, arrowColor: string): string[] {
  if (!showArrows) {
    return [];
  }

  return [
    '<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">',
    `<polygon points="0 0, 10 3.5, 0 7" fill="${arrowColor}"/></marker>`,
  ];
}

export function assembleSvg(parts: string[], definitions: string[], imageElements: string[]): string {
  if (definitions.length > 0) {
    parts.splice(3, 0, `<defs>${definitions.join('')}</defs>`);
  }

  parts.push(...imageElements);
  parts.push('</svg>');
  return parts.join('\n');
}
