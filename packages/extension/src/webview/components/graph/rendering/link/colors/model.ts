import { DEFAULT_DIRECTION_COLOR } from '../../../../../../shared/fileColors';
import {
  resolveDirectionColor,
  type FGLink,
} from '../../../model/build';
import { resolveLinkEndpointId } from '../../../support/linkTargets';
import type { LinkRenderingDependencies } from '../contracts';

export function getGraphLinkColor(
  dependencies: Pick<
    LinkRenderingDependencies,
    'edgeDecorationsRef' | 'graphAppearanceRef' | 'highlightedNodeRef'
  >,
  link: FGLink,
): string {
  const decoration = dependencies.edgeDecorationsRef.current?.[link.id];
  if (decoration?.color) return decoration.color;
  const sourceId = resolveLinkEndpointId(link.source);
  const targetId = resolveLinkEndpointId(link.target);
  const highlighted = dependencies.highlightedNodeRef.current;
  if (!highlighted) return link.baseColor ?? DEFAULT_DIRECTION_COLOR;
  const isConnected = sourceId === highlighted || targetId === highlighted;
  const appearance = dependencies.graphAppearanceRef.current;
  if (isConnected) return appearance.linkHighlight;
  return appearance.linkMuted;
}

export function getGraphDirectionalColor(
  dependencies: Pick<LinkRenderingDependencies, 'graphAppearanceRef'>,
): string {
  return resolveDirectionColor(dependencies.graphAppearanceRef.current.linkHighlight);
}
