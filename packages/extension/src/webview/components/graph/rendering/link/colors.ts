import { DEFAULT_DIRECTION_COLOR } from '../../../../../shared/fileColors';
import {
  resolveDirectionColor,
  type FGLink,
} from '../../model/build';
import { resolveLinkEndpointId } from '../../support/linkTargets';
import type { LinkRenderingDependencies } from './contracts';

export function getGraphLinkColor(
  dependencies: LinkRenderingDependencies,
  link: FGLink,
): string {
  const decoration = dependencies.edgeDecorationsRef.current?.[link.id];
  if (decoration?.color) return decoration.color;
  const sourceId = resolveLinkEndpointId(link.source);
  const targetId = resolveLinkEndpointId(link.target);
  const highlighted = dependencies.highlightedNodeRef.current;
  const isLight = dependencies.themeRef.current === 'light';
  if (!highlighted) return link.baseColor ?? DEFAULT_DIRECTION_COLOR;
  const isConnected = sourceId === highlighted || targetId === highlighted;
  if (isConnected) return '#60a5fa';
  return isLight ? '#e2e8f0' : '#2d3748';
}

export function getGraphDirectionalColor(
  dependencies: LinkRenderingDependencies,
): string {
  return resolveDirectionColor(dependencies.directionColorRef.current);
}
