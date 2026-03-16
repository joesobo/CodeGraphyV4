import type { DirectionMode } from '../../../../shared/types';
import type { FGLink, FGNode } from '../../graphModel';
import type { LinkRenderingDependencies } from './linkShared';

export function getGraphLinkParticles(
  dependencies: LinkRenderingDependencies,
  link: FGLink,
): number {
  const decoration = dependencies.edgeDecorationsRef.current?.[link.id];
  return decoration?.particles?.count ?? 3;
}

export function getGraphArrowRelPos(): number {
  return 1;
}

export function getGraphLinkWidth(
  dependencies: LinkRenderingDependencies,
  link: FGLink,
): number {
  const decoration = dependencies.edgeDecorationsRef.current?.[link.id];
  if (decoration?.width !== undefined) return decoration.width;
  const sourceId = typeof link.source === 'string' ? link.source : (link.source as FGNode)?.id;
  const targetId = typeof link.target === 'string' ? link.target : (link.target as FGNode)?.id;
  const highlighted = dependencies.highlightedNodeRef.current;
  if (!highlighted) return link.bidirectional ? 2 : 1;
  return (sourceId === highlighted || targetId === highlighted) ? 2 : 1;
}

export function getLinkCanvasObjectMode(
  directionMode: DirectionMode,
  link: FGLink,
): 'replace' | 'after' {
  return link.bidirectional && directionMode === 'arrows' ? 'replace' : 'after';
}
