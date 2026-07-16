import { DEFAULT_NODE_COLOR } from '../../../../../shared/fileColors';
import type { FGNode } from '../../model/build';
import type { NodeCanvasRendererDependencies } from '../node/canvasShared';
import type { OwnedGraphNodeStyle } from '../surface/owned2d/view/surface/contracts';
import { normalizedNodeFillOpacity } from './canvasOpacity';

function nodeColor(dependencies: NodeCanvasRendererDependencies, node: FGNode): string {
  return dependencies.resolveColor(node.color, DEFAULT_NODE_COLOR);
}

function borderColor(dependencies: NodeCanvasRendererDependencies, node: FGNode, selected: boolean): string {
  const appearance = dependencies.graphAppearanceRef.current;
  const fallback = nodeColor(dependencies, node);
  if (selected) return dependencies.resolveColor(appearance.nodeSelectionBorder, fallback);
  if (node.nodeType === 'folder' && node.color === appearance.transparent) {
    return dependencies.resolveColor(appearance.transparent, 'transparent');
  }
  return dependencies.resolveColor(node.borderColor, fallback);
}

function isHighlighted(dependencies: NodeCanvasRendererDependencies, nodeId: string): boolean {
  const highlighted = dependencies.highlightedNodeRef.current;
  if (!highlighted) return true;
  return nodeId === highlighted || dependencies.highlightedNeighborsRef.current.has(nodeId);
}

function fillColor(dependencies: NodeCanvasRendererDependencies, node: FGNode): string {
  const fallback = nodeColor(dependencies, node);
  if (node.nodeType === 'folder') return fallback;
  return dependencies.resolveColor(
    dependencies.nodeDecorationsRef.current?.[node.id]?.color,
    fallback,
  );
}

function canvasOpacity(dependencies: NodeCanvasRendererDependencies, node: FGNode): number {
  if (!isHighlighted(dependencies, node.id)) return 0.15;
  return dependencies.nodeDecorationsRef.current?.[node.id]?.opacity ?? node.baseOpacity;
}

export function getNodeCanvasStyle(dependencies: NodeCanvasRendererDependencies, node: FGNode): OwnedGraphNodeStyle {
  const selected = dependencies.selectedNodesSetRef.current.has(node.id);
  return {
    borderColor: borderColor(dependencies, node, selected),
    borderWidth: selected ? Math.max(node.borderWidth, 3) : node.borderWidth,
    cornerRadius: Math.max(0, node.cornerRadius2D ?? 0),
    fillColor: fillColor(dependencies, node),
    fillOpacity: normalizedNodeFillOpacity(node.fillOpacity2D),
    height: node.shapeSize2D?.height ?? node.size * 2,
    opacity: canvasOpacity(dependencies, node),
    shape: node.shape2D ?? 'circle',
    width: node.shapeSize2D?.width ?? node.size * 2,
  };
}
