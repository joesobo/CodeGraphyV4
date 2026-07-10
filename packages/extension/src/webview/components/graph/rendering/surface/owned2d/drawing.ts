import type { LinkObject, NodeObject } from 'react-force-graph-2d';
import type { DirectionMode } from '../../../../../../shared/settings/modes';
import type { FGLink, FGNode } from '../../../model/build';

export interface OwnedGraphDrawingOptions {
  context: CanvasRenderingContext2D;
  directionMode: DirectionMode;
  getArrowColor(this: void, link: LinkObject): string;
  getLinkColor(this: void, link: LinkObject): string;
  getLinkParticles(this: void, link: LinkObject): number;
  getLinkWidth(this: void, link: LinkObject): number;
  getParticleColor(this: void, link: LinkObject): string;
  globalScale: number;
  links: readonly FGLink[];
  linkCanvasObject(this: void, link: LinkObject, context: CanvasRenderingContext2D, globalScale: number): void;
  nodes: readonly FGNode[];
  nodeCanvasObject(this: void, node: NodeObject, context: CanvasRenderingContext2D, globalScale: number): void;
  particleSize: number;
  particleSpeed: number;
  timestamp: number;
}

interface LinkGeometry {
  controlX: number;
  controlY: number;
  source: FGNode;
  target: FGNode;
}

function linkGeometry(link: FGLink): LinkGeometry | undefined {
  if (typeof link.source === 'string' || typeof link.target === 'string') return undefined;
  const source = link.source;
  const target = link.target;
  if (![source.x, source.y, target.x, target.y].every(Number.isFinite)) return undefined;
  const dx = (target.x as number) - (source.x as number);
  const dy = (target.y as number) - (source.y as number);
  const distance = Math.hypot(dx, dy);
  const curvature = link.curvature ?? 0;
  const offset = distance * curvature;
  return {
    source,
    target,
    controlX: ((source.x as number) + (target.x as number)) / 2
      + (distance === 0 ? 0 : (-dy / distance) * offset),
    controlY: ((source.y as number) + (target.y as number)) / 2
      + (distance === 0 ? 0 : (dx / distance) * offset),
  };
}

function pointOnLink(geometry: LinkGeometry, position: number): {
  x: number;
  y: number;
  angle: number;
} {
  const inverse = 1 - position;
  const sourceX = geometry.source.x as number;
  const sourceY = geometry.source.y as number;
  const targetX = geometry.target.x as number;
  const targetY = geometry.target.y as number;
  const x = inverse * inverse * sourceX
    + 2 * inverse * position * geometry.controlX
    + position * position * targetX;
  const y = inverse * inverse * sourceY
    + 2 * inverse * position * geometry.controlY
    + position * position * targetY;
  const tangentX = 2 * inverse * (geometry.controlX - sourceX)
    + 2 * position * (targetX - geometry.controlX);
  const tangentY = 2 * inverse * (geometry.controlY - sourceY)
    + 2 * position * (targetY - geometry.controlY);
  return { x, y, angle: Math.atan2(tangentY, tangentX) };
}

function traceLink(context: CanvasRenderingContext2D, geometry: LinkGeometry): void {
  context.beginPath();
  context.moveTo(geometry.source.x as number, geometry.source.y as number);
  context.quadraticCurveTo(
    geometry.controlX,
    geometry.controlY,
    geometry.target.x as number,
    geometry.target.y as number,
  );
}

function drawArrow(
  context: CanvasRenderingContext2D,
  geometry: LinkGeometry,
  color: string,
  globalScale: number,
): void {
  const point = pointOnLink(geometry, 0.72);
  const length = 8 / Math.max(globalScale, 0.01);
  context.save();
  context.translate(point.x, point.y);
  context.rotate(point.angle);
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(length, 0);
  context.lineTo(-length * 0.6, length * 0.55);
  context.lineTo(-length * 0.6, -length * 0.55);
  context.closePath();
  context.fill();
  context.restore();
}

function drawParticles(
  context: CanvasRenderingContext2D,
  geometry: LinkGeometry,
  count: number,
  color: string,
  size: number,
  speed: number,
  timestamp: number,
  globalScale: number,
): void {
  const radius = Math.max(0.75, size) / Math.max(globalScale, 0.01);
  for (let index = 0; index < count; index += 1) {
    const position = ((timestamp * speed * 0.001) + index / count) % 1;
    const point = pointOnLink(geometry, position);
    context.fillStyle = color;
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
  }
}

export function drawOwnedGraph(options: OwnedGraphDrawingOptions): void {
  const { context, globalScale } = options;
  for (const link of options.links) {
    const geometry = linkGeometry(link);
    if (!geometry) continue;
    context.save();
    traceLink(context, geometry);
    context.strokeStyle = options.getLinkColor(link);
    context.lineWidth = Math.max(0.25, options.getLinkWidth(link)) / Math.max(globalScale, 0.01);
    context.stroke();
    if (options.directionMode === 'arrows') {
      drawArrow(context, geometry, options.getArrowColor(link), globalScale);
    } else if (options.directionMode === 'particles') {
      drawParticles(
        context,
        geometry,
        Math.max(1, options.getLinkParticles(link)),
        options.getParticleColor(link),
        options.particleSize,
        options.particleSpeed,
        options.timestamp,
        globalScale,
      );
    }
    options.linkCanvasObject(link, context, globalScale);
    context.restore();
  }

  for (const node of options.nodes) {
    options.nodeCanvasObject(node, context, globalScale);
  }
}
