import { renderNodeBody } from '../node/body';
import { renderCollapsedSectionBadge } from '../node/collapsedSectionBadge';
import { renderNodeLabel } from '../node/label';
import { renderNodeImageOverlay, renderNodePluginOverlay } from '../node/media';
import { renderNodePinBadge } from '../node/pinBadge';
import { paintNodePointerArea } from '../node/pointer';
import type { NodeCanvasRendererDependencies } from '../node/canvasShared';
import { type FGNode } from '../../model/build';
import { DEFAULT_GRAPH_APPEARANCE, type GraphAppearance } from '../../appearance/model';

function shouldRenderNodeCanvas(node: FGNode): boolean {
  return !node.isGraphSection || !!node.isCollapsedGraphSection || isExpandedGraphSectionNode(node);
}

function isExpandedGraphSectionNode(node: FGNode): boolean {
  return !!node.isGraphSection && !node.isCollapsedGraphSection;
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getExpandedSectionFrameSize(node: FGNode): { height: number; width: number } {
  const fallbackSize = Math.max(80, (node.size ?? 20) * 4);
  return {
    height: readFiniteNumber(node.sectionHeight) ?? fallbackSize,
    width: readFiniteNumber(node.sectionWidth) ?? fallbackSize,
  };
}

function renderExpandedSectionFrame({
  appearance,
  ctx,
  globalScale,
  isSelected,
  node,
}: {
  appearance: GraphAppearance;
  ctx: CanvasRenderingContext2D;
  globalScale: number;
  isSelected: boolean;
  node: FGNode;
}): void {
  const x = readFiniteNumber(node.x) ?? 0;
  const y = readFiniteNumber(node.y) ?? 0;
  const { height, width } = getExpandedSectionFrameSize(node);
  const headerHeight = 28 / globalScale;

  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.fillStyle = `${node.color}22`;
  ctx.fill();
  ctx.strokeStyle = isSelected ? appearance.nodeSelectionBorder : node.borderColor;
  ctx.lineWidth = (isSelected ? Math.max(node.borderWidth, 3) : node.borderWidth) / globalScale;
  ctx.stroke();

  ctx.beginPath();
  ctx.rect(x, y, width, headerHeight);
  ctx.fillStyle = `${node.color}33`;
  ctx.fill();

  ctx.fillStyle = appearance.labelForeground;
  ctx.font = `${12 / globalScale}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(node.label, x + (8 / globalScale), y + (headerHeight / 2));
}

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

function renderNodeCanvasLabel(
  dependencies: NodeCanvasRendererDependencies,
  options: Parameters<typeof renderNodeLabel>[0],
): void {
  if (dependencies.showLabelsRef.current) {
    renderNodeLabel(options);
  }
}

export function renderNodeCanvas(
  dependencies: NodeCanvasRendererDependencies,
  node: FGNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
): void {
  if (!shouldRenderNodeCanvas(node)) {
    return;
  }

  const isHighlighted = isNodeHighlighted(dependencies, node.id);
  const isSelected = dependencies.selectedNodesSetRef.current.has(node.id);
  const decoration = dependencies.nodeDecorationsRef.current?.[node.id];
  const baseOpacity = decoration?.opacity ?? (node.baseOpacity ?? 1.0);
  const opacity = getNodeCanvasOpacity(baseOpacity, isHighlighted);
  const appearance = dependencies.graphAppearanceRef?.current ?? DEFAULT_GRAPH_APPEARANCE;

  ctx.save();
  if (isExpandedGraphSectionNode(node)) {
    renderExpandedSectionFrame({
      appearance,
      ctx,
      globalScale,
      isSelected,
      node,
    });
    renderNodePinBadge({
      appearance,
      ctx,
      globalScale,
      node,
    });
    ctx.restore();
    return;
  }

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
  renderNodeCanvasLabel(dependencies, {
    appearance,
    ctx,
    decoration,
    globalScale,
    isHighlighted,
    node,
    opacity,
  });
  renderNodePluginOverlay(dependencies.pluginHost, node, ctx, globalScale, decoration);

  ctx.restore();
}
export { paintNodePointerArea };
export type { NodeCanvasRendererDependencies };
