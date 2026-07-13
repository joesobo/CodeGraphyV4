import type { DirectionMode } from '../../../../../../shared/settings/modes';
import type { FGLink, FGNode } from '../../../model/build';
import {
  ownedLinkGeometry,
  pointOnOwnedLink,
  type OwnedLinkGeometry,
} from './linkGeometry';

const OVERLAY_CULL_MARGIN_PX = 128;

export interface OwnedGraphDrawingOptions {
  context: CanvasRenderingContext2D;
  directionMode: DirectionMode;
  getLinkParticles(this: void, link: FGLink): number;
  getNodeIndex?(this: void, nodeId: string): number | undefined;
  getParticleColor(this: void, link: FGLink): string;
  globalScale: number;
  links: readonly FGLink[];
  nodes: readonly FGNode[];
  nodeLabelCanvasObject(this: void, node: FGNode, context: CanvasRenderingContext2D, globalScale: number): void;
  particleSize: number;
  particleSpeed: number;
  renderX?: Float32Array;
  renderY?: Float32Array;
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

function applyRenderedNodePosition(
  options: OwnedGraphDrawingOptions,
  node: FGNode | undefined,
): void {
  if (!node) return;
  const index = options.getNodeIndex?.(node.id);
  if (index === undefined) return;
  node.x = options.renderX?.[index] ?? node.x;
  node.y = options.renderY?.[index] ?? node.y;
}

function restoreNodePosition(
  node: FGNode | undefined,
  x: number | undefined,
  y: number | undefined,
): void {
  if (!node) return;
  node.x = x;
  node.y = y;
}

function drawOwnedGraphLinkParticles(
  options: OwnedGraphDrawingOptions,
  link: FGLink,
): void {
  const source = typeof link.source === 'string' ? undefined : link.source;
  const target = typeof link.target === 'string' ? undefined : link.target;
  const sourceX = source?.x;
  const sourceY = source?.y;
  const targetX = target?.x;
  const targetY = target?.y;
  applyRenderedNodePosition(options, source);
  applyRenderedNodePosition(options, target);
  try {
    const geometry = ownedLinkGeometry(link);
    if (!geometry) return;
    drawParticles(
      options.context,
      geometry,
      Math.max(1, options.getLinkParticles(link)),
      options.getParticleColor(link),
      options.particleSize,
      options.particleSpeed,
      options.timestamp,
      options.globalScale,
    );
  } finally {
    restoreNodePosition(source, sourceX, sourceY);
    restoreNodePosition(target, targetX, targetY);
  }
}

export function drawOwnedGraphParticles(options: OwnedGraphDrawingOptions): void {
  if (options.directionMode !== 'particles') return;
  for (const link of options.links) drawOwnedGraphLinkParticles(options, link);
}

export function drawOwnedGraphOverlay(options: OwnedGraphDrawingOptions): void {
  drawOwnedGraphParticles(options);
  const { context, globalScale, viewport } = options;
  const margin = OVERLAY_CULL_MARGIN_PX / Math.max(globalScale, 0.01);
  for (let index = 0; index < options.nodes.length; index += 1) {
    const node = options.nodes[index];
    const renderX = options.renderX?.[index] ?? node.x;
    const renderY = options.renderY?.[index] ?? node.y;
    if (!Number.isFinite(renderX)
      || !Number.isFinite(renderY)
      || (renderX as number) < viewport.minimumX - margin
      || (renderX as number) > viewport.maximumX + margin
      || (renderY as number) < viewport.minimumY - margin
      || (renderY as number) > viewport.maximumY + margin) continue;
    const authoritativeX = node.x;
    const authoritativeY = node.y;
    node.x = renderX;
    node.y = renderY;
    try {
      options.nodeLabelCanvasObject(node, context, globalScale);
    } finally {
      node.x = authoritativeX;
      node.y = authoritativeY;
    }
  }
}

