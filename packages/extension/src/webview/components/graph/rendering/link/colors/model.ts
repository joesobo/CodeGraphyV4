import { DEFAULT_DIRECTION_COLOR } from '../../../../../../shared/fileColors';
import {
  resolveDirectionColor,
  type FGLink,
} from '../../../model/build';
import { DEFAULT_GRAPH_APPEARANCE } from '../../../appearance/model';
import { resolveLinkEndpointId } from '../../../support/linkTargets';
import type { LinkRenderingDependencies } from '../contracts';

export function getGraphLinkColor(
  dependencies: LinkRenderingDependencies,
  link: FGLink,
): string {
  const decoration = dependencies.edgeDecorationsRef.current?.[link.id];
  if (decoration?.color) return decoration.color;
  const sourceId = resolveLinkEndpointId(link.source);
  const targetId = resolveLinkEndpointId(link.target);
  const highlighted = dependencies.highlightedNodeRef.current;
  if (!highlighted) return link.baseColor ?? DEFAULT_DIRECTION_COLOR;
  const isConnected = sourceId === highlighted || targetId === highlighted;
  const appearance = dependencies.graphAppearanceRef?.current ?? DEFAULT_GRAPH_APPEARANCE;
  if (isConnected) return appearance.linkHighlight;
  return appearance.linkMuted;
}

export function getGraphDirectionalColor(
  dependencies: LinkRenderingDependencies,
): string {
  return resolveDirectionColor(dependencies.directionColorRef.current);
}
