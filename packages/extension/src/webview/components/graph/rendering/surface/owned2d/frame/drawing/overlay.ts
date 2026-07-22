import type { FGNode } from '../../../../../model/build';
import {
  drawOwnedGraphParticles,
  type OwnedGraphParticleDrawingOptions,
} from './particles';

const OVERLAY_CULL_MARGIN_PX = 128;

export interface OwnedGraphDrawingOptions extends OwnedGraphParticleDrawingOptions {
  hoveredNodeIndex: number;
  hoveredNodeScale: number;
  nodes: readonly FGNode[];
  nodeIndexByRenderedIndex: Uint32Array;
  nodeLabelCanvasObject(this: void, node: FGNode, context: CanvasRenderingContext2D, globalScale: number): void;
  viewport: { maximumX: number; maximumY: number; minimumX: number; minimumY: number };
}

export { drawOwnedGraphParticles } from './particles';

function isNodeVisible(
  node: FGNode,
  viewport: OwnedGraphDrawingOptions['viewport'],
  margin: number,
): boolean {
  return Number.isFinite(node.x)
    && Number.isFinite(node.y)
    && (node.x as number) >= viewport.minimumX - margin
    && (node.x as number) <= viewport.maximumX + margin
    && (node.y as number) >= viewport.minimumY - margin
    && (node.y as number) <= viewport.maximumY + margin;
}

function reportDecorationError(scope: string, error: unknown): void {
  console.error(`[CodeGraphy] Graph ${scope} decoration failed:`, error);
}

function drawNodeOverlay(options: OwnedGraphDrawingOptions, node: FGNode): void {
  options.context.save();
  try {
    options.nodeLabelCanvasObject(node, options.context, options.globalScale);
  } catch (error) {
    reportDecorationError(`node ${node.id}`, error);
  } finally {
    options.context.restore();
  }
}

function drawHoveredNodeOverlay(options: OwnedGraphDrawingOptions, node: FGNode): void {
  const { context } = options;
  context.save();
  try {
    context.translate(node.x as number, node.y as number);
    context.scale(options.hoveredNodeScale, options.hoveredNodeScale);
    context.translate(-(node.x as number), -(node.y as number));
    drawNodeOverlay(options, node);
  } finally {
    context.restore();
  }
}

function drawParticleOverlays(options: OwnedGraphDrawingOptions): void {
  options.context.save();
  try {
    drawOwnedGraphParticles(options);
  } catch (error) {
    reportDecorationError('particle', error);
  } finally {
    options.context.restore();
  }
}

function drawOrderedNodeOverlays(options: OwnedGraphDrawingOptions, margin: number): void {
  for (const nodeIndex of options.nodeIndexByRenderedIndex) {
    if (nodeIndex === options.hoveredNodeIndex) continue;
    const node = options.nodes[nodeIndex];
    if (node && isNodeVisible(node, options.viewport, margin)) drawNodeOverlay(options, node);
  }
}

function drawHoveredOverlay(options: OwnedGraphDrawingOptions, margin: number): void {
  const hoveredNode = options.nodes[options.hoveredNodeIndex];
  if (!hoveredNode || !isNodeVisible(hoveredNode, options.viewport, margin)) return;
  drawHoveredNodeOverlay(options, hoveredNode);
}

export function drawOwnedGraphOverlay(options: OwnedGraphDrawingOptions): void {
  drawParticleOverlays(options);
  const margin = OVERLAY_CULL_MARGIN_PX / Math.max(options.globalScale, 0.01);
  drawOrderedNodeOverlays(options, margin);
  drawHoveredOverlay(options, margin);
}
