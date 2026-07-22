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
    'edgeDecorationsRef' | 'graphAppearanceRef' | 'highlightedNodeRef' | 'resolveColor'
  >,
  link: FGLink,
): string {
  const sourceId = resolveLinkEndpointId(link.source);
  const targetId = resolveLinkEndpointId(link.target);
  const highlighted = dependencies.highlightedNodeRef.current;
  const appearance = dependencies.graphAppearanceRef.current;
  const baseColor = !highlighted
    ? link.baseColor ?? DEFAULT_DIRECTION_COLOR
    : sourceId === highlighted || targetId === highlighted
      ? appearance.linkHighlight
      : appearance.linkMuted;
  const resolvedBaseColor = dependencies.resolveColor(baseColor, DEFAULT_DIRECTION_COLOR);
  return dependencies.resolveColor(
    dependencies.edgeDecorationsRef.current?.[link.id]?.color,
    resolvedBaseColor,
  );
}

export function getGraphDirectionalColor(
  dependencies: Pick<LinkRenderingDependencies, 'graphAppearanceRef' | 'resolveColor'>,
): string {
  return dependencies.resolveColor(
    resolveDirectionColor(dependencies.graphAppearanceRef.current.linkHighlight),
    DEFAULT_DIRECTION_COLOR,
  );
}

export function getBaseGraphLinkColor(
  dependencies: Pick<LinkRenderingDependencies, 'resolveColor'>,
  link: FGLink,
): string {
  return dependencies.resolveColor(link.baseColor, DEFAULT_DIRECTION_COLOR);
}
