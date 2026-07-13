import type { FGLink } from '../../model/build';
import { resolveLinkEndpointId } from '../../support/linkTargets';
import type { LinkRenderingDependencies } from './contracts';

const ORDINARY_LINK_OPACITY = 0.3;
const CONNECTED_LINK_OPACITY = 0.9;
const MUTED_LINK_OPACITY = 0.12;

function linkConnectsNode(link: FGLink, nodeId: string): boolean {
  return resolveLinkEndpointId(link.source) === nodeId
    || resolveLinkEndpointId(link.target) === nodeId;
}

export function getGraphLinkOpacity(
  dependencies: LinkRenderingDependencies,
  link: FGLink,
): number {
  const decoration = dependencies.edgeDecorationsRef.current?.[link.id];
  if (decoration?.opacity !== undefined) return decoration.opacity;
  const highlighted = dependencies.highlightedNodeRef.current;
  if (!highlighted) return ORDINARY_LINK_OPACITY;
  return linkConnectsNode(link, highlighted)
    ? CONNECTED_LINK_OPACITY
    : MUTED_LINK_OPACITY;
}

export function getGraphLinkParticles(
  dependencies: LinkRenderingDependencies,
  link: FGLink,
): number {
  const decoration = dependencies.edgeDecorationsRef.current?.[link.id];
  return decoration?.particles?.count ?? 3;
}

export function getGraphLinkWidth(
  dependencies: LinkRenderingDependencies,
  link: FGLink,
): number {
  const decoration = dependencies.edgeDecorationsRef.current?.[link.id];
  if (decoration?.width !== undefined) return decoration.width;
  const highlighted = dependencies.highlightedNodeRef.current;
  if (!highlighted) return 1;
  return linkConnectsNode(link, highlighted) ? 2 : 1;
}
