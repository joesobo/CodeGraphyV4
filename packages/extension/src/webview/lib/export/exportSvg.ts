import type { DirectionMode, NodeShape2D } from '../../../shared/types';
import { DEFAULT_DIRECTION_COLOR } from '../../../shared/types';
import { getImage } from '../imageCache';
import { postMessage } from '../vscodeApi';
import { createExportTimestamp, resolveDirectionColor } from './common';

interface SvgExportLinkNodeRef {
  id?: string | number;
}

export interface SvgExportNode {
  id: string;
  label: string;
  size: number;
  color: string;
  borderColor: string;
  borderWidth: number;
  shape2D?: NodeShape2D;
  imageUrl?: string;
  x?: number;
  y?: number;
}

export interface SvgExportLink {
  source?: string | number | SvgExportLinkNodeRef;
  target?: string | number | SvgExportLinkNodeRef;
  bidirectional: boolean;
  baseColor?: string;
  curvature?: number;
}

export interface SvgExportOptions {
  directionMode: DirectionMode;
  directionColor: string;
  showLabels: boolean;
  theme: string;
}

interface SvgPosition {
  x: number;
  y: number;
}

interface SvgBounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

interface SvgPalette {
  showArrows: boolean;
  arrowColor: string;
  backgroundColor: string;
  labelColor: string;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function svgShapePath(shape: NodeShape2D | undefined, x: number, y: number, size: number): string {
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

function getLinkNodeId(node: string | number | SvgExportLinkNodeRef | undefined): string | null {
  if (node === undefined) {
    return null;
  }
  if (typeof node === 'number') {
    return String(node);
  }
  if (typeof node === 'string') {
    return node;
  }
  if (node.id === undefined) {
    return null;
  }
  return String(node.id);
}

function calculateBounds(nodes: SvgExportNode[]): SvgBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    minX = Math.min(minX, x - node.size);
    minY = Math.min(minY, y - node.size);
    maxX = Math.max(maxX, x + node.size);
    maxY = Math.max(maxY, y + node.size);
  }

  if (!Number.isFinite(minX)) {
    minX = -100;
    minY = -100;
    maxX = 100;
    maxY = 100;
  }

  const padding = 50;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function getPalette(options: SvgExportOptions): SvgPalette {
  return {
    showArrows: options.directionMode === 'arrows',
    arrowColor: resolveDirectionColor(options.directionColor),
    backgroundColor: options.theme === 'light' ? '#ffffff' : '#18181b',
    labelColor: options.theme === 'light' ? '#1e1e1e' : '#e2e8f0',
  };
}

function createBaseParts(bounds: SvgBounds, backgroundColor: string): string[] {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}" width="${bounds.width}" height="${bounds.height}">`,
    `<rect x="${bounds.minX}" y="${bounds.minY}" width="${bounds.width}" height="${bounds.height}" fill="${backgroundColor}"/>`,
  ];
}

function createDefinitions(showArrows: boolean, arrowColor: string): string[] {
  if (!showArrows) {
    return [];
  }

  return [
    '<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">',
    `<polygon points="0 0, 10 3.5, 0 7" fill="${arrowColor}"/></marker>`,
  ];
}

function buildPositionMap(nodes: SvgExportNode[]): Map<string, SvgPosition> {
  return new Map(nodes.map(node => [node.id, { x: node.x ?? 0, y: node.y ?? 0 }]));
}

function buildLinkElement(link: SvgExportLink, from: SvgPosition, to: SvgPosition, showArrows: boolean): string {
  const color = link.baseColor ?? DEFAULT_DIRECTION_COLOR;
  const strokeWidth = link.bidirectional ? 2 : 1;
  const markerAttr = showArrows ? ' marker-end="url(#arrowhead)"' : '';
  const curvature = link.curvature ?? 0;

  if (Math.abs(curvature) > 0.001) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const cx = (from.x + to.x) / 2 - curvature * dy;
    const cy = (from.y + to.y) / 2 + curvature * dx;
    return `<path d="M${from.x},${from.y} Q${cx},${cy} ${to.x},${to.y}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"${markerAttr}/>`;
  }

  return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${color}" stroke-width="${strokeWidth}"${markerAttr}/>`;
}

function appendLinkElements(
  parts: string[],
  links: SvgExportLink[],
  positionMap: Map<string, SvgPosition>,
  showArrows: boolean
): void {
  for (const link of links) {
    const sourceId = getLinkNodeId(link.source);
    const targetId = getLinkNodeId(link.target);
    if (sourceId === null || targetId === null) {
      continue;
    }

    const from = positionMap.get(sourceId);
    const to = positionMap.get(targetId);
    if (!from || !to) {
      continue;
    }

    parts.push(buildLinkElement(link, from, to, showArrows));
  }
}

function appendNodeShape(parts: string[], node: SvgExportNode, position: SvgPosition, shape: NodeShape2D): void {
  if (shape === 'circle') {
    parts.push(
      `<circle cx="${position.x}" cy="${position.y}" r="${node.size}" fill="${node.color}" stroke="${node.borderColor}" stroke-width="${node.borderWidth}"/>`
    );
    return;
  }

  parts.push(
    `<path d="${svgShapePath(shape, position.x, position.y, node.size)}" fill="${node.color}" stroke="${node.borderColor}" stroke-width="${node.borderWidth}"/>`
  );
}

function appendNodeImageOverlay(
  node: SvgExportNode,
  position: SvgPosition,
  shape: NodeShape2D,
  definitions: string[],
  imageElements: string[]
): void {
  if (!node.imageUrl) {
    return;
  }

  const image = getImage(node.imageUrl);
  if (!image) {
    return;
  }

  const clipId = `clip-${node.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const imageSize = node.size * 1.2;
  const clipShape =
    shape === 'circle'
      ? `<circle cx="${position.x}" cy="${position.y}" r="${node.size * 0.8}"/>`
      : `<path d="${svgShapePath(shape, position.x, position.y, node.size * 0.8)}"/>`;

  definitions.push(`<clipPath id="${clipId}">${clipShape}</clipPath>`);

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || 64;
  canvas.height = image.naturalHeight || 64;
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  context.drawImage(image, 0, 0);
  const dataUri = canvas.toDataURL('image/png');
  imageElements.push(
    `<image href="${dataUri}" x="${position.x - imageSize / 2}" y="${position.y - imageSize / 2}" width="${imageSize}" height="${imageSize}" clip-path="url(#${clipId})"/>`
  );
}

function appendNodeLabel(parts: string[], node: SvgExportNode, position: SvgPosition, labelColor: string): void {
  parts.push(
    `<text x="${position.x}" y="${position.y + node.size + 14}" text-anchor="middle" fill="${labelColor}" font-size="12" font-family="sans-serif">${escapeXml(node.label)}</text>`
  );
}

function appendNodeElements(
  parts: string[],
  definitions: string[],
  imageElements: string[],
  nodes: SvgExportNode[],
  positionMap: Map<string, SvgPosition>,
  showLabels: boolean,
  labelColor: string
): void {
  for (const node of nodes) {
    const position = positionMap.get(node.id);
    if (!position) {
      continue;
    }

    const shape = node.shape2D ?? 'circle';
    appendNodeShape(parts, node, position, shape);
    appendNodeImageOverlay(node, position, shape, definitions, imageElements);

    if (showLabels) {
      appendNodeLabel(parts, node, position, labelColor);
    }
  }
}

function assembleSvg(parts: string[], definitions: string[], imageElements: string[]): string {
  if (definitions.length > 0) {
    parts.splice(3, 0, `<defs>${definitions.join('')}</defs>`);
  }

  parts.push(...imageElements);
  parts.push('</svg>');
  return parts.join('\n');
}

export function exportAsSvg(nodes: SvgExportNode[], links: SvgExportLink[], options: SvgExportOptions): void {
  try {
    const bounds = calculateBounds(nodes);
    const palette = getPalette(options);
    const parts = createBaseParts(bounds, palette.backgroundColor);
    const definitions = createDefinitions(palette.showArrows, palette.arrowColor);
    const imageElements: string[] = [];
    const positionMap = buildPositionMap(nodes);

    appendLinkElements(parts, links, positionMap, palette.showArrows);
    appendNodeElements(parts, definitions, imageElements, nodes, positionMap, options.showLabels, palette.labelColor);

    const svg = assembleSvg(parts, definitions, imageElements);
    const timestamp = createExportTimestamp();

    postMessage({
      type: 'EXPORT_SVG',
      payload: { svg, filename: `codegraphy-${timestamp}.svg` },
    });
  } catch (error) {
    console.error('[CodeGraphy] SVG export failed:', error);
  }
}
