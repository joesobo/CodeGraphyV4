import type { DirectionMode } from '../../../../../../shared/settings/modes';
import type { FGLink, FGNode } from '../../../model/build';
import { drawOwnedGraphParticles } from './drawingParticles';

const OVERLAY_CULL_MARGIN_PX = 128;

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

export { drawOwnedGraphParticles } from './drawingParticles';

export function drawOwnedGraphOverlay(options: OwnedGraphDrawingOptions): void {
  drawOwnedGraphParticles(options);
  const { context, globalScale, viewport } = options;
  const margin = OVERLAY_CULL_MARGIN_PX / Math.max(globalScale, 0.01);
  for (const node of options.nodes) {
    if (!Number.isFinite(node.x)
      || !Number.isFinite(node.y)
      || (node.x as number) < viewport.minimumX - margin
      || (node.x as number) > viewport.maximumX + margin
      || (node.y as number) < viewport.minimumY - margin
      || (node.y as number) > viewport.maximumY + margin) continue;
    options.nodeLabelCanvasObject(node, context, globalScale);
  }
}
