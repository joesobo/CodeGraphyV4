import { resolveGraphLinkGeometry, pointOnGraphLink, type GraphLinkGeometry } from '@codegraphy-dev/graph-renderer';
import type { DirectionMode } from '../../../../../../../../shared/settings/modes';
import type { FGLink } from '../../../../../model/build';

export interface OwnedGraphParticleDrawingOptions {
  context: CanvasRenderingContext2D;
  directionMode: DirectionMode;
  getLinkParticles(this: void, link: FGLink): number;
  getParticleColor(this: void, link: FGLink): string;
  globalScale: number;
  links: readonly FGLink[];
  particleSize: number;
  particleSpeed: number;
  timestamp: number;
}

function drawParticles(
  context: CanvasRenderingContext2D,
  geometry: GraphLinkGeometry,
  count: number,
  color: string,
  size: number,
  speed: number,
  timestamp: number,
  globalScale: number,
): void {
  const radius = Math.max(0.75, size) / Math.max(globalScale, 0.01);
  context.fillStyle = color;
  for (let index = 0; index < count; index += 1) {
    const point = pointOnGraphLink(geometry, ((timestamp * speed * 0.001) + index / count) % 1);
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
  }
}

function drawLinkParticles(options: OwnedGraphParticleDrawingOptions, link: FGLink): void {
  const geometry = resolveGraphLinkGeometry(link);
  if (!geometry) return;
  drawParticles(options.context, geometry, Math.max(1, options.getLinkParticles(link)),
    options.getParticleColor(link), options.particleSize, options.particleSpeed,
    options.timestamp, options.globalScale);
}

export function drawOwnedGraphParticles(options: OwnedGraphParticleDrawingOptions): void {
  if (options.directionMode !== 'particles') return;
  for (const link of options.links) drawLinkParticles(options, link);
}
