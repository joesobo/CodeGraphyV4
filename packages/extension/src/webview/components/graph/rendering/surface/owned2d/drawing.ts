import type { DirectionMode } from '../../../../../../shared/settings/modes';
import type { FGLink, FGNode } from '../../../model/build';
import {
  ownedLinkGeometry,
  pointOnOwnedLink,
  type OwnedLinkGeometry,
} from './linkGeometry';

export interface OwnedGraphDrawingOptions {
  context: CanvasRenderingContext2D;
  directionMode: DirectionMode;
  getLinkParticles(this: void, link: FGLink): number;
  getParticleColor(this: void, link: FGLink): string;
  globalScale: number;
  links: readonly FGLink[];
  nodes: readonly FGNode[];
  nodeLabelCanvasObject(this: void, node: FGNode, context: CanvasRenderingContext2D, globalScale: number): void;
  particleSize: number;
  particleSpeed: number;
  timestamp: number;
  viewport: { maximumX: number; maximumY: number; minimumX: number; minimumY: number };
}

function drawParticles(
  context: CanvasRenderingContext2D,
  geometry: OwnedLinkGeometry,
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
    const point = pointOnOwnedLink(geometry, position);
    context.fillStyle = color;
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
  }
}

export function drawOwnedGraphParticles(options: OwnedGraphDrawingOptions): void {
  if (options.directionMode !== 'particles') return;
  const { context, globalScale } = options;
  for (const link of options.links) {
    const geometry = ownedLinkGeometry(link);
    if (!geometry) continue;
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
}

export function drawOwnedGraphOverlay(options: OwnedGraphDrawingOptions): void {
  drawOwnedGraphParticles(options);
  const { context, globalScale } = options;
  for (const node of options.nodes) {
    options.nodeLabelCanvasObject(node, context, globalScale);
  }
}

export function drawOwnedGraphLabels(options: OwnedGraphDrawingOptions): void {
  const visibleNodes = options.nodes.filter(node => Number.isFinite(node.x)
    && Number.isFinite(node.y)
    && (node.x as number) >= options.viewport.minimumX
    && (node.x as number) <= options.viewport.maximumX
    && (node.y as number) >= options.viewport.minimumY
    && (node.y as number) <= options.viewport.maximumY);
  const stride = Math.max(1, Math.ceil(visibleNodes.length / 400));
  for (let index = 0; index < visibleNodes.length; index += stride) {
    options.nodeLabelCanvasObject(
      visibleNodes[index],
      options.context,
      options.globalScale,
    );
  }
}

