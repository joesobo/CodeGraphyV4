import {
  DEFAULT_DIRECTION_COLOR,
} from '../../../../shared/types';
import {
  resolveDirectionColor,
  type FGLink,
  type FGNode,
} from '../../graphModel';
import type { LinkRenderingDependencies } from './linkShared';

export function getGraphLinkColor(
  dependencies: LinkRenderingDependencies,
  link: FGLink,
): string {
  const decoration = dependencies.edgeDecorationsRef.current?.[link.id];
  if (decoration?.color) return decoration.color;
  const source = link.source as FGNode;
  const target = link.target as FGNode;
  const sourceId = typeof link.source === 'string' ? link.source : source?.id;
  const targetId = typeof link.target === 'string' ? link.target : target?.id;
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
