import {
  renderNodeCollapseIndicator,
  shouldRenderNodeCollapseIndicator,
} from '../node/collapseIndicator';
import { renderNodeLabel } from '../node/label';
import { renderNodeImageOverlay, renderNodePluginOverlay } from '../node/media';
import type { NodeLabelSpriteProvider } from '../node/labelSprite';
import type { NodeCanvasRendererDependencies } from '../node/canvasShared';
import { type FGNode } from '../../model/build';
import {
  graphNodeWorldScale,
  shouldRenderGraphDetails,
} from '@codegraphy-dev/graph-renderer';

function isNodeHighlighted(
  dependencies: Pick<NodeCanvasRendererDependencies, 'highlightedNeighborsRef' | 'highlightedNodeRef'>,
  nodeId: string,
): boolean {
  const highlighted = dependencies.highlightedNodeRef.current;
  return !highlighted
    || nodeId === highlighted
    || dependencies.highlightedNeighborsRef.current.has(nodeId);
}

function getNodeCanvasOpacity(baseOpacity: number, highlighted: boolean): number {
  return highlighted ? baseOpacity : 0.15;
}

export { getNodeCanvasStyle } from './canvasStyle';

function applyNodeVisualTransform(
  context: CanvasRenderingContext2D,
  node: FGNode,
  visualScale: number,
): void {
  context.translate(node.x!, node.y!);
  context.scale(visualScale, visualScale);
  context.translate(-node.x!, -node.y!);
}

export function renderNodeCanvasLabel(
  dependencies: NodeCanvasRendererDependencies,
  node: FGNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  labelSpriteCache: NodeLabelSpriteProvider,
): void {
  const isHighlighted = isNodeHighlighted(dependencies, node.id);
  const decoration = dependencies.nodeDecorationsRef.current?.[node.id];
  const baseOpacity = decoration?.opacity ?? node.baseOpacity;
  const opacity = getNodeCanvasOpacity(baseOpacity, isHighlighted);
  const appearance = dependencies.graphAppearanceRef.current;
  const visualScale = graphNodeWorldScale(globalScale);
  const effectiveGlobalScale = globalScale * visualScale;
  ctx.save();
  ctx.globalAlpha = opacity;
  if (node.imageUrl || shouldRenderNodeCollapseIndicator(node)) {
    ctx.save();
    applyNodeVisualTransform(ctx, node, visualScale);
    renderNodeImageOverlay(ctx, node, dependencies.triggerImageRerender);
    renderNodeCollapseIndicator(ctx, node, effectiveGlobalScale, appearance);
    ctx.restore();
  }
  if (dependencies.showLabelsRef.current && shouldRenderGraphDetails(globalScale)) {
    renderNodeLabel({
      appearance,
      ctx,
      decoration,
      globalScale,
      isHighlighted,
      node,
      opacity,
      resolveColor: dependencies.resolveColor,
      spriteCache: labelSpriteCache,
      visualScale,
    });
  }
  ctx.globalAlpha = opacity;
  if (dependencies.pluginHost) {
    ctx.save();
    applyNodeVisualTransform(ctx, node, visualScale);
    renderNodePluginOverlay(
      dependencies.pluginHost,
      node,
      ctx,
      effectiveGlobalScale,
      decoration,
    );
    ctx.restore();
  }
  ctx.restore();
}

export type { NodeCanvasRendererDependencies };
