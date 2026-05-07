import { renderNodeBody } from '../node/body';
import { renderCollapsedSectionBadge } from '../node/collapsedSectionBadge';
import { renderNodeLabel } from '../node/label';
import { renderNodeImageOverlay, renderNodePluginOverlay } from '../node/media';
import { renderNodePinBadge } from '../node/pinBadge';
import { paintNodePointerArea } from '../node/pointer';
import type { NodeCanvasRendererDependencies } from '../node/canvasShared';
import { type FGNode } from '../../model/build';
import { DEFAULT_GRAPH_APPEARANCE } from '../../appearance/model';

export function renderNodeCanvas(
  dependencies: NodeCanvasRendererDependencies,
  node: FGNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
): void {
  if (node.isGraphSection && !node.isCollapsedGraphSection) {
    return;
  }

  const highlighted = dependencies.highlightedNodeRef.current;
  const isHighlighted = !highlighted
    || node.id === highlighted
    || dependencies.highlightedNeighborsRef.current.has(node.id);
  const isSelected = dependencies.selectedNodesSetRef.current.has(node.id);
  const decoration = dependencies.nodeDecorationsRef.current?.[node.id];
  const baseOpacity = decoration?.opacity ?? (node.baseOpacity ?? 1.0);
  const opacity = isHighlighted ? baseOpacity : 0.15;
  const appearance = dependencies.graphAppearanceRef?.current ?? DEFAULT_GRAPH_APPEARANCE;

  ctx.save();
  ctx.globalAlpha = opacity;
  renderNodeBody({
    appearance,
    ctx,
    decoration,
    globalScale,
    isSelected,
    node,
    opacity,
  });
  renderNodeImageOverlay(ctx, node, dependencies.triggerImageRerender);
  renderNodePinBadge({
    appearance,
    ctx,
    globalScale,
    node,
  });
  renderCollapsedSectionBadge({
    appearance,
    ctx,
    globalScale,
    node,
  });
  if (dependencies.showLabelsRef.current) {
    renderNodeLabel({
      appearance,
      ctx,
      decoration,
      globalScale,
      isHighlighted,
      node,
      opacity,
    });
  }
  renderNodePluginOverlay(dependencies.pluginHost, node, ctx, globalScale, decoration);

  ctx.restore();
}
export { paintNodePointerArea };
export type { NodeCanvasRendererDependencies };
