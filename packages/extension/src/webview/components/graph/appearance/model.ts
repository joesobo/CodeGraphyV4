export interface GraphAppearance {
  focusBorder: string;
  labelForeground: string;
  labelMutedForeground: string;
  linkHighlight: string;
  linkMuted: string;
  meshDimmed: string;
  meshSelected: string;
  nodeSelectionBorder: string;
  stageBackground: string;
  stageBorder: string;
  transparent: string;
}

export const DEFAULT_GRAPH_APPEARANCE: GraphAppearance = {
  focusBorder: 'Highlight',
  labelForeground: 'CanvasText',
  labelMutedForeground: 'GrayText',
  linkHighlight: 'Highlight',
  linkMuted: 'GrayText',
  meshDimmed: 'GrayText',
  meshSelected: 'CanvasText',
  nodeSelectionBorder: 'Highlight',
  stageBackground: 'Canvas',
  stageBorder: 'GrayText',
  transparent: 'transparent',
};

const GRAPH_APPEARANCE_TOKENS = {
  focusBorder: '--cg-focus-border',
  labelForeground: '--cg-graph-label-foreground',
  labelMutedForeground: '--cg-graph-label-muted-foreground',
  linkHighlight: '--cg-graph-link-highlight',
  linkMuted: '--cg-graph-link-muted',
  meshDimmed: '--cg-graph-mesh-dimmed',
  meshSelected: '--cg-graph-mesh-selected',
  nodeSelectionBorder: '--cg-graph-node-selection-border',
  stageBackground: '--cg-graph-background',
  stageBorder: '--cg-graph-border',
  transparent: '--cg-transparent',
} satisfies Record<keyof GraphAppearance, string>;

function getThemeRoot(): Element | null {
  if (typeof document === 'undefined') return null;
  return document.documentElement;
}

function resolveComputedColor(tokenName: string): string {
  if (!document.body) return '';

  const probe = document.createElement('span');
  probe.style.color = `var(${tokenName})`;
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';

  document.body.appendChild(probe);
  const color = getComputedStyle(probe).color.trim();
  probe.remove();
  return color;
}

export function resolveCssToken(tokenName: string, fallback: string): string {
  const themeRoot = getThemeRoot();
  if (!themeRoot) return fallback;

  const value = getComputedStyle(themeRoot).getPropertyValue(tokenName).trim();
  if (!value) return fallback;

  return resolveComputedColor(tokenName) || value || fallback;
}

function readCssTokenValue(tokenName: string, fallback: string): string {
  const themeRoot = getThemeRoot();
  if (!themeRoot) return fallback;

  return getComputedStyle(themeRoot).getPropertyValue(tokenName).trim() || fallback;
}

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
    meshDimmed: resolveCssToken(GRAPH_APPEARANCE_TOKENS.meshDimmed, DEFAULT_GRAPH_APPEARANCE.meshDimmed),
    meshSelected: resolveCssToken(GRAPH_APPEARANCE_TOKENS.meshSelected, DEFAULT_GRAPH_APPEARANCE.meshSelected),
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
