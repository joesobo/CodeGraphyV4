import {
  renderNodeCollapseIndicator,
  shouldRenderNodeCollapseIndicator,
} from '../node/collapseIndicator';
import { renderNodeLabel } from '../node/label';
import { renderNodeImageOverlay, renderNodePluginOverlay } from '../node/media';
import type { NodeLabelSpriteProvider } from '../node/labelSprite';
import type { NodeCanvasRendererDependencies } from '../node/canvasShared';
import { type FGNode } from '../../model/build';
import { DEFAULT_GRAPH_APPEARANCE } from '../../appearance/model';
import { shouldRenderGraphDetails } from '../detailVisibility';
import type { OwnedGraphNodeStyle } from '../surface/owned2d/contracts';
import { ownedGraphNodeWorldScale } from '../surface/owned2d/visualSize';

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
    cornerRadius: Math.max(0, node.cornerRadius2D ?? 0),
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
  const baseOpacity = decoration?.opacity ?? (node.baseOpacity ?? 1);
  const opacity = getNodeCanvasOpacity(baseOpacity, isHighlighted);
  const appearance = dependencies.graphAppearanceRef?.current ?? DEFAULT_GRAPH_APPEARANCE;
  const visualScale = ownedGraphNodeWorldScale(globalScale);
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
