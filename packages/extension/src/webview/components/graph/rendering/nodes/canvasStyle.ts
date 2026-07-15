import type { FGNode } from '../../model/build';
import type { NodeCanvasRendererDependencies } from '../node/canvasShared';
import type { OwnedGraphNodeStyle } from '../surface/owned2d/contracts';
import { normalizedNodeFillOpacity } from './canvasOpacity';

function borderColor(dependencies: NodeCanvasRendererDependencies, node: FGNode, selected: boolean): string {
  const appearance = dependencies.graphAppearanceRef.current;
  if (selected) return appearance.nodeSelectionBorder;
  return node.nodeType === 'folder' && node.color === appearance.transparent ? appearance.transparent : node.borderColor;
}

function isHighlighted(dependencies: NodeCanvasRendererDependencies, nodeId: string): boolean {
  const highlighted = dependencies.highlightedNodeRef.current;
  if (!highlighted) return true;
  return nodeId === highlighted || dependencies.highlightedNeighborsRef.current.has(nodeId);
}

function fillColor(dependencies: NodeCanvasRendererDependencies, node: FGNode): string {
  if (node.nodeType === 'folder') return node.color;
  return dependencies.nodeDecorationsRef.current?.[node.id]?.color ?? node.color;
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
