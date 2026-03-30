import type { DirectionMode } from '../../../../../shared/settings/modes';
import type { FGLink } from '../../model/build';
import { resolveLinkEndpointId } from '../../support/linkTargets';
import type { LinkRenderingDependencies } from './contracts';

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
  const sourceId = resolveLinkEndpointId(link.source);
  const targetId = resolveLinkEndpointId(link.target);
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
