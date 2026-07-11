import type { DirectionMode } from '../../../../../../shared/settings/modes';
import type { FGLink, FGNode } from '../../../model/build';
import {
  ownedLinkGeometry,
  pointOnOwnedLink,
  traceOwnedLink,
  type OwnedLinkGeometry,
} from './linkGeometry';

export interface OwnedGraphDrawingOptions {
  context: CanvasRenderingContext2D;
  directionMode: DirectionMode;
  getArrowColor(this: void, link: FGLink): string;
  getLinkColor(this: void, link: FGLink): string;
  getLinkParticles(this: void, link: FGLink): number;
  getLinkWidth(this: void, link: FGLink): number;
  getParticleColor(this: void, link: FGLink): string;
  globalScale: number;
  links: readonly FGLink[];
  linkCanvasObject(this: void, link: FGLink, context: CanvasRenderingContext2D, globalScale: number): void;
  nodes: readonly FGNode[];
  nodeCanvasObject(this: void, node: FGNode, context: CanvasRenderingContext2D, globalScale: number): void;
  nodeLabelCanvasObject(this: void, node: FGNode, context: CanvasRenderingContext2D, globalScale: number): void;
  particleSize: number;
  particleSpeed: number;
  timestamp: number;
  viewport: { maximumX: number; maximumY: number; minimumX: number; minimumY: number };
}

function drawArrow(
  context: CanvasRenderingContext2D,
  geometry: OwnedLinkGeometry,
  color: string,
  globalScale: number,
): void {
  const point = pointOnOwnedLink(geometry, 0.72);
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

export function drawOwnedGraphOverlay(options: OwnedGraphDrawingOptions): void {
  const { context, globalScale } = options;
  for (const link of options.links) {
    const geometry = ownedLinkGeometry(link);
    if (!geometry) continue;
    context.save();
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

export function drawOwnedGraph(options: OwnedGraphDrawingOptions): void {
  const { context, globalScale } = options;
  for (const link of options.links) {
    const geometry = ownedLinkGeometry(link);
    if (!geometry) continue;
    context.save();
    traceOwnedLink(context, geometry);
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
