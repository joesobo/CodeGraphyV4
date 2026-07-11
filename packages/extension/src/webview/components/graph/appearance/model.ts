import type { GraphAppearance } from './contracts';
import { readCssTokenValue, resolveCssToken } from './cssToken';
import { DEFAULT_GRAPH_APPEARANCE } from './defaults';
import { GRAPH_APPEARANCE_TOKENS } from './tokens';

export type { GraphAppearance } from './contracts';
export { readCssTokenValue, resolveCssToken } from './cssToken';
export { DEFAULT_GRAPH_APPEARANCE } from './defaults';

export function resolveGraphAppearance(): GraphAppearance {
  return {
    focusBorder: resolveCssToken(GRAPH_APPEARANCE_TOKENS.focusBorder, DEFAULT_GRAPH_APPEARANCE.focusBorder),
    labelForeground: resolveCssToken(GRAPH_APPEARANCE_TOKENS.labelForeground, DEFAULT_GRAPH_APPEARANCE.labelForeground),
    labelMutedForeground: resolveCssToken(
      GRAPH_APPEARANCE_TOKENS.labelMutedForeground,
      DEFAULT_GRAPH_APPEARANCE.labelMutedForeground,
    ),
    linkHighlight: resolveCssToken(GRAPH_APPEARANCE_TOKENS.linkHighlight, DEFAULT_GRAPH_APPEARANCE.linkHighlight),
    linkMuted: resolveCssToken(GRAPH_APPEARANCE_TOKENS.linkMuted, DEFAULT_GRAPH_APPEARANCE.linkMuted),
    nodeSelectionBorder: resolveCssToken(
      GRAPH_APPEARANCE_TOKENS.nodeSelectionBorder,
      DEFAULT_GRAPH_APPEARANCE.nodeSelectionBorder,
    ),
    stageBackground: readCssTokenValue(
      GRAPH_APPEARANCE_TOKENS.stageBackground,
      DEFAULT_GRAPH_APPEARANCE.stageBackground,
    ),
    stageBorder: resolveCssToken(GRAPH_APPEARANCE_TOKENS.stageBorder, DEFAULT_GRAPH_APPEARANCE.stageBorder),
    transparent: resolveCssToken(GRAPH_APPEARANCE_TOKENS.transparent, DEFAULT_GRAPH_APPEARANCE.transparent),
  };
}
