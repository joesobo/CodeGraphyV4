import { renderNodeBody, renderNodeLabel } from './nodeBody';
import { renderNodeImageOverlay, renderNodePluginOverlay } from './nodeMedia';
import { paintNodePointerArea } from './nodePointer';
import type { NodeCanvasRendererDependencies } from './nodeCanvasShared';
import { type FGNode } from '../../graphModel';

export function renderNodeCanvas(
  dependencies: NodeCanvasRendererDependencies,
  node: FGNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
): void {
  const highlighted = dependencies.highlightedNodeRef.current;
  const isHighlighted = !highlighted
    || node.id === highlighted
    || dependencies.highlightedNeighborsRef.current.has(node.id);
  const isSelected = dependencies.selectedNodesSetRef.current.has(node.id);
  const decoration = dependencies.nodeDecorationsRef.current?.[node.id];
  const baseOpacity = decoration?.opacity ?? (node.baseOpacity ?? 1.0);
  const opacity = isHighlighted ? baseOpacity : 0.15;

  ctx.save();
  ctx.globalAlpha = opacity;
  renderNodeBody({
    ctx,
    decoration,
    globalScale,
    isSelected,
    node,
    opacity,
    theme: dependencies.themeRef.current,
  });
  renderNodeImageOverlay(ctx, node, dependencies.triggerImageRerender);
  if (dependencies.showLabelsRef.current) {
    renderNodeLabel({
      ctx,
      decoration,
      globalScale,
      isHighlighted,
      node,
      opacity,
      theme: dependencies.themeRef.current,
    });
  }
  renderNodePluginOverlay(dependencies.pluginHost, node, ctx, globalScale, decoration);

  ctx.restore();
}
export { paintNodePointerArea };
export type { NodeCanvasRendererDependencies };
