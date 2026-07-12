import { renderNodeBody } from '../node/body';
import { renderNodeCollapseIndicator } from '../node/collapseIndicator';
import { renderNodeLabel } from '../node/label';
import { renderNodeImageOverlay, renderNodePluginOverlay } from '../node/media';
import { paintNodePointerArea } from '../node/pointer';
import type { NodeCanvasRendererDependencies } from '../node/canvasShared';
import { type FGNode } from '../../model/build';
import { DEFAULT_GRAPH_APPEARANCE } from '../../appearance/model';
import type { OwnedGraphNodeStyle } from '../surface/owned2d/contracts';

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

function renderNodeCanvasLabelIfEnabled(
  dependencies: NodeCanvasRendererDependencies,
  options: Parameters<typeof renderNodeLabel>[0],
): void {
  if (dependencies.showLabelsRef.current) {
    renderNodeLabel(options);
  }
}

export function getNodeCanvasStyle(
  dependencies: NodeCanvasRendererDependencies,
  node: FGNode,
): OwnedGraphNodeStyle {
  const isHighlighted = isNodeHighlighted(dependencies, node.id);
  const isSelected = dependencies.selectedNodesSetRef.current.has(node.id);
  const decoration = dependencies.nodeDecorationsRef.current?.[node.id];
  const baseOpacity = decoration?.opacity ?? (node.baseOpacity ?? 1);
  const appearance = dependencies.graphAppearanceRef?.current ?? DEFAULT_GRAPH_APPEARANCE;
  const transparentFolder = node.nodeType === 'folder' && node.color === appearance.transparent;
  return {
    borderColor: isSelected
      ? appearance.nodeSelectionBorder
      : transparentFolder ? appearance.transparent : node.borderColor,
    borderWidth: isSelected ? Math.max(node.borderWidth, 3) : node.borderWidth,
    fillColor: node.nodeType === 'folder' ? node.color : decoration?.color ?? node.color,
    fillOpacity: typeof node.fillOpacity2D === 'number' && Number.isFinite(node.fillOpacity2D)
      ? Math.min(1, Math.max(0, node.fillOpacity2D))
      : 1,
    height: node.shapeSize2D?.height ?? node.size * 2,
    opacity: getNodeCanvasOpacity(baseOpacity, isHighlighted),
    shape: node.shape2D ?? 'circle',
    width: node.shapeSize2D?.width ?? node.size * 2,
  };
}

export function renderNodeCanvasLabel(
  dependencies: NodeCanvasRendererDependencies,
  node: FGNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
): void {
  const isHighlighted = isNodeHighlighted(dependencies, node.id);
  const decoration = dependencies.nodeDecorationsRef.current?.[node.id];
  const baseOpacity = decoration?.opacity ?? (node.baseOpacity ?? 1);
  const opacity = getNodeCanvasOpacity(baseOpacity, isHighlighted);
  const appearance = dependencies.graphAppearanceRef?.current ?? DEFAULT_GRAPH_APPEARANCE;
  ctx.save();
  ctx.globalAlpha = opacity;
  renderNodeImageOverlay(ctx, node, dependencies.triggerImageRerender);
  renderNodeCollapseIndicator(ctx, node, globalScale, appearance);
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
  ctx.globalAlpha = opacity;
  renderNodePluginOverlay(dependencies.pluginHost, node, ctx, globalScale, decoration);
  ctx.restore();
}

export function renderNodeCanvas(
  dependencies: NodeCanvasRendererDependencies,
  node: FGNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
): void {
  const isHighlighted = isNodeHighlighted(dependencies, node.id);
  const isSelected = dependencies.selectedNodesSetRef.current.has(node.id);
  const decoration = dependencies.nodeDecorationsRef.current?.[node.id];
  const baseOpacity = decoration?.opacity ?? (node.baseOpacity ?? 1.0);
  const opacity = getNodeCanvasOpacity(baseOpacity, isHighlighted);
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
  renderNodeCollapseIndicator(ctx, node, globalScale, appearance);
  renderNodeCanvasLabelIfEnabled(dependencies, {
    appearance,
    ctx,
    decoration,
    globalScale,
    isHighlighted,
    node,
    opacity,
  });
  ctx.globalAlpha = opacity;
  renderNodePluginOverlay(dependencies.pluginHost, node, ctx, globalScale, decoration);

  ctx.restore();
}
export { paintNodePointerArea };
export type { NodeCanvasRendererDependencies };
